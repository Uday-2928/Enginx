// @vitest-environment node
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer, loadConfigFromFile } from 'vite';
import { afterEach, expect, it, vi } from 'vitest';

let backend;
let gateway;
let frontend;

afterEach(async () => {
  for (const server of [gateway, backend]) {
    if (!server?.listening) continue;
    server.closeAllConnections();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  await frontend?.close();
  vi.unstubAllEnvs();
});

it('forwards API requests from any frontend port without a cross-origin browser request', async () => {
  const requests = [];
  backend = createHttpServer(async (request, response) => {
    let body = '';
    for await (const chunk of request) body += chunk;
    requests.push({ method: request.method, url: request.url, authorization: request.headers.authorization, body });
    // No CORS headers: the browser-facing URL must be the frontend's own origin.
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ source: 'test-api' }));
  });
  await new Promise((resolve) => backend.listen(0, '127.0.0.1', resolve));
  vi.stubEnv('API_PROXY_TARGET', `http://127.0.0.1:${backend.address().port}`);
  const loaded = await loadConfigFromFile(
    { command: 'serve', mode: 'test' },
    fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
  );
  expect(loaded).not.toBeNull();
  frontend = await createServer({
    ...loaded.config,
    configFile: false,
    // Exercise the real proxy without starting unrelated React pre-bundling.
    plugins: [],
    mode: 'test',
    logLevel: 'silent',
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { ...loaded.config.server, middlewareMode: true, hmr: false, watch: null, preTransformRequests: false },
  });
  gateway = createHttpServer(frontend.middlewares);
  await new Promise((resolve) => gateway.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${gateway.address().port}`;

  const body = JSON.stringify({ email: 'proxy-test@example.test', password: 'test-only-password' });
  const loginResponse = await fetch(`${origin}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: origin },
    body,
  });
  expect(loginResponse.status).toBe(200);
  expect(await loginResponse.json()).toEqual({ source: 'test-api' });

  const historyResponse = await fetch(`${origin}/api/submissions/history?limit=5`, {
    headers: { Authorization: 'Bearer proxy-test-token', Origin: origin },
  });
  expect(historyResponse.status).toBe(200);
  expect(await historyResponse.json()).toEqual({ source: 'test-api' });
  expect(requests).toEqual([
    { method: 'POST', url: '/api/auth/login', authorization: undefined, body },
    { method: 'GET', url: '/api/submissions/history?limit=5', authorization: 'Bearer proxy-test-token', body: '' },
  ]);
});
