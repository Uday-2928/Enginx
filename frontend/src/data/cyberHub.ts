import type {
  CybersecurityCTFChallenge,
  CybersecurityCourse,
  CybersecurityLab,
  CybersecurityLesson,
  CybersecurityLevel,
} from '../types';

/**
 * Bundled Cybersecurity Hub curriculum.
 *
 * The backend (`backend/routers/cybersecurity.py`) serves a catalogue at
 * `/api/cybersecurity/*`; nothing here needs to be in sync with it field for
 * field.  This copy exists so the hub renders a complete, functional workspace
 * even when the API is unreachable - the same read-only fallback pattern the
 * bundled challenge catalogue uses.  Every lab and challenge below carries an
 * explicit `execution` status so the UI never claims a sandbox or evaluator it
 * does not have.
 */

export type CyberHubSection =
  | 'dashboard'
  | 'courses'
  | 'labs'
  | 'ctf'
  | 'progress'
  | 'resources';

export interface CyberNavItem {
  id: CyberHubSection;
  label: string;
  group: 'learn' | 'practice' | 'account';
  icon: string;
  description: string;
}

export const CYBER_NAV_ITEMS: CyberNavItem[] = [
  { id: 'dashboard', label: 'Dashboard', group: 'learn', icon: 'dashboard', description: 'Your next lesson, labs and verified progress.' },
  { id: 'courses', label: 'Learning paths', group: 'learn', icon: 'book', description: 'Eight cybersecurity domains with structured lessons.' },
  { id: 'labs', label: 'Hands-on labs', group: 'practice', icon: 'lab', description: 'Isolated, browser-only simulations - nothing leaves your machine.' },
  { id: 'ctf', label: 'CTF challenges', group: 'practice', icon: 'flag', description: 'Capture-the-flag problems with a flag submission box.' },
  { id: 'progress', label: 'Progress tracker', group: 'account', icon: 'chart', description: 'Course completion, skill tree and badges.' },
  { id: 'resources', label: 'Resources', group: 'account', icon: 'library', description: 'Official references and tooling documentation.' },
];

// ---------------------------------------------------------------------------
// Learning paths
// ---------------------------------------------------------------------------

export interface CyberCourseTopic {
  title: string;
  detail: string;
}

export type CyberLessonCheck = {
  question: string;
  answer: string;
  explanation: string;
};

export type CyberLesson = {
  id: string;
  title: string;
  durationMinutes: number;
  level: CybersecurityLevel;
  summary: string;
  body: string;
  keyPoints: string[];
  codeSample: string;
  exercise: string;
  hint: string;
  check: CyberLessonCheck;
  challengeId: string | null;
};

export type CyberCourse = {
  id: string;
  title: string;
  eyebrow: string;
  level: CybersecurityLevel;
  estimatedHours: number;
  summary: string;
  topics: string[];
  outcomes: string[];
  lessons: CyberLesson[];
  xpReward: number;
};

