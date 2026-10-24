import { describe, expect, it } from 'vitest';
import {
  LIGHT_LED_PROJECT,
  addComponent,
  addWire,
  boardPinSupportsMode,
  breadboardEndpoint,
  breadboardNodeForHole,
  createStarterCircuit,
  endpointsShareCircuit,
  executeSupportedFirmware,
  loadVirtualHardwareProject,
  moveComponent,
  reconnectWire,
  removeComponent,
  rotateComponent,
  saveVirtualHardwareProject,
  simulateArduinoLed,
  updateComponentProperties,
  validateCircuit,
} from './virtualHardwareLab';

describe('Virtual Hardware Lab circuit model', () => {
  it('does not treat the starter scene as connected', () => {
    const graph = createStarterCircuit();
    const validation = validateCircuit(graph);

    expect(graph.wires).toHaveLength(0);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.id === 'missing-wire-led-resistor')).toBe(true);
  });

  it('validates the complete LED graph and drives the constrained simulation', () => {
    let graph = createStarterCircuit();
    for (const connection of LIGHT_LED_PROJECT.requiredConnections) {
      graph = addWire(graph, connection.from, connection.to);
    }

    const validation = validateCircuit(graph);
    expect(validation.valid).toBe(true);
    expect(simulateArduinoLed(LIGHT_LED_PROJECT.starterCode, validation)).toMatchObject({ status: 'running', ledOn: true });
    expect(simulateArduinoLed('void setup() {}\nvoid loop() {}', validation).status).toBe('error');
  });

  it('removes a component and its connected wires from the same graph', () => {
    let graph = createStarterCircuit();
    graph = addWire(graph, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' });
    graph = removeComponent(graph, 'led-1');

    expect(graph.components.some((component) => component.id === 'led-1')).toBe(false);
    expect(graph.wires).toHaveLength(0);
  });

  it('models breadboard row connectivity without shorting the center channel', () => {
    const graph = createStarterCircuit();
    expect(breadboardNodeForHole(graph, 'a1')?.group).toBe('row-1-left');
    expect(endpointsShareCircuit(graph, breadboardEndpoint('a1'), breadboardEndpoint('e1'))).toBe(true);
    expect(endpointsShareCircuit(graph, breadboardEndpoint('a1'), breadboardEndpoint('f1'))).toBe(false);
  });

  it('rejects invalid, duplicate and occupied endpoint connections', () => {
    const graph = createStarterCircuit();
    const invalid = addWire(graph, { ownerId: 'missing', pinId: 'x', kind: 'component-pin' }, { ownerId: 'board', pinId: 'D8', kind: 'board-pin' });
    expect(invalid).toBe(graph);
    const first = addWire(graph, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' });
    expect(addWire(first, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' })).toBe(first);
    expect(addWire(first, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'board', pinId: 'D8', kind: 'board-pin' })).toBe(first);
  });

  it('supports wire reconnection and component transforms while retaining topology', () => {
    let graph = createStarterCircuit();
    graph = addWire(graph, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' });
    const wireId = graph.wires[0].id;
    const moved = moveComponent(graph, 'led-1', [-2, 0.8]);
    const rotated = rotateComponent(moved, 'led-1');
    const reconnected = reconnectWire(rotated, wireId, { ownerId: 'led-1', pinId: 'cathode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' });
    expect(reconnected.components.find((component) => component.id === 'led-1')?.position).toEqual([-2, 0.8]);
    expect(reconnected.components.find((component) => component.id === 'led-1')?.rotation).not.toBe(0);
    expect(reconnected.wires[0].from.pinId).toBe('cathode');
  });

  it('keeps component ids unique after removing a component from the middle of a sequence', () => {
    let graph = createStarterCircuit();
    graph = addWire(graph, { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' });
    graph = { ...graph, components: [...graph.components, { id: 'led-2', type: 'led', position: [0, 0], rotation: 0, properties: {} }, { id: 'led-3', type: 'led', position: [1, 0], rotation: 0, properties: {} }] };
    graph = removeComponent(graph, 'led-2');

    const next = addComponent(graph, 'led');
    expect(next.components.map((component) => component.id)).toEqual(['breadboard-1', 'led-1', 'resistor-1', 'led-3', 'led-4']);
    expect(new Set(next.components.map((component) => component.id)).size).toBe(next.components.length);
  });

  it('uses board-specific capabilities and maps code output to the wired pin', () => {
    expect(boardPinSupportsMode('arduino-uno-r3', 'D8', 'output')).toBe(true);
    expect(boardPinSupportsMode('esp32-devkit-v1', 'GPIO2', 'pwm')).toBe(true);
    expect(boardPinSupportsMode('esp32-devkit-v1', 'D8', 'output')).toBe(false);

    let graph = createStarterCircuit();
    for (const connection of LIGHT_LED_PROJECT.requiredConnections) graph = addWire(graph, connection.from, connection.to);
    const validation = validateCircuit(graph);
    expect(simulateArduinoLed('void setup() { pinMode(ledPin, OUTPUT); }\nvoid loop() { digitalWrite(ledPin, LOW); }\nconst int ledPin = 8;', validation).ledOn).toBe(false);
    expect(simulateArduinoLed('void setup() { pinMode(7, OUTPUT); }\nvoid loop() { digitalWrite(7, HIGH); }', validation).status).toBe('error');
    expect(executeSupportedFirmware(LIGHT_LED_PROJECT.starterCode).pinStates.D8).toBe(1);
  });

  it('models button inputs, multiple LED outputs and PWM brightness with explicit semantics', () => {
    let graph = createStarterCircuit();
    graph = addComponent(graph, 'led');
    graph = addComponent(graph, 'button');
    graph = addWire(graph, LIGHT_LED_PROJECT.requiredConnections[0].from, LIGHT_LED_PROJECT.requiredConnections[0].to);
    graph = addWire(graph, LIGHT_LED_PROJECT.requiredConnections[1].from, LIGHT_LED_PROJECT.requiredConnections[1].to);
    graph = addWire(graph, { ownerId: 'led-1', pinId: 'cathode', kind: 'component-pin' }, breadboardEndpoint('-1'));
    graph = addWire(graph, { ownerId: 'board', pinId: 'GND', kind: 'board-pin' }, breadboardEndpoint('-2'));
    graph = addWire(graph, { ownerId: 'led-2', pinId: 'anode', kind: 'component-pin' }, { ownerId: 'board', pinId: 'D9', kind: 'board-pin' });
    graph = addWire(graph, { ownerId: 'led-2', pinId: 'cathode', kind: 'component-pin' }, breadboardEndpoint('-3'));
    graph = addWire(graph, { ownerId: 'button-1', pinId: '1', kind: 'component-pin' }, { ownerId: 'board', pinId: 'D2', kind: 'board-pin' });
    graph = addWire(graph, { ownerId: 'button-1', pinId: '2', kind: 'component-pin' }, breadboardEndpoint('-4'));

    expect(endpointsShareCircuit(graph, { ownerId: 'led-1', pinId: 'cathode', kind: 'component-pin' }, { ownerId: 'board', pinId: 'GND', kind: 'board-pin' })).toBe(true);
    const validation = validateCircuit(graph);
    expect(validation.valid).toBe(true);

    const program = `const int ledPin = 8;\nconst int secondLedPin = 9;\nvoid setup() { pinMode(ledPin, OUTPUT); pinMode(secondLedPin, OUTPUT); }\nvoid loop() { digitalWrite(ledPin, HIGH); analogWrite(secondLedPin, 128); }`;
    const outputs = simulateArduinoLed(program, validation, graph);
    expect(outputs.status).toBe('running');
    expect(outputs.ledStates).toMatchObject({ 'led-1': 1, 'led-2': 128 / 255 });

    const buttonProgram = `const int buttonPin = 2;\nconst int ledPin = 8;\nvoid setup() { pinMode(buttonPin, INPUT); pinMode(ledPin, OUTPUT); }\nvoid loop() { if (digitalRead(buttonPin) == HIGH) { digitalWrite(ledPin, HIGH); } else { digitalWrite(ledPin, LOW); } }`;
    expect(simulateArduinoLed(buttonProgram, validation, graph).ledOn).toBe(false);
    const pressedGraph = updateComponentProperties(graph, 'button-1', { pressed: true });
    expect(simulateArduinoLed(buttonProgram, validateCircuit(pressedGraph), pressedGraph).ledOn).toBe(true);
  });

  it('restores valid local projects and rejects malformed saved data', () => {
    const graph = createStarterCircuit();
    saveVirtualHardwareProject('test-user', { graph, code: LIGHT_LED_PROJECT.starterCode, savedAt: new Date().toISOString() });
    expect(loadVirtualHardwareProject('test-user')?.graph.boardId).toBe('arduino-uno-r3');
    window.localStorage.setItem('enginx.virtual-hardware.project.bad', JSON.stringify({ graph: { boardId: 'unknown', components: [], wires: [] }, code: '' }));
    expect(loadVirtualHardwareProject('bad')).toBeNull();
    window.localStorage.clear();
  });
});