export const CYBER_COURSES: CyberCourse[] = [
  {
    id: 'cyber-fundamentals',
    title: 'Security Fundamentals',
    eyebrow: 'Start here',
    level: 'Foundation',
    estimatedHours: 6,
    summary: 'Ethics, threat modelling, the CIA triad and the security mindset that makes every later module land.',
    topics: ['Ethics & rules of engagement', 'CIA triad', 'Threat modelling', 'Defence in depth'],
    outcomes: ['Write a one-page rules of engagement', 'Model threats from assets outwards', 'Apply least privilege and default-deny'],
    xpReward: 120,
    lessons: [
      {
        id: 'cyber-fund-01-ethics',
        title: 'Ethics and rules of engagement',
        durationMinutes: 40,
        level: 'Foundation',
        summary: 'Authorization is the line between security work and abuse.',
        body: "Every engagement starts with a written rules of engagement: which hosts are in scope, which techniques are allowed, what off-limits data exists, and when to stop. Without that document a 'test' is indistinguishable from a crime. Ethics is therefore not a soft preamble - it is the precondition that makes the rest of this discipline legal and reviewable.",
        keyPoints: [
          'Get written scope, techniques and data exclusions before touching anything.',
          'Prefer non-destructive, read-only checks first.',
          'Report vulnerabilities responsibly and through an agreed channel.',
        ],
        codeSample: "# Rules of engagement: the minimum a scope document must state\nSCOPE = {\n    \"allowed_hosts\": [\"app.enginx.example\"],\n    \"forbidden_hosts\": [\"*.internal\", \"vpn.enginx.example\"],\n    \"allowed_methods\": [\"authentications\", \"input validation\"],\n    \"forbidden_methods\": [\"ddos\", \"social engineering\", \"data exfiltration\"],\n    \"stop_conditions\": [\"unexpected outage\", \"real user data exposure\"],\n}",
        exercise: 'Draft the scope block for a test of a login form owned by someone else. Name one stop condition.',
        hint: 'A stop condition is something you halt on immediately, not something you report later.',
        check: {
          question: 'Who can turn network scanning into an authorized activity?',
          answer: 'Written, informed authorization from the asset owner, recorded in a scope document.',
          explanation: 'The technical action is identical either way; only the permission changes its legality.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-fund-02-cia',
        title: 'The CIA triad',
        durationMinutes: 35,
        level: 'Foundation',
        summary: 'Confidentiality, integrity and availability are the frame for every control you meet.',
        body: 'The triad names what "secure" means. Confidentiality keeps data away from unauthorized readers; integrity keeps it unchanged; availability keeps it reachable when needed. Most controls protect one property and incidentally affect the other two, so naming the tradeoff is the skill. A firewall mostly buys availability and confidentiality; an HSM buys confidentiality and integrity.',
        keyPoints: [
          'Confidentiality: only authorized readers.',
          'Integrity: data cannot be silently changed.',
          'Availability: authorized access when required.',
        ],
        codeSample: "# Classify a control by the property it defends\nCONTROLS = {\n    \"tls\":      {\"confidentiality\": True,  \"integrity\": True,  \"availability\": False},\n    \"hmac\":     {\"confidentiality\": False, \"integrity\": True,  \"availability\": False},\n    \"redundancy\":{\"confidentiality\": False, \"integrity\": False, \"availability\": True},\n    \"rbac\":     {\"confidentiality\": True,  \"integrity\": True,  \"availability\": False},\n}",
        exercise: 'A service returns 503 during off-peak hours. Which property failed, and name one control that would have protected it.',
        hint: 'Think about what the user could not do, not what data was wrong.',
        check: {
          question: 'Which property is broken by a ransomware encryption that does not leak data?',
          answer: 'Availability (and integrity, because the data was modified without authorization).',
          explanation: 'Confidentiality is about who reads; ransomware targets reachability and reversibility.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-fund-03-threat-model',
        title: 'Threat modelling from the outside in',
        durationMinutes: 45,
        level: 'Foundation',
        summary: 'Inventory trust boundaries before you write a mitigation.',
        body: "Threat modelling is an inventory of trust boundaries, not a checklist of attacks. Pick an asset - credentials, session tokens, exported datasets - write down who can touch it and through which interface, then rank the paths by blast radius rather than by how alarming the exploit looks. STRIDE is a useful coverage prompt, but the output you want is a short ranked table a reviewer can act on.",
        keyPoints: [
          'Start from assets and data flows, not from a vulnerability list.',
          'Every trust boundary is a candidate defence point.',
          'Rank by blast radius and exploitability, not by alarm.',
        ],
        codeSample: "# Data flow sketch: enumerate the trust boundaries\nBOUNDARY = {\n    \"client\": \"browser\",            # untrusted\n    \"edge\":   \"reverse proxy\",      # semi-trusted\n    \"api\":    \"application server\", # trusted zone\n    \"store\":  \"database\",           # trust boundary: query layer\n}\nprint(BOUNDARY[\"store\"])",
        exercise: 'Draw the path from browser to database for a login form and label each trust boundary.',
        hint: 'The proxy, the application and the database are three boundaries even if they share a host.',
        check: {
          question: 'Which question should be answered before choosing mitigations?',
          answer: 'Which assets exist and through which paths can they be reached?',
          explanation: 'Mitigations are only meaningful relative to an identified asset and a path to it.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
      {
        id: 'cyber-fund-04-least-privilege',
        title: 'Least privilege and defence in depth',
        durationMinutes: 40,
        level: 'Foundation',
        summary: 'Scope permissions to the task and assume every layer can fail.',
        body: "Least privilege means granting the smallest permission that lets the task succeed, at the narrowest scope, for the shortest time. Defence in depth means you still lose if any single layer fails. Combine them: a service account that can read the logs it needs but not write the database turns a shell there into a dead end instead of full compromise.",
        keyPoints: [
          'Scope to the task, not to a role title.',
          'Prefer read-only where read-only is sufficient.',
          'Assume every layer will eventually be bypassed.',
        ],
        codeSample: "# Capability check: allow only what the task needs\nGRANTS = {\"backup-job\": {\"logs\": \"read\", \"db\": \"none\"}}\n\ndef allowed(principal: str, resource: str, action: str) -> bool:\n    return GRANTS.get(principal, {}).get(resource) == action\n\nprint(allowed(\"backup-job\", \"logs\", \"read\"))   # True\nprint(allowed(\"backup-job\", \"db\", \"write\"))    # False",
        exercise: 'A weekly report job must read the orders table. What is the smallest grant set?',
        hint: 'It needs SELECT on one table, not a superuser login.',
        check: {
          question: 'Why pair least privilege with defence in depth?',
          answer: 'Least privilege limits the damage; defence in depth assumes the boundary was bypassed anyway.',
          explanation: 'They answer different questions: how much to grant, and what survives a grant being violated.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-networking',
    title: 'Networking for Security',
    eyebrow: 'The transport layer',
    level: 'Foundation',
    estimatedHours: 7,
    summary: 'TCP/IP, port semantics and reconnaissance vocabulary - the language every later investigation is written in.',
    topics: ['TCP/IP model', 'Ports & services', 'Reconnaissance', 'Packet reading'],
    outcomes: ['Read a packet capture line by line', 'Explain the TCP handshake', 'Enumerate and reason about open ports'],
    xpReward: 130,
    lessons: [
      {
        id: 'cyber-net-01-tcpip',
        title: 'TCP/IP and the layer model',
        durationMinutes: 45,
        level: 'Foundation',
        summary: 'Layers exist so each hop of a network only answers to its neighbour.',
        body: 'The layered model is a contract, not a diagram. Each layer hands a message to the layer below and expects a result back; a firewall decides at layer 3/4, TLS terminates at layer 7, and a bad packet never reaches your application if the model holds. When you debug a connectivity problem you walk the layers in order - addressing first, then routing, then transport, then the application - because a lower layer that is broken makes every layer above it fail.',
        keyPoints: [
          'Layer 3 routes between networks; layer 4 delivers between ports.',
          'Diagnose bottom-up: addressing, routing, transport, application.',
          'Controls belong at the layer that owns the decision.',
        ],
        codeSample: "# Map the four layers to the question they answer\nLAYERS = {\n    \"3-network\": \"which network is this on?\",\n    \"4-transport\": \"which process on that host?\",\n    \"5-7-session/app\": \"what is the request and its meaning?\",\n}\nfor layer, question in LAYERS.items():\n    print(f\"{layer} -> {question}\")",
        exercise: 'A host is reachable by name but not by IP. Which layer should you check first, and why?',
        hint: 'Names and addresses are resolved at different stages.',
        check: {
          question: 'Which layer decides which application on the destination host receives a packet?',
          answer: 'Layer 4, the transport layer, using the destination port number.',
          explanation: 'Layer 3 gets you to the host; the port field selects the process.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-net-02-ports',
        title: 'Ports, services and reconnaissance',
        durationMinutes: 50,
        level: 'Foundation',
        summary: 'An open port is an invitation with an implied contract.',
        body: 'Reconnaissance is mostly arithmetic: a host advertises ports, and each listening port implies a service, a version and a set of known weaknesses. A closed port says nothing; a filtered port says a device is deciding for you. The security value is in prioritising - an open 22 on a bastion you expected is noise, an open 22 on a printer is a finding. Version banners matter because they turn a service into a searchable vulnerability surface.',
        keyPoints: [
          'Open, closed and filtered mean three different things.',
          'A listening port implies a service and an implicit contract.',
          'Rank findings by whether the service should be there at all.',
        ],
        codeSample: "# Classify a scan result, then rank by surprise\nFINDINGS = [\n    (\"80/tcp\",  \"open\",     \"nginx/1.24\",        \"expected - web server\"),\n    (\"22/tcp\",  \"open\",     \"OpenSSH 8.9\",       \"unexpected - printer host\"),\n    (\"445/tcp\", \"filtered\", \"-\",                 \"firewall decision, no banner\"),\n]\nfor port, state, banner, note in FINDINGS:\n    print(f\"{port} {state}: {banner} ({note})\")",
        exercise: 'You see 445/tcp open on a host with no file-share requirement. What do you do next?',
        hint: 'Confirm the service really is a file service, then decide whether it should exist.',
        check: {
          question: 'What does a filtered port tell you that a closed port does not?',
          answer: 'That something is actively making a decision about your probe instead of the host answering directly.',
          explanation: 'Closed is an answer from the stack; filtered is an intermediary dropping or holding the packet.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-net-03-captures',
        title: 'Reading packet captures',
        durationMinutes: 55,
        level: 'Intermediate',
        summary: 'A capture is a timeline; the interesting part is usually a repeated small anomaly.',
        body: 'Packet captures reward patience over cleverness. Order the flow by timestamp, group into conversations, and look for the shape: a handshake without a teardown, repeated SYN without ACK, or a payload that arrives at an unexpected point in the exchange. Timestamps are only as good as the clock, so a suspiciously neat sequence may be a replay. Always know which side of a connection you captured - a one-sided capture hides the other party entirely.',
        keyPoints: [
          'Sort by time, then group into conversations.',
          'Look for structural anomalies, not just content.',
          'A one-sided capture cannot prove the other side.',
        ],
        codeSample: "# Group packets into conversations and count flags\nfrom collections import Counter\n\ndef conversations(frames):\n    buckets = Counter()\n    for frame in frames:\n        key = tuple(sorted((frame.src, frame.dst)))\n        buckets[key] += 1\n    return buckets\n\n# buckets -> {(host_a, host_b): packet_count}",
        exercise: 'List three structural anomalies a SYN-heavy capture could hide.',
        hint: 'Consider what the other end never did.',
        check: {
          question: 'Why can a one-sided packet capture mislead you about who sent a request?',
          answer: 'Because you only see half the conversation, so response-only flows look like requests.',
          explanation: 'Direction is inferred from the other side; without it, attribution is an assumption.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-linux',
    title: 'Linux for Ethical Hackers',
    eyebrow: 'The command line',
    level: 'Foundation',
    estimatedHours: 6,
    summary: 'Filesystem navigation, permissions, pipes and the tool habits that make a terminal productive instead of frightening.',
    topics: ['Command line basics', 'Permissions & ownership', 'Pipes & redirection', 'Essential tooling'],
    outcomes: ['Move and filter files fluently', 'Explain rwx and setuid', 'Chain commands into a pipeline'],
    xpReward: 120,
    lessons: [
      {
        id: 'cyber-lin-01-cli',
        title: 'Command line foundations',
        durationMinutes: 40,
        level: 'Foundation',
        summary: 'The shell is a typed interface; fluency compounds quickly.',
        body: 'Most of a pentester\'s day is reading files. The skills that pay off are mechanical: navigate without a mouse, filter output, and redirect results somewhere durable. Learn `cd`, `ls -la`, `grep`, `cat`, `less`, `wc` and the difference between `;`, `&&` and `||` - the last one matters because a chain that continues after a failure quietly produces wrong results.',
        keyPoints: [
          '`ls -la` shows hidden files and permissions.',
          '`&&` runs only on success; `;` always runs.',
          'Redirect with `>` to overwrite, `>>` to append.',
        ],
        codeSample: "# Navigation and inspection\nls -la /path/to/drop        # list everything, including hidden files\ngrep -in 'root' /path/file # case-insensitive, show line numbers\nwc -l /path/file            # line, word, byte count\ncat a.txt > b.txt           # overwrite b.txt\necho note >> a.txt          # append",
        exercise: 'Find every line mentioning "flag" across three files and number the hits.',
        hint: 'grep can recurse; the -n flag numbers matches.',
        check: {
          question: 'What is the difference between `cmd1 && cmd2` and `cmd1; cmd2`?',
          answer: '`&&` runs cmd2 only if cmd1 succeeded; `;` runs cmd2 regardless of cmd1\'s result.',
          explanation: 'Chains that continue past failures produce output from an incomplete state.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-lin-02-permissions',
        title: 'Permissions, ownership and escalation',
        durationMinutes: 50,
        level: 'Foundation',
        summary: 'Unix permissions are a per-bit decision about read, write and execute.',
        body: 'Every file has an owner, a group and three permission triples: read, write and execute. Execute on a directory is what lets you enter it, which is why a directory you cannot execute is unreachable regardless of file permissions. setuid is a file that runs with the owner\'s privileges - useful for deliberate privilege bridges, and a classic escalation source when it sits on a writable binary. Check ownership before you trust a location.',
        keyPoints: [
          'Directory execute permission gates traversal.',
          'setuid binaries run as their owner.',
          'Check ownership, not just the mode string.',
        ],
        codeSample: "# Reading a mode line: rwxr-xr-- 1 alice devs 412 file\n#               owner group other      owner group  bytes name\n# rwxr-xr--  ->  owner: read+write+execute\n#                group:  read+execute\n#                other:  read only\n\n# A setuid binary runs as its file owner:\n# -rwsr-xr-x  1 root root  ...  helper",
        exercise: 'Explain why you can list a directory but not open a file inside it.',
        hint: 'You are looking at two different permission checks.',
        check: {
          question: 'What does execute permission on a directory allow?',
          answer: 'Traversing the directory to reach named entries inside it.',
          explanation: 'Read on a directory lists names; execute on it resolves paths into it.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-lin-03-pipes',
        title: 'Pipes, redirection and tooling',
        durationMinutes: 45,
        level: 'Intermediate',
        summary: 'Small tools composed in a pipeline replace most one-off scripts.',
        body: 'Unix tooling is deliberately minimal: `head`, `sort`, `uniq`, `cut`, `awk` and `sed` each do one thing well, and piping them composes into surprisingly powerful pipelines. The discipline is to keep each stage simple and inspect the intermediate output, because an unreadable pipeline is a pipeline you cannot debug. Watch out for `head` truncating before `sort` runs in an unbuffered pipe - stage order changes results.',
        keyPoints: [
          'One responsibility per stage.',
          'Check intermediate output, not just the final answer.',
          '`sort | uniq -c` is the standard frequency table.',
        ],
        codeSample: "# Top ten source addresses by connection count\nsort connections.log | uniq -c | sort -rn | head -n 10\n\n# Count lines per status code\nawk '{print $9}' access.log | sort | uniq -c | sort -rn",
        exercise: 'From an access log, count distinct referrers and show the five busiest.',
        hint: 'Referrer is usually the Referer field; split on whitespace with awk.',
        check: {
          question: 'Why check intermediate pipeline output instead of only the final result?',
          answer: 'Because a single misordered or misparsed stage silently corrupts every later stage.',
          explanation: 'Pipelines have no error recovery; a bad stage produces confident-looking wrong data.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-web',
    title: 'Web Application Security',
    eyebrow: 'OWASP Top 10',
    level: 'Intermediate',
    estimatedHours: 9,
    summary: 'Injection, broken access control, session handling and the input/output discipline that closes most OWASP Top 10 classes.',
    topics: ['Injection', 'Broken access control', 'Session management', 'XSS & CSRF'],
    outcomes: ['Write parameterised queries by default', 'Check ownership server-side on every id', 'Encode output for the exact sink'],
    xpReward: 150,
    lessons: [
      {
        id: 'cyber-web-01-injection',
        title: 'Injection and parameterised queries',
        durationMinutes: 60,
        level: 'Intermediate',
        summary: 'Treat every string crossing a boundary as data, never as a query.',
        body: "Injection happens when untrusted text changes the structure of a command, whether that is SQL, shell, LDAP or an ORM filter built by concatenation. Parameterised queries keep data and structure separate: the driver quotes and types the value, so no amount of user text becomes syntax. Where parameters are impossible, use an allowlist on the shape of the input - never a blocklist of bad characters, because omitted characters are always still available through encoding.",
        keyPoints: [
          'Bind parameters; never concatenate user input into SQL.',
          'Allowlists beat blocklists for validation.',
          'Injection is a class of bugs, not just SQL.',
        ],
        codeSample: "# BAD: concatenation turns user input into query syntax\n#   cursor.execute(f\"SELECT * FROM users WHERE email = '{email}'\")\n\n# GOOD: the driver separates data from structure\ndef find_user(cursor, email: str):\n    cursor.execute(\n        \"SELECT id, email, xp FROM users WHERE email = ?\",\n        (email,),\n    )\n    return cursor.fetchone()",
        exercise: 'A search box filters by name. Write the parameterised query and state what attacker input can and cannot change.',
        hint: 'The value can change which rows match, but not which columns are returned.',
        check: {
          question: 'Why does a blocklist on quotes fail to prevent SQL injection?',
          answer: 'Because encoding and context differ per target, so omitted characters are always available.',
          explanation: 'Only keeping data out of the syntax position is robust.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
      {
        id: 'cyber-web-02-access-control',
        title: 'Authentication versus authorisation',
        durationMinutes: 55,
        level: 'Intermediate',
        summary: 'Proving who you are and deciding what you may do are two different checks.',
        body: "Authentication answers 'who is this request from'; authorisation answers 'is that identity permitted here'. Most access-control bugs come from doing the first without the second, or from trusting a client-supplied id. The server must derive the principal from a signed token and then re-check ownership server-side for every resource id in the URL. IDOR is the common face of this: iterating a numeric id and reading someone else's progress.",
        keyPoints: [
          'Never trust a user id arriving in the request body.',
          'Filter by the token principal AND the resource id.',
          'Return 404 rather than 403 when ownership is unknown.',
        ],
        codeSample: "# The principal comes from the token, never from the client.\ndef _owned_or_404(db, resource_id: str, current_user) -> object:\n    row = db.query(Resource).filter(\n        Resource.id == resource_id,\n        Resource.owner_id == current_user.id,\n    ).first()\n    if row is None:\n        # Do not reveal whether another user owns this id.\n        raise LookupError(\"not found\")\n    return row",
        exercise: 'Write the ownership filter for a POST that marks a lesson complete.',
        hint: 'Match both user_id == current_user.id and lesson_id == path_id.',
        check: {
          question: 'What is the difference between authentication and authorisation?',
          answer: 'Authentication establishes identity; authorisation grants or denies an action for that identity.',
          explanation: 'A valid token with a resource someone else owns must still be rejected.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
      {
        id: 'cyber-web-03-sessions',
        title: 'Session and cookie handling',
        durationMinutes: 50,
        level: 'Intermediate',
        summary: 'A session token is a bearer credential; its attributes decide what it can do.',
        body: 'Session identifiers must be unguessable, rotated on login and invalidated on logout. Cookie flags are the defence layer: HttpOnly keeps JavaScript away, Secure keeps cookies off plain HTTP, SameSite limits automatic attachment to cross-origin requests. Each flag addresses a different failure mode, so omitting one quietly reopens a class of attack even when the rest looks correct.',
        keyPoints: [
          'Generate tokens with real randomness, then rotate them on privilege change.',
          'HttpOnly, Secure and SameSite each block a different attack.',
          'Logout must invalidate server-side, not just delete the client copy.',
        ],
        codeSample: "# Defensive cookie attributes\ncode = {\n    \"httponly\": True,   # JavaScript cannot read it\n    \"secure\": True,    # never sent over plain HTTP\n    \"samesite\": \"Lax\", # limits cross-origin attachment\n}\n\n# Setting:\n# Set-Cookie: sid=...; HttpOnly; Secure; SameSite=Lax; Path=/",
        exercise: 'List the three cookie flags and the specific attack each one mitigates.',
        hint: 'One is about JavaScript, one about transport, one about origin.',
        check: {
          question: 'What does the HttpOnly attribute prevent?',
          answer: 'JavaScript on the page from reading the cookie, which blocks direct-exfiltration XSS.',
          explanation: 'It does not stop an attacker from using the cookie - only from stealing it in memory.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-web-04-xss-csrf',
        title: 'CSRF and cross-site scripting',
        durationMinutes: 50,
        level: 'Intermediate',
        summary: 'Block forged cross-origin requests and stop reflected content from becoming code.',
        body: "CSRF exploits the browser's willingness to attach cookies to cross-origin requests; a state-changing route needs a secret the attacker's page cannot read, which modern APIs get from the Authorization header rather than cookies. XSS happens when output is rendered as HTML, script or an event handler instead of text; encode for the exact sink you are writing into and set a strict Content-Security-Policy as a second layer.",
        keyPoints: [
          'Bearer tokens in headers are not sent cross-origin, which defeats CSRF.',
          'Validate Origin on cookie-authenticated state changes.',
          'Encode output per sink: text, attribute, JavaScript, URL.',
        ],
        codeSample: "# CSRF check for a cookie-authenticated state change\ndef origin_ok(requested: str, allowed: str) -> bool:\n    return requested.strip().lower() == allowed.strip().lower()\n\n# CSP: allow only our bundle, no inline script\nCSP = \"default-src 'self'; script-src 'self'; object-src 'none'\"",
        exercise: 'Which header should you validate on a POST that sets a cookie, and why?',
        hint: 'The cookie rides along automatically otherwise.',
        check: {
          question: 'Why does using an Authorization bearer header reduce CSRF risk?',
          answer: 'Because the browser does not attach it to cross-origin requests.',
          explanation: 'CSRF needs the credential to travel without the attacker\'s knowledge.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-crypto',
    title: 'Cryptography',
    eyebrow: 'Hashing & encryption',
    level: 'Intermediate',
    estimatedHours: 8,
    summary: 'Hashing, symmetric and asymmetric encryption, and the password-storage rules that keep a stolen database useful to no one.',
    topics: ['Hashing', 'Symmetric ciphers', 'Asymmetric keys', 'Password storage'],
    outcomes: ['Explain why fast hashes are unsafe for passwords', 'Recover a key from known plaintext', 'Describe the hybrid encryption pattern'],
    xpReward: 150,
    lessons: [
      {
        id: 'cyber-cry-01-xor',
        title: 'XOR, key recovery and stream ciphers',
        durationMinutes: 55,
        level: 'Intermediate',
        summary: 'XOR is its own inverse, which makes it both the basis of stream ciphers and a favourite CTF entry point.',
        body: "XOR has one property worth memorising: a XOR b XOR b equals a. A repeating-key XOR cipher therefore leaves the plaintext wherever the keystream repeats, and if you know even one byte of the plaintext you can recover the key byte at that position. This is exactly the attack in the CTF challenge: the flag prefix 'ENGINX{' is known plaintext, so ciphertext[0] XOR ord('E') is the key.",
        keyPoints: [
          'XOR is its own inverse: a ^ b ^ b == a.',
          'Known plaintext recovers the keystream at that offset.',
          'Never reuse a stream-cipher keystream.',
        ],
        codeSample: "# Recover a single-byte XOR key from known plaintext\nHEX_CIPHERTEXT = \"151e17191e280b05161643020f0502161c4300071e430205034d\"\n\ndef decrypt_xor_flag():\n    ct = bytes.fromhex(HEX_CIPHERTEXT)\n    # key = ct[0] ^ ord('E')  ->  0x15 ^ 0x45 == 0x50 == 'P'\n    key = ct[0] ^ ord(\"E\")\n    return \"\".join(chr(b ^ key) for b in ct)\n\nprint(decrypt_xor_flag())  # ENGINX{x0r_c1ph3r_cr4ck3d}",
        exercise: 'Given ct[0] = 0x15 and known plaintext \'E\', compute the key and show the decryption loop.',
        hint: 'Use bytes.fromhex, then XOR every byte with the single recovered key.',
        check: {
          question: 'Why does XOR decryption work with the same key that encrypted?',
          answer: 'Because XOR is its own inverse: a ^ b ^ b == a.',
          explanation: 'Symmetry means one operation encrypts and decrypts, so a recovered key undoes the cipher directly.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
      {
        id: 'cyber-cry-02-hashing',
        title: 'Hashing versus password hashing',
        durationMinutes: 50,
        level: 'Intermediate',
        summary: 'A fast hash proves integrity; a slow hash defends a stolen credential database.',
        body: "SHA-256 is designed to be fast, which is fatal for password storage: an attacker with a leaked database can test billions of candidates a second. Password hashing must be deliberately slow and parameterised - bcrypt, scrypt or Argon2id - so cost can be raised as hardware improves. Also normalise the input before hashing; pre-hashing a long password with SHA-256 keeps UTF-8 input under bcrypt's 72-byte limit.",
        keyPoints: [
          'Use a slow, configurable-cost KDF for passwords.',
          'A per-user salt defeats rainbow tables.',
          'Pre-hash long passwords to respect bcrypt\'s 72-byte limit.',
        ],
        codeSample: "# Pre-hash before bcrypt so long UTF-8 input cannot be truncated\nimport hashlib, bcrypt\n\ndef _password_bytes(password: str) -> bytes:\n    return hashlib.sha256(password.encode(\"utf-8\")).digest()\n\ndef hash_password(password: str) -> str:\n    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode()\n\ndef verify(password: str, stored: str | None) -> bool:\n    if not stored:\n        return False\n    return bcrypt.checkpw(_password_bytes(password), stored.encode())",
        exercise: 'Explain why storing SHA-256(password) instead of bcrypt(password) is still unsafe.',
        hint: 'Consider how fast SHA-256 runs on a GPU.',
        check: {
          question: 'What property of a password hash function matters most against offline cracking?',
          answer: 'Configurable slowness, so cost per guess can be raised over time.',
          explanation: 'Speed is the attacker\'s friend; a slow KDF directly shrinks candidates tested.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-cry-03-symmetric',
        title: 'Symmetric encryption in practice',
        durationMinutes: 50,
        level: 'Intermediate',
        summary: 'One shared key buys speed; the hard part is distributing it.',
        body: "Symmetric ciphers share a single secret between parties, which makes them fast enough for bulk data. Modern use is almost always authenticated encryption - AES-GCM or ChaCha20-Poly1305 - because encryption without integrity lets a tampering attacker flip bits at will. Use unique nonces per key, never reuse an IV, and never roll your own: the API surface is deliberately small precisely because the details are where implementations break.",
        keyPoints: [
          'Prefer authenticated encryption (AEAD) over raw encryption.',
          'Nonce reuse under one key is catastrophic.',
          'Standard library primitives, not homegrown constructions.',
        ],
        codeSample: "# AES-GCM: confidentiality and integrity in one call\nfrom cryptography.hazmat.primitives.ciphers.aead import AESGCM\n\nkey = AESGCM.generate_key(bit_length=256)\naesgcm = AESGCM(key)\nnonce = b\"\\x00\" * 12          # unique per message, never reused\n\nciphertext = aesgcm.encrypt(nonce, b\"attack at dawn\", b\"user-id\")\nplaintext = aesgcm.decrypt(nonce, ciphertext, b\"user-id\")",
        exercise: 'What goes wrong if two different messages under one key reuse the same nonce?',
        hint: 'The keystream is identical, so the two ciphertexts are directly related.',
        check: {
          question: 'Why prefer AES-GCM over plain AES-CBC for application data?',
          answer: 'GCM authenticates the ciphertext, so tampering is detected instead of silently decrypting to garbage.',
          explanation: 'Encryption alone tells you nothing about whether the data was modified.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-cry-04-asymmetric',
        title: 'Asymmetric cryptography and key exchange',
        durationMinutes: 45,
        level: 'Intermediate',
        summary: 'Key pairs solve key distribution, and hybrid encryption is how TLS actually works.',
        body: "Asymmetric cryptography solves the key-distribution problem: anyone can encrypt to a public key, only the holder of the private key can decrypt. It is slow, so practice is to hybridise - encrypt data with a fresh symmetric key, then encrypt that key to the recipient's public key. TLS does this on every connection. Public-key usage also gives you signatures: the private key signs, the public key verifies, which is exactly backwards from encryption.",
        keyPoints: [
          'Symmetric: one shared key, fast, hard to distribute.',
          'Asymmetric: key pairs, slow, solves distribution.',
          'Hybrid encryption is how TLS actually works.',
        ],
        codeSample: "# Hybrid pattern: bulk data under a symmetric key, key exchange asymmetric\nclass HybridEnvelope:\n    def __init__(self, data_key: bytes, ciphertext: bytes, wrapped_key: bytes):\n        self.data_key = data_key      # fresh symmetric key\n        self.ciphertext = ciphertext  # encrypted with data_key\n        self.wrapped_key = wrapped_key # encrypted to recipient public key\n\n    def parts(self) -> dict:\n        return {\"size\": len(self.ciphertext), \"wrapped\": len(self.wrapped_key)}",
        exercise: 'Outline the three steps a sender performs to encrypt a file to a known recipient.',
        hint: 'Generate, encrypt the data, then wrap the key.',
        check: {
          question: 'Why combine symmetric and asymmetric cryptography instead of using only asymmetric?',
          answer: 'Because asymmetric operations are slow, so bulk data is encrypted symmetrically.',
          explanation: 'Asymmetric cryptography handles key exchange; symmetric cryptography handles throughput.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
    ],
  },
  {
    id: 'cyber-forensics',
    title: 'Digital Forensics',
    eyebrow: 'Logs & evidence',
    level: 'Advanced',
    estimatedHours: 8,
    summary: 'Log analysis, evidence handling and chain of custody - turning a timeline into a defensible finding.',
    topics: ['Log analysis', 'Timeline construction', 'Evidence handling', 'Chain of custody'],
    outcomes: ['Correlate logs across services by timestamp', 'Preserve a hash-backed evidence record', 'Write a defensible findings note'],
    xpReward: 140,
    lessons: [
      {
        id: 'cyber-for-01-logs',
        title: 'Log analysis and correlation',
        durationMinutes: 55,
        level: 'Advanced',
        summary: 'A single log line rarely proves anything; correlation does.',
        body: 'Forensic value lives in cross-service correlation. A 401 in the access log is routine alone, but a 401 cluster followed by a successful login from a new location and a privilege change is an incident. Timestamps are the join key, and they are only as reliable as clock discipline - an NTP offset of minutes can reorder the whole timeline. Start from the confirmed event and work outwards in time.',
        keyPoints: [
          'Join events across services on timestamp.',
          'Treat clock offset as a real source of error.',
          'Start from a confirmed event, expand outward.',
        ],
        codeSample: "# Correlate by normalising timestamps first\nfrom datetime import datetime, timezone\n\ndef normalise(raw: str, tz: str) -> float:\n    stamp = datetime.fromisoformat(raw.replace(\"Z\", \"+00:00\")).astimezone(timezone.utc)\n    return stamp.timestamp()\n\n# events sorted by normalised time -> the true timeline\n# access 401 cluster -> login success -> privilege change",
        exercise: 'Three services log with different formats. Write the step that makes them joinable.',
        hint: 'Everything must resolve to one monotonic reference first.',
        check: {
          question: 'Why is clock discipline part of forensic rigour?',
          answer: 'Because a time offset can reorder events, producing the wrong causal story.',
          explanation: 'The finding depends on sequence, and sequence depends on comparable timestamps.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-for-02-evidence',
        title: 'Evidence handling and chain of custody',
        durationMinutes: 50,
        level: 'Advanced',
        summary: 'Working on a copy, and recording every handoff, is what makes a finding defensible.',
        body: 'Evidence is only useful if it is verifiable. Capture a hash of the original, work exclusively on a copy, and record every transfer with who, when and why. The hash is the cheap, high-value control: if a copy re-hashes to the same digest, no one in the chain altered it. Skipping the copy is the single most common way a finding loses credibility after it is made.',
        keyPoints: [
          'Hash the original, then work only on a copy.',
          'Record every handoff: who, when, why.',
          'A matching digest is the proof nothing changed.',
        ],
        codeSample: "# Integrity-first evidence intake\nimport hashlib\n\ndef fingerprint(path: str) -> str:\n    digest = hashlib.sha256()\n    with open(path, \"rb\") as handle:\n        for block in iter(lambda: handle.read(1 << 20), b\"\"):\n            digest.update(block)\n    return digest.hexdigest()\n\n# original_hash = fingerprint(\"/evidence/disk.img\")\n# work on /work/copy.img; verify with fingerprint() before and after",
        exercise: 'Describe the steps you take between receiving a disk image and starting analysis.',
        hint: 'The copy happens before anything reads it.',
        check: {
          question: 'Why analyse a copy instead of the original evidence?',
          answer: 'Because reading and modifying evidence can alter it; a copy keeps the original pristine and hash-verifiable.',
          explanation: 'The original is the record; the copy is the working material.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-for-03-timeline',
        title: 'Timeline construction and reporting',
        durationMinutes: 60,
        level: 'Advanced',
        summary: 'A finding is a timeline plus the commands that reproduce it.',
        body: 'Write the incident as a timeline anchored to evidence: each row names a source, a timestamp, an observation and the command that produced it. A reader should be able to re-run your command and get your number. Keep the report factual and separated from interpretation - the observations in one section, the conclusions in the next. Anything that cannot be reproduced belongs in a clearly labelled "assumption" list, not in the timeline.',
        keyPoints: [
          'Every row: source, timestamp, observation, reproducing command.',
          'Keep facts and interpretation in separate sections.',
          'Label anything non-reproducible as an assumption.',
        ],
        codeSample: "# Durable notes: append, never overwrite\ndef append_note(path: str, tag: str, detail: str) -> None:\n    with open(path, \"a\", encoding=\"utf-8\") as handle:\n        handle.write(f\"[{tag}] {detail}\\n\")\n\n# append_note(\"/work/findings.txt\", \"recon\", \"port 22 open, unexpected host\")",
        exercise: 'Design a five-line note format that lets a teammate reproduce your finding.',
        hint: 'Include target, method, observation and the command that produced it.',
        check: {
          question: 'What makes a forensic finding independently verifiable?',
          answer: 'A recorded, reproducible command that produces the stated observation from preserved evidence.',
          explanation: 'Verification needs the same input and the same operation, both documented.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-pentest',
    title: 'Penetration Testing',
    eyebrow: 'Methodology',
    level: 'Advanced',
    estimatedHours: 10,
    summary: 'A repeatable methodology: scope, recon, enumeration, exploitation, then a report an engineer can act on.',
    topics: ['Methodology', 'Enumeration', 'Exploitation discipline', 'Reporting'],
    outcomes: ['Run a scope-to-report engagement', 'Rank findings by impact and reachability', 'Write an engineer-ready report'],
    xpReward: 160,
    lessons: [
      {
        id: 'cyber-pen-01-method',
        title: 'Engagement methodology',
        durationMinutes: 50,
        level: 'Advanced',
        summary: 'A fixed phase order keeps you from tunnelling on the first shiny finding.',
        body: 'A penetration test is a project with a deliverable, so it has a plan: scope, information gathering, enumeration, vulnerability identification, exploitation, and a written report. The most common failure is skipping ahead - exploiting the first finding before you know the second one is the real risk. Keep a running findings list and revisit it after enumeration, because impact is only visible once you know the whole surface.',
        keyPoints: [
          'Fix the phase order before starting.',
          'Maintain a running findings list, not just the last exploit.',
          'Revisit findings after enumeration to re-rank impact.',
        ],
        codeSample: "# Phase gates: do not advance without the previous artifact\nPHASES = [\n    (\"scope\",        \"signed rules of engagement\"),\n    (\"gathering\",    \"asset and service inventory\"),\n    (\"enumeration\",  \"versioned, annotated surface map\"),\n    (\"exploitation\", \"verified, reproducible results\"),\n    (\"report\",       \"ranked findings + remediation\"),\n]",
        exercise: 'You found a working exploit in phase 3. List what you should do before writing the report.',
        hint: 'You still may not have the highest-impact finding.',
        check: {
          question: 'Why maintain a findings list rather than only tracking the current exploit?',
          answer: 'Because final impact ranking is only possible once the entire surface has been enumerated.',
          explanation: 'Report priority is a property of the whole engagement, not of the first success.',
        },
        challengeId: 'cyber-01-xor-cipher-decrypt',
      },
      {
        id: 'cyber-pen-02-enum',
        title: 'Enumeration and attack surface mapping',
        durationMinutes: 55,
        level: 'Advanced',
        summary: 'Enumeration converts a host list into a versioned, prioritised attack surface.',
        body: 'Enumeration is where effort is spent so exploitation takes minutes instead of days. Collect versions, configurations and service banners, then rank by reachability rather than by severity labels alone - a critical CVE on an unreachable host is not a finding. Annotate each entry with what it implies: an open directory listing implies data exposure, a version banner implies a searchable CVE surface. Surprise is the ranking signal.',
        keyPoints: [
          'Version and banner the services you find.',
          'Rank by reachability and surprise, not by label alone.',
          'Write down what each finding implies, not just what it is.',
        ],
        codeSample: "# Rank by surprise: should this service exist here?\nSURFACE = [\n    (\"22/tcp\",  \"ssh\",    8.9,  \"unexpected on this host\"),\n    (\"80/tcp\",  \"http\",   1.24, \"expected - web front\"),\n    (\"5432/tcp\",\"postgres\",15,  \"surprise - db exposed\"),\n]\nfor port, service, version, note in SURFACE:\n    print(f\"{port} {service} {version} - {note}\")",
        exercise: 'Rank three findings: exposed database, stale web server, verbose banner. Justify the order.',
        hint: 'Consider blast radius, not just the word "critical".',
        check: {
          question: 'Why can a CVE with a critical severity score rank below a low-severity finding?',
          answer: 'Because severity scores ignore reachability and blast radius, which decide real impact.',
          explanation: 'An unreachable vulnerability cannot be exploited; a reachable one with a wide blast radius can.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-pen-03-reporting',
        title: 'Reporting and remediation',
        durationMinutes: 60,
        level: 'Advanced',
        summary: 'A report is only useful if the person fixing it can act on it today.',
        body: 'The report is the product. Each finding needs the vulnerability, a reproduction that works, the impact in plain language, and a concrete remediation the engineer can implement. Remediation advice should name the specific control, not just the concept - "use parameterised queries" beats "improve input handling". Separate executive summary from technical detail: one page for a decision maker, full reproduction for the engineer. Never omit risk and residual risk after the proposed fix.',
        keyPoints: [
          'Reproduction, impact, and a specific fix per finding.',
          'Name the exact control, not a vague category.',
          'Separate executive summary from technical detail.',
        ],
        codeSample: "# A finding section an engineer can act on\nFINDING = {\n    \"title\": \"Login bypass via SQL concatenation\",\n    \"severity\": \"Critical\",\n    \"impact\": \"Any account accessible without credentials, including admin.\",\n    \"reproduction\": \"POST /login with username '= OR '1'='1 --\",\n    \"remediation\": \"Use parameterised queries in the authentication lookup.\",\n    \"residual_risk\": \"None once binding is enforced; add a regression test.\",\n}",
        exercise: 'Rewrite "improve input validation" into an actionable remediation for a login form.',
        hint: 'Name the mechanism and where it is enforced.',
        check: {
          question: 'Why include residual risk alongside a remediation?',
          answer: 'Because a fix may reduce rather than eliminate risk, and the reader needs to know what remains.',
          explanation: 'A control that looks complete but hides a remainder can be deferred too early.',
        },
        challengeId: null,
      },
    ],
  },
  {
    id: 'cyber-blue',
    title: 'Blue Team Defense',
    eyebrow: 'Incident response',
    level: 'Advanced',
    estimatedHours: 9,
    summary: 'Detection engineering, monitoring, incident response and the comms that keep a response from making things worse.',
    topics: ['Monitoring & detection', 'Incident response', 'Playbooks & containment', 'Post-incident review'],
    outcomes: ['Write a detection that matches an observable', 'Run an IR plan without escalating the outage', 'Conduct a blameless post-mortem'],
    xpReward: 150,
    lessons: [
      {
        id: 'cyber-blue-01-detection',
        title: 'Detection engineering',
        durationMinutes: 55,
        level: 'Advanced',
        summary: 'Detections are written against observables, not against attackers.',
        body: 'A detection fires when an observable appears: a process, a token type, a request shape, a file write. Anchoring a rule to an observable rather than to a specific tool or payload is what keeps it alive - tools change, behaviors do not. Every rule needs a false-positive budget and an owner, because a rule nobody trusts gets silenced, and a silenced rule silently stops catching everything.',
        keyPoints: [
          'Write detections against behavior, not tool signatures.',
          'Every rule needs an owner and a false-positive budget.',
          'Silenced alerts are indistinguishable from missing alerts.',
        ],
        codeSample: "# A behavior-anchored detection sketch\nSIGNAL = \"new interactive shell spawned by a service process\"\n# matches the behavior class, not any single tool binary\n# owner: platform team\n# budget: < 2 false positives per week per host\nFIRING_ON = {\"parent\": \"nginx\", \"child\": \"bash\"}",
        exercise: 'Convert a detection for "portable executable downloaded" into a behavior-anchored rule.',
        hint: 'Ask what the download implies the parent process was doing.',
        check: {
          question: 'Why write detections against observables rather than specific payloads?',
          answer: 'Because tooling and payloads change constantly while attacker behavior is far slower to change.',
          explanation: 'Signature-based rules decay within weeks; behavior-based rules stay valid for years.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-blue-02-ir',
        title: 'Incident response process',
        durationMinutes: 60,
        level: 'Advanced',
        summary: 'Contain first, understand second, and preserve evidence throughout.',
        body: 'The response order matters more than the response tools. Detect, then contain to stop the spread, then eradicate and recover, then review. Containment before eradication is deliberate: pulling a box out of a network preserves evidence and stops lateral movement at once. Keep a single incident lead for decision rights, keep a running log of every action, and preserve evidence in the same incident so you can explain the timeline afterwards.',
        keyPoints: [
          'Detect, contain, eradicate, recover, review - in order.',
          'Contain before eradicate to preserve evidence and stop spread.',
          'One incident lead owns decision rights.',
        ],
        codeSample: "# IR runbook ordering\nPHASES = [\n    (\"detect\",     \"confirm from multiple signals, open the incident\"),\n    (\"contain\",    \"isolate scope; preserve evidence before touching state\"),\n    (\"eradicate\",  \"remove the foothold only after containment holds\"),\n    (\"recover\",    \"restore from known-good state, then verify\"),\n    (\"review\",     \"blameless post-mortem with dated action items\"),\n]",
        exercise: 'You have confirmed data exfiltration in progress. What is your first action, and why?',
        hint: 'Decide what you need to stop versus what you need to preserve.',
        check: {
          question: 'Why contain an incident before attempting eradication?',
          answer: 'Because containment stops further spread and preserves evidence in place for the timeline.',
          explanation: 'Eradication rewrites the very state you would need to reconstruct how it happened.',
        },
        challengeId: null,
      },
      {
        id: 'cyber-blue-03-review',
        title: 'Post-incident review and hardening',
        durationMinutes: 50,
        level: 'Advanced',
        summary: 'A blameless review turns one incident into durable organizational change.',
        body: 'A post-mortem that names people produces a report that hides things. Frame every question around the system: what allowed this, what detection did not fire, what runbook step was missing. Assign each action a named owner and a date, then verify closure rather than trusting it - an open action item is an implicit permission to be vulnerable again. Feed the findings back into detection engineering, which closes the loop.',
        keyPoints: [
          'Ask about the system, never about the person.',
          'Every action item needs an owner and a date.',
          'Verify closure; do not trust the ticket status.',
        ],
        codeSample: "# Blameless post-mortem template\nPOSTMORTEM = {\n    \"what_happened\": \"factual timeline from logs\",\n    \"what_we_did_right\": \"containment and evidence handling\",\n    \"what_did_not_work\": \"detection gaps, runbook gaps\",\n    \"action_items\": [  # owner + date + verification\n        {\"item\": \"add service-SSH detection\", \"owner\": \"platform\", \"due\": \"next sprint\"},\n    ],\n}",
        exercise: 'List three questions a blameless review should ask about a missed detection.',
        hint: 'None of them should be answerable by a person\'s name.',
        check: {
          question: 'Why is blamelessness a technical requirement and not just a cultural preference?',
          answer: 'Because hiding information to avoid blame destroys the evidence a review needs to prevent recurrence.',
          explanation: 'Recurrence prevention depends on complete, unfiltered information.',
        },
        challengeId: null,
      },
    ],
  },
];

export function allCyberLessons(): Array<CyberLesson & { courseId: string; courseTitle: string }> {
  return CYBER_COURSES.flatMap((course) =>
    course.lessons.map((lesson) => ({ ...lesson, courseId: course.id, courseTitle: course.title }))
  );
}

export const CYBER_LESSON_TOTAL = allCyberLessons().length;

// ---------------------------------------------------------------------------
// Hands-on labs
// ---------------------------------------------------------------------------

export type LabDifficulty = 'Easy' | 'Intermediate' | 'Advanced';

export type LabExecution =
  | { kind: 'browser'; label: string }
  | { kind: 'guided'; label: string }
  | { kind: 'editor'; label: string; challengeId: string };

export type CyberLab = {
  id: string;
  title: string;
  difficulty: LabDifficulty;
  durationMinutes: number;
  environment: string;
  summary: string;
  objectives: string[];
  prerequisites: string[];
  execution: LabExecution;
};

export const CYBER_LABS: CyberLab[] = [
  {
    id: 'lab-password-strength',
    title: 'Password strength analyzer',
    difficulty: 'Easy',
    durationMinutes: 15,
    environment: 'Browser',
    summary: 'Measure a password against length, character classes and common patterns, then watch the feedback update as you type.',
    objectives: ['Interpret an entropy estimate', 'Identify which rule changes the grade', 'Explain why a dictionary hit dominates length'],
    prerequisites: ['Hashing versus password hashing'],
    execution: { kind: 'browser', label: 'Runs locally in your browser' },
  },
  {
    id: 'lab-hash-cracker',
    title: 'Hash cracker (educational XOR / MD5 demo)',
    difficulty: 'Intermediate',
    durationMinutes: 25,
    environment: 'Browser',
    summary: 'Recover a plaintext from a small candidate dictionary and see first-hand how quickly fast hashes fall.',
    objectives: ['Recover the key from a known prefix', 'Crack a hash against a dictionary', 'Explain why bcrypt would have held'],
    prerequisites: ['XOR, key recovery and stream ciphers'],
    execution: { kind: 'browser', label: 'Runs locally in your browser' },
  },
  {
    id: 'lab-packet-inspector',
    title: 'Network packet inspector (simulated)',
    difficulty: 'Intermediate',
    durationMinutes: 30,
    environment: 'Browser',
    summary: 'Walk a captured stream packet by packet: inspect flags, ports and payloads without touching a live network.',
    objectives: ['Read the TCP handshake in a capture', 'Spot a scan versus normal traffic', 'Extract a payload from a stream'],
    prerequisites: ['Reading packet captures', 'Ports, services and reconnaissance'],
    execution: { kind: 'browser', label: 'Simulated capture, no network access' },
  },
  {
    id: 'lab-sql-injection',
    title: 'SQL injection trainer (safe local environment)',
    difficulty: 'Advanced',
    durationMinutes: 35,
    environment: 'Browser',
    summary: 'Inject against an in-page sandbox database, then repair the same code with bound parameters and verify the fix.',
    objectives: ['Demonstrate a login bypass', 'Show why a blocklist fails', 'Rewrite with parameterised queries and verify'],
    prerequisites: ['Injection and parameterised queries'],
    execution: { kind: 'browser', label: 'In-memory sandbox, no database server' },
  },
  {
    id: 'lab-xss',
    title: 'XSS demonstration lab',
    difficulty: 'Advanced',
    durationMinutes: 30,
    environment: 'Browser',
    summary: 'See reflected input rendered as code and as text side by side, then confirm the encoded path is inert.',
    objectives: ['Observe a payload executed in an unencoded sink', 'Verify encoding defeats it in the same sink', 'Explain the CSP second layer'],
    prerequisites: ['CSRF and cross-site scripting'],
    execution: { kind: 'browser', label: 'Sandboxed iframe only' },
  },
  {
    id: 'lab-xor-recovery',
    title: 'XOR key recovery workshop',
    difficulty: 'Intermediate',
    durationMinutes: 45,
    environment: 'EnginX editor',
    summary: 'Work through the real evaluated XOR recovery challenge in the code workspace and submit a verified solution.',
    objectives: ['Convert hex to bytes and back', 'Recover a key from known plaintext', 'Submit a passing solution to the evaluator'],
    prerequisites: ['XOR, key recovery and stream ciphers'],
    execution: { kind: 'editor', label: 'Opens the evaluated challenge', challengeId: 'cyber-01-xor-cipher-decrypt' },
  },
];

// ---------------------------------------------------------------------------
// CTF challenges
// ---------------------------------------------------------------------------

export type CyberCtf = {
  id: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: 'Cryptography' | 'Web Exploitation' | 'Forensics' | 'Reverse Engineering';
  categoryDetail: string;
  summary: string;
  xpReward: number;
  tags: string[];
  hints: string[];
  flag: string;
  challengeId: string | null;
  briefing: string;
};

export const CTF_CATEGORIES = [
  'Cryptography',
  'Web Exploitation',
  'Forensics',
  'Reverse Engineering',
] as const;

export const CTF_CHALLENGES: CyberCtf[] = [
  {
    id: 'ctf-xor-key-recovery',
    title: 'Cryptographic XOR Key Recovery',
    difficulty: 'Medium',
    category: 'Cryptography',
    categoryDetail: 'Symmetric / stream cipher',
    summary: 'Recover a single-byte XOR key from a known flag prefix and decrypt the captured payload.',
    xpReward: 100,
    tags: ['XOR', 'Known plaintext', 'Hex'],
    briefing: 'A recovered payload is XORed with a repeating single-byte key. All flags begin with ENGINX{ - use that known prefix.',
    hints: [
      'XOR is its own inverse, so the same key encrypts and decrypts.',
      'key = ciphertext[0] ^ ord("E")',
    ],
    flag: 'ENGINX{x0r_c1ph3r_cr4ck3d}',
    challengeId: 'cyber-01-xor-cipher-decrypt',
  },
  {
    id: 'ctf-weak-hash',
    title: 'Weak Hash Crackdown',
    difficulty: 'Easy',
    category: 'Cryptography',
    categoryDetail: 'Hashing',
    summary: 'Crack an unsalted fast hash against a short dictionary, then explain what bcrypt would have changed.',
    xpReward: 50,
    tags: ['Hashing', 'Dictionary attack', 'Salting'],
    briefing: 'A credential store leaked with unsalted SHA-1 values. One account used a memorable password.',
    hints: [
      'The dictionary is deliberately small - try every candidate.',
      'An unsalted hash of a memorable password is a dictionary lookup.',
    ],
    flag: 'ENGINX{n0_salt_1s_n0_5afty}',
    challengeId: null,
  },
  {
    id: 'ctf-sqli-auth-bypass',
    title: 'SQL Injection Authentication Bypass',
    difficulty: 'Medium',
    category: 'Web Exploitation',
    categoryDetail: 'Injection',
    summary: 'Bypass a login form whose lookup is built by string concatenation instead of bound parameters.',
    xpReward: 80,
    tags: ['SQLi', 'Authentication', 'Bypass'],
    briefing: 'The login handler interpolates the username directly into a SELECT. Find the input that always evaluates true.',
    hints: [
      'You need the WHERE clause to be true without knowing a password.',
      'A trailing comment hides the password predicate.',
    ],
    flag: 'ENGINX{1nj3ct10n_4l1wn35}',
    challengeId: null,
  },
  {
    id: 'ctf-idor-enumeration',
    title: 'IDOR Progress Enumeration',
    difficulty: 'Medium',
    category: 'Web Exploitation',
    categoryDetail: 'Broken access control',
    summary: 'Enumerate another learner\'s records by iterating resource ids that skip the ownership check.',
    xpReward: 80,
    tags: ['IDOR', 'Access control', 'Enumeration'],
    briefing: 'A progress endpoint takes a resource id from the URL and trusts the authenticated token alone.',
    hints: [
      'The endpoint never compares the owner to the caller.',
      'Iterate ids 1..N and watch which ones respond 200.',
    ],
    flag: 'ENGINX{pr0gr355_4cc355}',
    challengeId: null,
  },
  {
    id: 'ctf-csrf-session',
    title: 'Forged Cross-Origin Request',
    difficulty: 'Hard',
    category: 'Web Exploitation',
    categoryDetail: 'CSRF',
    summary: 'Forge a state-changing request against a cookie-authenticated endpoint that ignores the Origin header.',
    xpReward: 120,
    tags: ['CSRF', 'Cookies', 'Origin'],
    briefing: 'A state-changing POST authenticates with cookies only and never validates Origin. The victim is already logged in.',
    hints: [
      'GET-based forms travel with cookies automatically.',
      'Origin validation would have blocked this entirely.',
    ],
    flag: 'ENGINX{forg3d_r3qu3st}',
    challengeId: null,
  },
  {
    id: 'ctf-flag-forensics',
    title: 'Flag Recovery from a Captured Payload',
    difficulty: 'Hard',
    category: 'Forensics',
    categoryDetail: 'Traffic analysis',
    summary: 'Recover a flag from a captured stream by correlating a timestamped timeline and confirming the artifact hash.',
    xpReward: 150,
    tags: ['Forensics', 'Timeline', 'Hashing'],
    briefing: 'A capture shows a brief high-volume burst followed by a connection teardown. The flag rode inside the burst.',
    hints: [
      'Sort by timestamp and look at what happened in the burst window.',
      'Verify the recovered artifact hash before submitting.',
    ],
    flag: 'ENGINX{c4ptur3d_4nd_v3r1f13d}',
    challengeId: null,
  },
  {
    id: 'ctf-string-hunt',
    title: 'String Hunt in a Stub Binary',
    difficulty: 'Easy',
    category: 'Reverse Engineering',
    categoryDetail: 'Static analysis',
    summary: 'Recover a printable secret from a stub binary using string extraction and context reading.',
    xpReward: 60,
    tags: ['Static analysis', 'Strings', 'Entropy'],
    briefing: 'A tiny binary stores its secret as a plain literal. There is no obfuscation - only context to find.',
    hints: [
      'Dump printable strings and read what surrounds each candidate.',
      'The flag format makes the correct string obvious.',
    ],
    flag: 'ENGINX{str1ng5_f1r5t}',
    challengeId: null,
  },
  {
    id: 'ctf-xored-strings',
    title: 'Xored Strings',
    difficulty: 'Medium',
    category: 'Reverse Engineering',
    categoryDetail: 'Obfuscation',
    summary: 'Defend a string that was flattened by single-byte XOR to deter naive string dumps.',
    xpReward: 100,
    tags: ['Obfuscation', 'XOR', 'Strings'],
    briefing: 'Every literal in this binary is XORed with a single repeating key before encoding.',
    hints: [
      'Reuse the known-prefix trick from the cryptography category.',
      'The first byte of the flag is always E.',
    ],
    flag: 'ENGINX{0bfuscati0n_br0ken}',
    challengeId: null,
  },
];

// ---------------------------------------------------------------------------
// Progress badges
// ---------------------------------------------------------------------------

export interface CyberBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  condition: 'lessons' | 'ctf' | 'labs';
  threshold: number;
  xpBonus: number;
}

export const CYBER_BADGES: CyberBadge[] = [
  { id: 'cyber-first-steps', name: 'First Steps', icon: 'seedling', description: 'Complete your first security lesson.', condition: 'lessons', threshold: 1, xpBonus: 25 },
  { id: 'cyber-scholar', name: 'Security Scholar', icon: 'graduation', description: 'Complete five lessons across any domain.', condition: 'lessons', threshold: 5, xpBonus: 60 },
  { id: 'cyber-graduation', name: 'Curriculum Graduate', icon: 'award', description: 'Complete every lesson in the catalogue.', condition: 'lessons', threshold: CYBER_LESSON_TOTAL, xpBonus: 200 },
  { id: 'cyber-first-flag', name: 'First Flag', icon: 'flag', description: 'Solve your first CTF challenge.', condition: 'ctf', threshold: 1, xpBonus: 50 },
  { id: 'cyber-hunter', name: 'CTF Hunter', icon: 'target', description: 'Solve four CTF challenges.', condition: 'ctf', threshold: 4, xpBonus: 120 },
  { id: 'cyber-lab-hands', name: 'Hands On', icon: 'beaker', description: 'Finish three hands-on labs.', condition: 'labs', threshold: 3, xpBonus: 80 },
];

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

export interface CyberResource {
  title: string;
  provider: string;
  subject: string;
  url: string;
  note: string;
}

export const CYBER_RESOURCES: CyberResource[] = [
  { title: 'OWASP Top 10', provider: 'OWASP', subject: 'Web application risk', url: 'https://owasp.org/www-project-top-ten/', note: 'The shared vocabulary for the most consequential web risks; use it to rank findings, not as a checklist.' },
  { title: 'OWASP Web Security Testing Guide', provider: 'OWASP', subject: 'Testing methodology', url: 'https://owasp.org/www-project-web-security-testing-guide/', note: 'Concrete test procedures per risk class. Read the methodology section before adopting any single technique.' },
  { title: 'NIST Cybersecurity Framework', provider: 'NIST', subject: 'Governance & risk', url: 'https://www.nist.gov/cyberframework', note: 'A language for describing what you protect and how, useful for turning lessons into an organizational plan.' },
  { title: 'MITRE ATT&CK', provider: 'MITRE', subject: 'Adversary behavior', url: 'https://attack.mitre.org/', note: 'Behavior-based technique taxonomy. Detections written against ATT&CK techniques stay valid as tools change.' },
  { title: 'Python cryptography documentation', provider: 'cryptography.io', subject: 'Applied cryptography', url: 'https://cryptography.io/en/latest/', note: 'Reference for the primitives used in the cryptography lessons; prefer these APIs over hand-rolled constructions.' },
  { title: 'SANS DFIR Resources', provider: 'SANS', subject: 'Digital forensics', url: 'https://www.sans.org/forensics/', note: 'Evidence handling and investigation material. Use as a reference, and check current licensing before distributing.' },
  { title: 'CWE Top 25', provider: 'MITRE', subject: 'Software weaknesses', url: 'https://cwe.mitre.org/top25/', note: 'Categorises weaknesses by cause rather than symptom - the right frame for remediation advice in reports.' },
  { title: 'Nmap reference guide', provider: 'Nmap', subject: 'Reconnaissance', url: 'https://nmap.org/book/', note: 'Scan behavior and interpretation. Understanding what a scan outputs is as important as knowing what it flags.' },
];
