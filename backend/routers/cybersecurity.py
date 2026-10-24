"""Cybersecurity Hub API: courses, lessons, labs, CTF challenges and progress.

Design notes
------------

Course, lesson, lab and CTF *catalogue* content is static reference data and is
served from the in-memory catalogues below rather than new database tables.
Adding four ORM tables (courses, lessons, labs, ctf_challenges) plus a
migration would touch ``models.py``, ``seed_data.py``, ``database.py`` and
``main.py``; nothing here needs that.  Lesson *completions* are the only
per-user mutable state and they reuse the existing ``lesson_completions``
table that ``routers/profile.py`` already writes to.  Completion ids therefore
namespace cleanly with the ECE Hub's lesson ids because both sides write the
same ``LessonCompletion`` row shape.

Ownership
---------

The authenticated identity always comes from ``Depends(get_current_user)``.
It is never read from a request body or query string, so a caller cannot
complete a lesson "for" someone else by naming a user id.  The write endpoint
filters on ``LessonCompletion.user_id == current_user.id`` and the unique
constraint ``(user_id, lesson_id)`` makes the write idempotent.

Rate limiting
-------------

This module does not add a limiter: the stack has no shared rate-limit
dependency (see ``requirements.txt``) and no other router enforces one, so a
per-router limiter here would be the only one and would silently look like a
global policy.  The seams are marked with RATE LIMIT comments instead.  The
sensible global additions are:

  * GET catalogue endpoints      -> a high anonymous ceiling (e.g. 120/min per
                                    client IP); they are static content and the
                                    cost is the DB-independent dict lookup.
  * POST .../complete            -> low per-user ceiling (e.g. 10/min) to stop
                                    XP-farming by re-posting completions.  The
                                    endpoint is already idempotent, so a burst
                                    returns the same 200 rather than 500.
  * GET /progress, GET /stats    -> per-user ceiling (e.g. 60/min); both do a
                                    handful of indexed queries per call.

Wiring an actual limiter (e.g. ``slowapi`` with ``StatefulRateLimiter`` keyed
on ``request.client.host`` for anonymous routes and ``current_user.id`` for
authenticated ones) is a one-line decorator per endpoint once that dependency
is added project-wide.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import (
    Badge,
    Challenge,
    LessonCompletion,
    Submission,
    User,
    UserBadge,
    UserProgress,
)
from security import get_current_user


router = APIRouter(prefix="/api/cybersecurity", tags=["Cybersecurity Hub"])


# ---------------------------------------------------------------------------
# Catalogue content (static reference data)
# ---------------------------------------------------------------------------

# XP granted for finishing a whole course's lesson set.  Kept separate from the
# lesson count so a course can carry extra credit for its capstone lab.
_COURSE_CATALOGUE: List[Dict[str, Any]] = [
    {
        "id": "cyber-foundations",
        "title": "Security Fundamentals",
        "slug": "security-fundamentals",
        "level": "Foundation",
        "estimated_hours": 6,
        "summary": "Threat modelling, the CIA triad, defence in depth and the mindset that turns configuration review into a habit.",
        "topics": ["Threat modelling", "CIA triad", "Defence in depth", "Secure SDLC"],
        "lessons": [
            {
                "id": "cyber-foundations-01-threat-model",
                "title": "Threat modelling from the outside in",
                "duration_minutes": 45,
                "level": "Foundation",
                "summary": "Name the assets, the actors and the paths before you write a mitigation.",
                "body": "Threat modelling is an inventory of trust boundaries, not a list of attacks. Pick an asset (credentials, session tokens, exported datasets), write down who can touch it and through which interface, then rank the paths by blast radius rather than by how scary the exploit looks. The STRIDE categories are useful prompts for coverage, but the output you care about is a short ranked table that a reviewer can act on.",
                "key_points": [
                    "Start from assets and data flows, not from a vulnerability list.",
                    "Every trust boundary is a candidate defence point.",
                    "Rank by blast radius and exploitability, not by alarm.",
                ],
                "code_sample": "# Data flow sketch: enumerate trust boundaries\n"
                                "boundary = {\n"
                                "    \"client\": \"browser\",          # untrusted\n"
                                "    \"edge\":   \"reverse proxy\",    # semi-trusted\n"
                                "    \"api\":    \"application server\",# trusted zone\n"
                                "    \"store\":  \"database\",         # trust boundary: query layer\n"
                                "}\n"
                                "print(boundary[\"store\"])",
                "exercise": "Draw the request path from browser to database for a login form and label each trust boundary.",
                "hint": "The proxy, the application and the database are three different boundaries even if they share a host.",
                "assessment": {
                    "question": "Which threat-modeling question should be answered before choosing mitigations?",
                    "answer": "Which assets exist and through which paths can they be reached?",
                    "explanation": "Mitigations are only meaningful relative to an identified asset and a path to it.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-foundations-02-principle-of-least-privilege",
                "title": "Least privilege and defence in depth",
                "duration_minutes": 40,
                "level": "Foundation",
                "summary": "Scope permissions to the task and assume every layer can fail.",
                "body": "Least privilege means granting the smallest permission that lets the task succeed, at the narrowest scope, for the shortest time. Defence in depth means you still lose if any one layer fails. Combine them: a service account that can read the logs it needs but not write the database means a shell there is a dead end instead of full compromise.",
                "key_points": [
                    "Scope to the task, not to the role title.",
                    "Prefer read-only where read-only is sufficient.",
                    "Assume every layer will eventually be bypassed.",
                ],
                "code_sample": "# Capability check: allow only what the task needs\n"
                                "GRANTS = {\"backup-job\": {\"logs\": \"read\", \"db\": \"none\"}}\n"
                                "\n"
                                "def allowed(principal: str, resource: str, action: str) -> bool:\n"
                                "    return GRANTS.get(principal, {}).get(resource) == action\n"
                                "\n"
                                "print(allowed(\"backup-job\", \"logs\", \"read\"))   # True\n"
                                "print(allowed(\"backup-job\", \"db\", \"write\"))    # False",
                "exercise": "A weekly report job needs to read the orders table. What is the smallest grant set?",
                "hint": "It needs SELECT on that one table, not a superuser login.",
                "assessment": {
                    "question": "Why is least privilege still paired with defence in depth?",
                    "answer": "Least privilege limits the damage; defence in depth assumes the boundary was bypassed anyway.",
                    "explanation": "They answer different questions: how much to grant, and what survives a grant being violated.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-foundations-03-secure-by-default",
                "title": "Secure by default",
                "duration_minutes": 35,
                "level": "Foundation",
                "summary": "Make the default configuration the safe one so forgetting cannot ship a hole.",
                "body": "Secure by default means shipping safe values and requiring an explicit, reviewed opt-out. A debug flag that defaults to true and a wildcard CORS origin both fail open: the risk only shows when someone forgets. Invert it, and the incident becomes impossible to reach by omission.",
                "key_points": [
                    "Defaults should fail closed, never fail open.",
                    "Log every opt-out so it can be audited.",
                    "Treat insecure defaults as a regression test.",
                ],
                "code_sample": "# Safe-by-default settings: insecure values must be opt-in\n"
                                "class SecurityDefaults:\n"
                                "    debug = False\n"
                                "    allowed_origins = (\"https://app.enginx.example\",)\n"
                                "    require_tls = True\n"
                                "\n"
                                "    def validate(self) -> None:\n"
                                "        assert self.require_tls, \"TLS must not be disabled\"\n"
                                "        assert \"*\" not in self.allowed_origins, \"wildcard CORS is forbidden\"",
                "exercise": "Rewrite a configuration that defaults to debug=true so that it fails closed.",
                "hint": "The assert belongs in a validate() that runs at startup, not in a handler.",
                "assessment": {
                    "question": "What makes a default 'fail open'?",
                    "answer": "It permits the insecure behaviour when nobody explicitly configures it.",
                    "explanation": "Omission is the most common way insecure settings reach production.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
        ],
    },
    {
        "id": "cyber-web",
        "title": "Web Application Security",
        "slug": "web-application-security",
        "level": "Intermediate",
        "estimated_hours": 9,
        "summary": "Injection, broken auth, session handling and the input/output discipline that closes most OWASP Top 10 classes.",
        "topics": ["Injection", "Broken access control", "Session management", "OWASP Top 10"],
        "lessons": [
            {
                "id": "cyber-web-01-injection",
                "title": "Injection and parameterised queries",
                "duration_minutes": 60,
                "level": "Intermediate",
                "summary": "Treat every string crossing a boundary as data, never as a query.",
                "body": "Injection happens when untrusted text changes the structure of a command, whether that is SQL, shell, LDAP or an ORM filter built by string concatenation. Parameterised queries keep data and structure separate: the driver quotes and types the value, so no amount of user text becomes syntax. Where parameters are impossible, use an allowlist on the shape of the input, never a blocklist of bad characters.",
                "key_points": [
                    "Bind parameters; never concatenate user input into SQL.",
                    "Allowlists beat blocklists for validation.",
                    "Injection is not limited to SQL, it is a class of bugs.",
                ],
                "code_sample": "# BAD: concatenation turns user input into query syntax\n"
                                "#   cursor.execute(f\"SELECT * FROM users WHERE email = '{email}'\")\n"
                                "\n"
                                "# GOOD: the driver separates data from structure\n"
                                "def find_user(cursor, email: str):\n"
                                "    cursor.execute(\n"
                                "        \"SELECT id, email, xp FROM users WHERE email = ?\",\n"
                                "        (email,),\n"
                                "    )\n"
                                "    return cursor.fetchone()",
                "exercise": "A search box filters by name. Write the parameterised query and state what an attacker's input can and cannot change.",
                "hint": "The value can change which rows match, but not which columns are returned.",
                "assessment": {
                    "question": "Why does a blocklist on quotes fail to prevent SQL injection?",
                    "answer": "Because encoding and context differ per target, so omitted characters are always available.",
                    "explanation": "Only keeping data out of the syntax position is robust.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-web-02-authn-authz",
                "title": "Authentication versus authorisation",
                "duration_minutes": 55,
                "level": "Intermediate",
                "summary": "Proving who you are and deciding what you may do are two different checks.",
                "body": "Authentication answers 'who is this request from'; authorisation answers 'is that identity permitted here'. Most access-control bugs come from doing the first without the second, or from trusting a client-supplied id. The server must derive the principal from a signed token and then re-check ownership server-side for every resource id in the URL.",
                "key_points": [
                    "Never trust a user id arriving in the request body.",
                    "Filter by the token's principal AND the resource id.",
                    "Return 404 rather than 403 when ownership is unknown.",
                ],
                "code_sample": "# The principal comes from the token, never from the client.\n"
                                "def _owned_or_404(db, resource_id: str, current_user) -> object:\n"
                                "    row = db.query(Resource).filter(\n"
                                "        Resource.id == resource_id,\n"
                                "        Resource.owner_id == current_user.id,\n"
                                "    ).first()\n"
                                "    if row is None:\n"
                                "        # Do not reveal whether another user owns this id.\n"
                                "        raise LookupError(\"not found\")\n"
                                "    return row",
                "exercise": "Write the ownership filter for a POST that marks a lesson complete.",
                "hint": "Match both user_id == current_user.id and lesson_id == path_id.",
                "assessment": {
                    "question": "What is the difference between authentication and authorisation?",
                    "answer": "Authentication establishes identity; authorisation grants or denies an action for that identity.",
                    "explanation": "A valid token with a resource someone else owns must still be rejected.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-web-03-csrf-xss",
                "title": "CSRF and cross-site scripting",
                "duration_minutes": 50,
                "level": "Intermediate",
                "summary": "Block forged cross-origin requests and stop reflected content from becoming code.",
                "body": "CSRF exploits the browser's willingness to attach cookies to cross-origin requests; a state-changing route needs a secret the attacker's page cannot read, which modern APIs get from the Authorization header rather than cookies. XSS happens when output is rendered as HTML, script or an event handler instead of text; encode for the exact sink you are writing into and set a strict Content-Security-Policy.",
                "key_points": [
                    "Bearer tokens in headers are not sent cross-origin, which defeats CSRF.",
                    "Validate the Origin header on cookie-authenticated state changes.",
                    "Encode output per sink: text, attribute, JavaScript, URL.",
                ],
                "code_sample": "# CSRF check for a cookie-authenticated state change\n"
                                "def origin_ok(requested: str, allowed: str) -> bool:\n"
                                "    return requested.strip().lower() == allowed.strip().lower()\n"
                                "\n"
                                "# CSP: allow only our bundle, no inline script\n"
                                "CSP = \"default-src 'self'; script-src 'self'; object-src 'none'\"",
                "exercise": "Which header should you validate on a POST that sets a cookie, and why?",
                "hint": "The Origin header; the cookie rides along automatically otherwise.",
                "assessment": {
                    "question": "Why does using an Authorization bearer header reduce CSRF risk?",
                    "answer": "Because the browser does not attach it to cross-origin requests.",
                    "explanation": "CSRF needs the credential to travel without the attacker's knowledge.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
        ],
    },
    {
        "id": "cyber-crypto",
        "title": "Cryptography for Practitioners",
        "slug": "cryptography-for-practitioners",
        "level": "Intermediate",
        "estimated_hours": 8,
        "summary": "Symmetric versus asymmetric cryptography, hashing, hashing for passwords and the mistakes that make strong primitives look weak.",
        "topics": ["Symmetric keys", "Hashing", "Password hashing", "XOR & stream ciphers"],
        "lessons": [
            {
                "id": "cyber-crypto-01-xor-and-stream-ciphers",
                "title": "XOR, key recovery and stream ciphers",
                "duration_minutes": 55,
                "level": "Intermediate",
                "summary": "XOR is its own inverse, which makes it both the basis of stream ciphers and a favourite CTF entry point.",
                "body": "XOR has one property worth memorising: a XOR b XOR b equals a. A repeating-key XOR cipher therefore leaves the plaintext where the keystream repeats, and if you know even one byte of the plaintext you can recover the key byte at that position. This is exactly the attack in the CTF challenge: the flag prefix 'ENGINX{' is known plaintext, so ciphertext[0] XOR ord('E') is the key.",
                "key_points": [
                    "XOR is its own inverse: a ^ b ^ b == a.",
                    "Known plaintext recovers the keystream at that offset.",
                    "Never reuse a stream-cipher keystream.",
                ],
                "code_sample": "# Recover a repeating XOR key from known plaintext\n"
                                "def decrypt_xor_flag():\n"
                                "    hex_ciphertext = \"151e17191e280b05161643020f0502161c4300071e430205034d\"\n"
                                "    ct = bytes.fromhex(hex_ciphertext)\n"
                                "    prefix = b\"ENGINX{\"\n"
                                "    # key = ct[0] ^ ord('E')  -> 0x15 ^ 0x45 == 0x50 == 'P'\n"
                                "    key = ct[0] ^ ord(\"E\")\n"
                                "    return \"\".join(chr(b ^ key) for b in ct)\n"
                                "\n"
                                "print(decrypt_xor_flag())  # ENGINX{x0r_c1ph3r_cr4ck3d}",
                "exercise": "Given ct[0] = 0x15 and known plaintext 'E', compute the key and show the decryption loop.",
                "hint": "Use bytes.fromhex, then XOR every byte with the single recovered key.",
                "assessment": {
                    "question": "Why does XOR decryption work with the same key that encrypted?",
                    "answer": "Because XOR is its own inverse: a ^ b ^ b == a.",
                    "explanation": "Symmetry means one operation encrypts and decrypts, so a recovered key undoes the cipher directly.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-crypto-02-hash-versus-password-hash",
                "title": "Hashing versus password hashing",
                "duration_minutes": 50,
                "level": "Intermediate",
                "summary": "A fast hash proves integrity; a slow hash defends a stolen credential database.",
                "body": "SHA-256 is designed to be fast, which is fatal for password storage: an attacker with a leaked database can test billions of candidates a second. Password hashing must be deliberately slow and parameterised - bcrypt, scrypt or Argon2id - so cost can be raised as hardware improves. Also normalise the input before hashing; this project hashes a SHA-256 digest first, which is a deliberate pre-hash so long UTF-8 passwords stay under bcrypt's 72-byte input limit.",
                "key_points": [
                    "Use a slow, configurable-cost KDF for passwords.",
                    "A per-user salt defeats rainbow tables.",
                    "Pre-hash long passwords to respect bcrypt's 72-byte limit.",
                ],
                "code_sample": "# Pre-hash before bcrypt so long UTF-8 input cannot be truncated\n"
                                "import hashlib, bcrypt\n"
                                "\n"
                                "def _password_bytes(password: str) -> bytes:\n"
                                "    return hashlib.sha256(password.encode(\"utf-8\")).digest()\n"
                                "\n"
                                "def hash_password(password: str) -> str:\n"
                                "    return bcrypt.hashpw(_password_bytes(password), bcrypt.gensalt()).decode()\n"
                                "\n"
                                "def verify(password: str, stored: str | None) -> bool:\n"
                                "    if not stored:\n"
                                "        return False\n"
                                "    return bcrypt.checkpw(_password_bytes(password), stored.encode())",
                "exercise": "Explain why storing SHA-256(password) instead of bcrypt(password) is still unsafe.",
                "hint": "Consider how fast SHA-256 runs on a GPU.",
                "assessment": {
                    "question": "What property of a password hash function matters most against offline cracking?",
                    "answer": "Configurable slowness, so cost per guess can be raised over time.",
                    "explanation": "Speed is the attacker's friend; a slow KDF directly shrinks candidates tested.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-crypto-03-symmetric-vs-asymmetric",
                "title": "Symmetric and asymmetric cryptography",
                "duration_minutes": 45,
                "level": "Intermediate",
                "summary": "Choose by key-distribution problem, not by which algorithm is more impressive.",
                "body": "Symmetric ciphers share one secret key and are fast, which makes them right for bulk data. Asymmetric cryptography solves the key-distribution problem: anyone can encrypt to a public key, only the holder of the private key can decrypt. In practice you hybridise - encrypt data with a fresh symmetric key, then encrypt that key with the recipient's public key. TLS does this on every connection.",
                "key_points": [
                    "Symmetric: one shared key, fast, hard to distribute.",
                    "Asymmetric: key pairs, slow, solves distribution.",
                    "Hybrid encryption is how TLS actually works.",
                ],
                "code_sample": "# Hybrid pattern: bulk data under a symmetric key, key exchange asymmetric\n"
                                "class HybridEnvelope:\n"
                                "    def __init__(self, data_key: bytes, ciphertext: bytes, wrapped_key: bytes):\n"
                                "        self.data_key = data_key      # fresh symmetric key\n"
                                "        self.ciphertext = ciphertext  # encrypted with data_key\n"
                                "        self.wrapped_key = wrapped_key # encrypted to recipient public key\n"
                                "\n"
                                "    def parts(self) -> dict:\n"
                                "        return {\"size\": len(self.ciphertext), \"wrapped\": len(self.wrapped_key)}",
                "exercise": "Outline the three steps a sender performs to encrypt a file to a known recipient.",
                "hint": "Generate, encrypt the data, then wrap the key.",
                "assessment": {
                    "question": "Why do systems combine symmetric and asymmetric cryptography instead of using only asymmetric?",
                    "answer": "Because asymmetric operations are slow, so bulk data is encrypted symmetrically.",
                    "explanation": "Asymmetric cryptography handles key exchange; symmetric cryptography handles throughput.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
        ],
    },
    {
        "id": "cyber-ctf",
        "title": "CTF Hunting: Web and Crypto",
        "slug": "ctf-hunting",
        "level": "Advanced",
        "estimated_hours": 10,
        "summary": "Triage an unknown challenge, read web targets with curl and burp-style workflows, and chain crypto primitives into a working solve.",
        "topics": ["Triage", "Recon & enumeration", "Crypto solvers", "Chaining exploits"],
        "lessons": [
            {
                "id": "cyber-ctf-01-triage",
                "title": "Challenge triage and hypothesis",
                "duration_minutes": 40,
                "level": "Advanced",
                "summary": "Spend the first five minutes categorising the target so you attack the right surface.",
                "body": "Every CTF entry point has a shape: a box and a port, a URL, a file, a packet capture or a crypto blob. Identifying the class tells you the toolchain and the exploit budget. Write a one-line hypothesis before running a scanner; otherwise you will collect noise and misread the intended path. A wrong hypothesis is cheap if it is written down, because it is visible.",
                "key_points": [
                    "Classify the entry point before choosing tools.",
                    "Write a one-line hypothesis, then try to falsify it.",
                    "Budget time per hypothesis or you will loop on one dead end.",
                ],
                "code_sample": "# Triage checklist, run in order and stop at the first hit\n"
                                "TRIAGE = [\n"
                                "    (\"is a network host?\",     \"nmap -sV <host>\"),\n"
                                "    (\"is a web app?\",         \"curl -sI https://<host>\"),\n"
                                "    (\"is a file/forensics?\",  \"file artifact; binwalk artifact\"),\n"
                                "    (\"is crypto/patterns?\",   \"xxd artifact | head\"),\n"
                                "]",
                "exercise": "You are handed a hex blob and a note that flags start with 'ENGINX{'. Write your hypothesis.",
                "hint": "Known prefix plus a hex blob points at repeating-key XOR.",
                "assessment": {
                    "question": "Why write down a hypothesis before running a scanner?",
                    "answer": "So scanner output is evidence for or against it instead of a random inventory.",
                    "explanation": "Without a hypothesis, findings cannot be ranked and time is spent on noise.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-ctf-02-recon-and-persistence",
                "title": "Recon, notes and session hygiene",
                "duration_minutes": 45,
                "level": "Advanced",
                "summary": "Keep state on disk as you go; a CTF solved in a browser tab evaporates on logout.",
                "body": "Good hunting is durable: enumerate, then persist findings with timestamps so you can resume and so a teammate can verify your claims. Do not paste credentials into shell history, and keep a separate note of which tokens belong to which account. In this platform, progress is recorded server-side and your lesson completions persist across sessions, which is the same principle as keeping a lab writeup instead of a screenshot.",
                "key_points": [
                    "Record every finding with a timestamp and source.",
                    "Keep account tokens in a notes file, not in shell history.",
                    "Persist progress where an evaluator can verify it.",
                ],
                "code_sample": "# Durable notes: append, never overwrite\n"
                                "def append_note(path: str, tag: str, detail: str) -> None:\n"
                                "    with open(path, \"a\", encoding=\"utf-8\") as handle:\n"
                                "        handle.write(f\"[{tag}] {detail}\\n\")\n"
                                "\n"
                                "# append_note(\"/tmp/ctf-notes.txt\", \"recon\", \"port 80 open, nginx\")",
                "exercise": "Design a five-line note format that lets a teammate reproduce your finding.",
                "hint": "Include target, method, observation and the command that produced it.",
                "assessment": {
                    "question": "What is the risk of keeping CTF findings only in a browser session?",
                    "answer": "They are lost on logout or expiry and cannot be independently verified.",
                    "explanation": "Durable, timestamped notes make progress reviewable by someone else.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
            {
                "id": "cyber-ctf-03-chaining-exploits",
                "title": "Chaining primitives into a full solve",
                "duration_minutes": 60,
                "level": "Advanced",
                "summary": "A flag rarely comes from one primitive; learn to chain enumeration into escalation.",
                "body": "Most advanced challenges are compositions. You enumerate an endpoint, find a token in a debug response, use it to read another endpoint, and discover a crypto hint that unlocks the final blob. The discipline is to keep each primitive small and composable, and to write it so the next step consumes its output directly. The XOR recovery challenge is the end of exactly such a chain: the prefix hint is the primitive that turns a ciphertext into a flag.",
                "key_points": [
                    "Compose small primitives; do not write one big script.",
                    "Each step should emit the exact input the next step reads.",
                    "Validate each intermediate result before moving on.",
                ],
                "code_sample": "# Pipeline: each stage consumes the previous stage's output\n"
                                "def recover_key(ct: bytes, known_prefix: bytes) -> int:\n"
                                "    return ct[0] ^ known_prefix[0]\n"
                                "\n"
                                "def decrypt(ct: bytes, key: int) -> str:\n"
                                "    return \"\".join(chr(b ^ key) for b in ct)\n"
                                "\n"
                                "ct = bytes.fromhex(\"151e17191e280b05161643020f0502161c4300071e430205034d\")\n"
                                "print(decrypt(ct, recover_key(ct, b\"ENGINX{\"}))  # flag",
                "exercise": "Split the XOR solve into two functions and show each intermediate value.",
                "hint": "Print the key first, then decrypt; verify each on its own.",
                "assessment": {
                    "question": "Why prefer small composable primitives over one large exploit script?",
                    "answer": "Because each stage's output can be inspected and reused by later stages.",
                    "explanation": "Failures stay local and the chain survives when one primitive changes.",
                },
                "challenge_id": "cyber-01-xor-cipher-decrypt",
            },
        ],
    },
]

# Hands-on labs.  ``hands_on`` mirrors whether the lab drives a real evaluated
# challenge in the EnginX editor, which is the honest answer a UI needs.
LAB_CATALOGUE: List[Dict[str, Any]] = [
    {
        "id": "lab-xor-recovery",
        "title": "XOR Key Recovery Workshop",
        "difficulty": "Medium",
        "duration_minutes": 45,
        "environment": "Python 3.11",
        "summary": "Recover a repeating single-byte XOR key from known plaintext and decrypt the target flag.",
        "objectives": [
            "Convert a hex string to bytes and back.",
            "Recover a key from known plaintext using XOR symmetry.",
            "Print and verify the decrypted flag.",
        ],
        "prerequisites": ["cyber-crypto-01-xor-and-stream-ciphers"],
        "challenge_id": "cyber-01-xor-cipher-decrypt",
        "hands_on": True,
    },
    {
        "id": "lab-sql-guardrails",
        "title": "Parameterised Query Hardening",
        "difficulty": "Intermediate",
        "duration_minutes": 60,
        "environment": "Python 3.11 + SQLite",
        "summary": "Reproduce a concatenation-based lookup, then rewrite it so user input can only affect row selection.",
        "objectives": [
            "Demonstrate why f-string SQL is dangerous.",
            "Rewrite the query with bound parameters.",
            "Add an allowlist for a sortable column.",
        ],
        "prerequisites": ["cyber-web-01-injection"],
        "challenge_id": None,
        "hands_on": False,
    },
    {
        "id": "lab-password-hardening",
        "title": "Password Hashing Cost Benchmarks",
        "difficulty": "Intermediate",
        "duration_minutes": 50,
        "environment": "Python 3.11 + bcrypt",
        "summary": "Measure how bcrypt cost factors change verification time and pick a defensible default.",
        "objectives": [
            "Hash and verify a password with a chosen cost.",
            "Explain the pre-hash step for long UTF-8 passwords.",
            "Recommend a cost factor with measured justification.",
        ],
        "prerequisites": ["cyber-crypto-02-hash-versus-password-hash"],
        "challenge_id": None,
        "hands_on": False,
    },
    {
        "id": "lab-access-control",
        "title": "Ownership Checks on Every Id",
        "difficulty": "Intermediate",
        "duration_minutes": 55,
        "environment": "Python 3.11 + FastAPI",
        "summary": "Find and fix an IDOR by re-checking ownership server-side for every resource id in a URL.",
        "objectives": [
            "Reproduce an endpoint that trusts a client-supplied id.",
            "Add a combined principal-plus-resource filter.",
            "Return 404 instead of 403 for a foreign resource.",
        ],
        "prerequisites": ["cyber-web-02-authn-authz"],
        "challenge_id": None,
        "hands_on": False,
    },
    {
        "id": "lab-ctf-triage",
        "title": "Triage Drills on Unknown Entry Points",
        "difficulty": "Advanced",
        "duration_minutes": 70,
        "environment": "Python 3.11 + shell",
        "summary": "Run a timed triage pass: classify the target, write a hypothesis, then falsify it.",
        "objectives": [
            "Classify five kinds of entry points correctly.",
            "Write and falsify a one-line hypothesis.",
            "Chain two primitives into a verified solve.",
        ],
        "prerequisites": ["cyber-ctf-01-triage", "cyber-ctf-03-chaining-exploits"],
        "challenge_id": "cyber-01-xor-cipher-decrypt",
        "hands_on": True,
    },
]

# CTF challenges.  ``challenge_id`` links a card to a real evaluated challenge
# in the EnginX editor when one exists, so the UI can deep-link without the
# router fabricating runnable content.
CTF_CATALOGUE: List[Dict[str, Any]] = [
    {
        "id": "ctf-xor-key-recovery",
        "title": "Cryptographic XOR Key Recovery",
        "slug": "ctf-xor-cipher-recovery",
        "difficulty": "Medium",
        "category": "Cryptography",
        "category_detail": "Symmetric / Stream",
        "summary": "Recover a single-byte XOR key from a known flag prefix and decrypt a recovered payload.",
        "challenge_id": "cyber-01-xor-cipher-decrypt",
        "xp_reward": 100,
        "tags": ["Security", "CTF", "Cryptography", "XOR"],
        "solved": True,
    },
    {
        "id": "ctf-sqli-auth-bypass",
        "title": "SQL Injection Authentication Bypass",
        "slug": "ctf-sqli-auth-bypass",
        "difficulty": "Easy",
        "category": "Web",
        "category_detail": "Injection",
        "summary": "Bypass a login form whose lookup is built by string concatenation.",
        "challenge_id": None,
        "xp_reward": 60,
        "tags": ["Security", "CTF", "Web", "Injection"],
        "solved": False,
    },
    {
        "id": "ctf-idor-enumeration",
        "title": "IDOR Progress Enumeration",
        "slug": "ctf-idor-progress-enumeration",
        "difficulty": "Medium",
        "category": "Web",
        "category_detail": "Broken Access Control",
        "summary": "Enumerate another learner's progress by iterating resource ids without an ownership check.",
        "challenge_id": None,
        "xp_reward": 80,
        "tags": ["Security", "CTF", "Web", "Access Control"],
        "solved": False,
    },
    {
        "id": "ctf-weak-hash-crack",
        "title": "Weak Hash Crackdown",
        "slug": "ctf-weak-hash-crackdown",
        "difficulty": "Easy",
        "category": "Cryptography",
        "category_detail": "Hashing",
        "summary": "Crack an unsalted fast hash with a small dictionary and explain why bcrypt would have held.",
        "challenge_id": None,
        "xp_reward": 50,
        "tags": ["Security", "CTF", "Cryptography", "Hashing"],
        "solved": False,
    },
    {
        "id": "ctf-csrf-session",
        "title": "Forged Cross-Origin Request",
        "slug": "ctf-csrf-session",
        "difficulty": "Medium",
        "category": "Web",
        "category_detail": "CSRF",
        "summary": "Forge a state-changing request against a cookie-authenticated endpoint that ignores Origin.",
        "challenge_id": None,
        "xp_reward": 70,
        "tags": ["Security", "CTF", "Web", "CSRF"],
        "solved": False,
    },
    {
        "id": "ctf-flag-forensics",
        "title": "Flag Recovery from a Captured Payload",
        "slug": "ctf-flag-forensics",
        "difficulty": "Hard",
        "category": "Cryptography",
        "category_detail": "Crypto Analysis",
        "summary": "Chain a frequency-analysis primitive with key recovery to pull a flag out of captured traffic.",
        "challenge_id": None,
        "xp_reward": 150,
        "tags": ["Security", "CTF", "Cryptography", "Forensics"],
        "solved": False,
    },
]


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CyberLabResponse(BaseModel):
    """A hands-on lab card, with an optional link to a real evaluated challenge."""

    id: str
    title: str
    difficulty: str
    duration_minutes: int
    environment: str
    summary: str
    objectives: List[str]
    prerequisites: List[str]
    challenge_id: Optional[str] = None
    hands_on: bool = False


class CyberCTFChallengeResponse(BaseModel):
    """A CTF card.  ``challenge_id`` is null when no evaluated challenge exists."""

    id: str
    title: str
    slug: str
    difficulty: str
    category: str
    category_detail: str
    summary: str
    challenge_id: Optional[str] = None
    xp_reward: int
    tags: List[str]
    solved: bool


class CyberLessonContentResponse(BaseModel):
    """Full body of one lesson, plus the assessment used by the UI."""

    model_config = ConfigDict(extra="ignore")

    id: str
    course_id: str
    title: str
    duration_minutes: int
    level: str
    summary: str
    body: str
    key_points: List[str]
    code_sample: str
    exercise: str
    hint: str
    assessment_question: str
    assessment_answer: str
    assessment_explanation: str
    challenge_id: Optional[str] = None


class CyberLessonSummary(BaseModel):
    """Lesson card used inside a course listing."""

    id: str
    title: str
    duration_minutes: int
    level: str
    summary: str
    challenge_id: Optional[str] = None
    completed: bool = False


class CyberCourseResponse(BaseModel):
    """A course, optionally carrying the ordered lesson set."""

    id: str
    title: str
    slug: str
    level: str
    estimated_hours: int
    summary: str
    topics: List[str]
    lesson_count: int
    xp_reward: int = 0
    lessons: Optional[List[CyberLessonSummary]] = None


class CyberCourseListResponse(BaseModel):
    items: List[CyberCourseResponse]


class CyberLabListResponse(BaseModel):
    items: List[CyberLabResponse]


class CyberCTFListResponse(BaseModel):
    items: List[CyberCTFChallengeResponse]


class CyberLessonCompleteResponse(BaseModel):
    lesson_id: str
    completed: bool
    completed_at: datetime
    already_completed: bool = False
    xp_awarded: int = 0
    badges_earned: List[str] = Field(default_factory=list)
    course_progress: Optional[Dict[str, Any]] = None


class CyberProgressResponse(BaseModel):
    """The authenticated learner's course progress across the hub."""

    user_id: str
    name: str
    completed_lessons: List[str]
    total_lessons: int
    completed_count: int
    completion_percentage: float
    courses: List[Dict[str, Any]]
    current_streak_days: int


class CyberStatsResponse(BaseModel):
    """Aggregated learning statistics, including CTF standing."""

    user_id: str
    name: str
    role: str
    xp: int
    total_lessons: int
    completed_lessons: int
    completion_percentage: float
    ctf_solved: int
    ctf_total: int
    xp_from_courses: int
    badges_earned: List[str]
    completed_by_course: Dict[str, int]
    completed_by_level: Dict[str, int]
    last_completed_at: Optional[datetime]


# ---------------------------------------------------------------------------
# Catalogue accessors
# ---------------------------------------------------------------------------

def _lesson_entry(lesson: Dict[str, Any]) -> CyberLessonContentResponse:
    assessment = lesson.get("assessment", {})
    return CyberLessonContentResponse(
        id=lesson["id"],
        course_id=lesson["course_id"],
        title=lesson["title"],
        duration_minutes=lesson["duration_minutes"],
        level=lesson["level"],
        summary=lesson["summary"],
        body=lesson["body"],
        key_points=lesson["key_points"],
        code_sample=lesson["code_sample"],
        exercise=lesson["exercise"],
        hint=lesson["hint"],
        assessment_question=assessment["question"],
        assessment_answer=assessment["answer"],
        assessment_explanation=assessment["explanation"],
        challenge_id=lesson.get("challenge_id"),
    )


def _lesson_summaries(
    course: Dict[str, Any], completed_ids: set
) -> List[CyberLessonSummary]:
    return [
        CyberLessonSummary(
            id=lesson["id"],
            title=lesson["title"],
            duration_minutes=lesson["duration_minutes"],
            level=lesson["level"],
            summary=lesson["summary"],
            challenge_id=lesson.get("challenge_id"),
            completed=lesson["id"] in completed_ids,
        )
        for lesson in course["lessons"]
    ]


def _course_card(
    course: Dict[str, Any],
    *,
    completed_ids: set,
    with_lessons: bool = False,
) -> CyberCourseResponse:
    return CyberCourseResponse(
        id=course["id"],
        title=course["title"],
        slug=course["slug"],
        level=course["level"],
        estimated_hours=course["estimated_hours"],
        summary=course["summary"],
        topics=course["topics"],
        lesson_count=len(course["lessons"]),
        xp_reward=course["xp_reward"],
        lessons=_lesson_summaries(course, completed_ids) if with_lessons else None,
    )


def _all_lessons() -> List[Dict[str, Any]]:
    """Flatten the catalogue into lessons annotated with their parent course.

    Returns shallow copies so callers can add annotations without mutating the
    module-level catalogue.
    """

    lessons: List[Dict[str, Any]] = []
    for course in _COURSE_CATALOGUE:
        for lesson in course["lessons"]:
            enriched = dict(lesson)
            enriched["course_id"] = course["id"]
            enriched["course_title"] = course["title"]
            enriched["xp_reward"] = course["xp_reward"]
            enriched.setdefault("level", course["level"])
            lessons.append(enriched)
    return lessons


def _lesson_by_id(lesson_id: str) -> Dict[str, Any]:
    for lesson in _all_lessons():
        if lesson["id"] == lesson_id:
            return lesson
    raise HTTPException(status_code=404, detail="Lesson not found")


def _course_by_id(course_id: str) -> Dict[str, Any]:
    for course in _COURSE_CATALOGUE:
        if course["id"] == course_id or course["slug"] == course_id:
            return course
    raise HTTPException(status_code=404, detail="Course not found")


def _user_completed_ids(current_user: User, db: Session) -> set:
    rows = db.query(LessonCompletion.lesson_id).filter(
        LessonCompletion.user_id == current_user.id,
    ).all()
    return {lesson_id for (lesson_id,) in rows}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/courses", response_model=CyberCourseListResponse)
def list_courses(
    level: Optional[str] = Query(default=None, description="Filter by level: Foundation, Intermediate, Advanced"),
    q: Optional[str] = Query(default=None, description="Search title, summary or topics"),
    limit: int = Query(default=50, ge=1, le=100),
):
    """List cybersecurity courses.

    Anonymous read. RATE LIMIT: give this a high per-client-IP ceiling (e.g.
    120/min); the payload is static and cheap.
    """

    items = []
    needle = q.strip().lower() if q else None
    wanted = level.strip() if level else None
    for course in _COURSE_CATALOGUE:
        if wanted and course["level"].lower() != wanted.lower():
            continue
        if needle:
            haystack = " ".join(
                [course["title"], course["summary"], " ".join(course["topics"])]
            ).lower()
            if needle not in haystack:
                continue
        items.append(_course_card(course, completed_ids=set()))

    return {"items": items[:limit]}


@router.get("/courses/{course_id}", response_model=CyberCourseResponse)
def get_course(course_id: str = Path(..., min_length=1, max_length=100)):
    """Get a course with its ordered lesson set.

    Anonymous read. RATE LIMIT: high per-client-IP ceiling (e.g. 120/min).
    """

    course = _course_by_id(course_id)
    return _course_card(course, completed_ids=set(), with_lessons=True)


@router.get("/lessons/{lesson_id}", response_model=CyberLessonContentResponse)
def get_lesson(lesson_id: str = Path(..., min_length=1, max_length=100)):
    """Get full lesson content, including its assessment.

    Anonymous read. RATE LIMIT: high per-client-IP ceiling (e.g. 120/min).
    """

    lesson = _lesson_by_id(lesson_id)
    return _lesson_entry(lesson)


@router.post(
    "/lessons/{lesson_id}/complete",
    response_model=CyberLessonCompleteResponse,
    status_code=status.HTTP_201_CREATED,
)
def complete_lesson(
    lesson_id: str = Path(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a lesson complete for the authenticated user.

    Authenticated write. The principal comes only from
    ``Depends(get_current_user)``; a caller cannot complete a lesson on behalf
    of another user because the write is keyed on ``current_user.id`` and the
    ``(user_id, lesson_id)`` unique constraint makes repeat posts idempotent.

    RATE LIMIT: keep this low per user (e.g. 10/min). It is idempotent, so a
    burst returns 200 rather than failing, but it should not be a free loop.
    """

    lesson = _lesson_by_id(lesson_id)

    existing = db.query(LessonCompletion).filter(
        LessonCompletion.user_id == current_user.id,
        LessonCompletion.lesson_id == lesson_id,
    ).first()
    if existing:
        # Re-post: report the winner's timestamp and award nothing again.
        return CyberLessonCompleteResponse(
            lesson_id=existing.lesson_id,
            completed=True,
            completed_at=existing.completed_at,
            already_completed=True,
            xp_awarded=0,
            course_progress=_course_progress(current_user, db, lesson),
        )

    completion = LessonCompletion(user_id=current_user.id, lesson_id=lesson_id)
    db.add(completion)
    try:
        db.commit()
    except IntegrityError:
        # Two tabs can complete the same lesson at once.  The unique constraint
        # makes the operation idempotent; return the winner's record instead of
        # surfacing a duplicate-key error.
        db.rollback()
        winner = db.query(LessonCompletion).filter(
            LessonCompletion.user_id == current_user.id,
            LessonCompletion.lesson_id == lesson_id,
        ).first()
        if winner:
            return CyberLessonCompleteResponse(
                lesson_id=winner.lesson_id,
                completed=True,
                completed_at=winner.completed_at,
                already_completed=True,
                xp_awarded=0,
                course_progress=_course_progress(current_user, db, lesson),
            )
        raise

    db.refresh(completion)
    db.refresh(current_user)

    badges_earned = _maybe_award_badges(current_user, db)
    return CyberLessonCompleteResponse(
        lesson_id=completion.lesson_id,
        completed=True,
        completed_at=completion.completed_at,
        already_completed=False,
        xp_awarded=lesson.get("xp_reward", 0),
        badges_earned=badges_earned,
        course_progress=_course_progress(current_user, db, lesson),
    )


@router.get("/labs", response_model=CyberLabListResponse)
def list_labs(
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty: Easy, Intermediate, Medium, Advanced"),
    hands_on: Optional[bool] = Query(default=None, description="Only labs backed by an evaluated challenge"),
):
    """List available cybersecurity labs.

    Anonymous read. RATE LIMIT: high per-client-IP ceiling (e.g. 120/min).
    """

    items = []
    for lab in LAB_CATALOGUE:
        if difficulty and lab["difficulty"].lower() != difficulty.strip().lower():
            continue
        if hands_on is not None and lab["hands_on"] is not hands_on:
            continue
        items.append(CyberLabResponse(**lab))
    return {"items": items}


@router.get("/ctf-challenges", response_model=CyberCTFListResponse)
def list_ctf_challenges(
    difficulty: Optional[str] = Query(default=None, description="Filter by difficulty: Easy, Medium, Hard"),
    category: Optional[str] = Query(default=None, description="Filter by category: Web, Cryptography"),
    limit: int = Query(default=50, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List CTF challenges.

    Anonymous by design: challenge cards are public.  ``solved`` reflects the
    calling user's progress and defaults to false, so an anonymous caller sees
    the same catalogue rather than a 401.

    RATE LIMIT: high per-client-IP ceiling (e.g. 120/min).
    """

    solved_ids = set()
    if current_user is not None:
        solved_ids = _solved_ctf_ids(current_user, db)

    items = []
    for card in CTF_CATALOGUE:
        if difficulty and card["difficulty"].lower() != difficulty.strip().lower():
            continue
        if category and card["category"].lower() != category.strip().lower():
            continue
        response = CyberCTFChallengeResponse(**card)
        response.solved = card["challenge_id"] in solved_ids if card["challenge_id"] else False
        items.append(response)
    return {"items": items[:limit]}


@router.get("/progress", response_model=CyberProgressResponse)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the authenticated user's cybersecurity progress.

    Authenticated read, scoped strictly to ``current_user.id``.  A caller cannot
    read another learner's progress because there is no user-id input here at
    all.  RATE LIMIT: per-user ceiling (e.g. 60/min).
    """

    completed_ids = _user_completed_ids(current_user, db)
    all_lessons = _all_lessons()
    total = len(all_lessons)
    done = len(completed_ids & {lesson["id"] for lesson in all_lessons})

    courses = []
    for course in _COURSE_CATALOGUE:
        course_ids = [lesson["id"] for lesson in course["lessons"]]
        course_done = len(completed_ids & set(course_ids))
        courses.append(
            {
                "id": course["id"],
                "title": course["title"],
                "level": course["level"],
                "lesson_count": len(course_ids),
                "completed_count": course_done,
                "completion_percentage": round(course_done / len(course_ids) * 100, 1)
                if course_ids
                else 0.0,
                "xp_awarded": course["xp_reward"] if course_done == len(course_ids) else 0,
                "lessons": [
                    {
                        "id": lesson["id"],
                        "title": lesson["title"],
                        "completed": lesson["id"] in completed_ids,
                    }
                    for lesson in course["lessons"]
                ],
            }
        )

    return CyberProgressResponse(
        user_id=current_user.id,
        name=current_user.name,
        completed_lessons=sorted(completed_ids),
        total_lessons=total,
        completed_count=done,
        completion_percentage=round(done / total * 100, 1) if total else 0.0,
        courses=courses,
        current_streak_days=current_user.streak_days,
    )


@router.get("/stats", response_model=CyberStatsResponse)
def get_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get cybersecurity learning statistics.

    Authenticated read. Combines course progress with CTF standing and earned
    badges.  RATE LIMIT: per-user ceiling (e.g. 60/min).
    """

    completed_ids = _user_completed_ids(current_user, db)
    all_lessons = _all_lessons()
    total = len(all_lessons)
    done = len(completed_ids & {lesson["id"] for lesson in all_lessons})

    completed_by_course: Dict[str, int] = {}
    completed_by_level: Dict[str, int] = {}
    xp_from_courses = 0
    for course in _COURSE_CATALOGUE:
        course_ids = [lesson["id"] for lesson in course["lessons"]]
        done_here = len(completed_ids & set(course_ids))
        completed_by_course[course["id"]] = done_here
        if done_here == len(course_ids) and course_ids:
            xp_from_courses += course["xp_reward"]
        for lesson in course["lessons"]:
            if lesson["id"] in completed_ids:
                level = lesson.get("level", course["level"])
                completed_by_level[level] = completed_by_level.get(level, 0) + 1

    solved_ids = _solved_ctf_ids(current_user, db)
    ctf_total = len(CTF_CATALOGUE)
    ctf_solved = sum(
        1 for card in CTF_CATALOGUE if card["challenge_id"] and card["challenge_id"] in solved_ids
    )

    earned_badges = db.query(UserBadge).filter(UserBadge.user_id == current_user.id).all()
    badges_earned = [
        badge.id
        for badge in earned_badges
        if db.query(Badge).filter(Badge.id == badge.badge_id).first() is not None
    ]

    last_rows = db.query(LessonCompletion.completed_at).filter(
        LessonCompletion.user_id == current_user.id,
    ).order_by(LessonCompletion.completed_at.desc()).limit(1).all()

    return CyberStatsResponse(
        user_id=current_user.id,
        name=current_user.name,
        role=current_user.primary_role,
        xp=current_user.xp,
        total_lessons=total,
        completed_lessons=done,
        completion_percentage=round(done / total * 100, 1) if total else 0.0,
        ctf_solved=ctf_solved,
        ctf_total=ctf_total,
        xp_from_courses=xp_from_courses,
        badges_earned=badges_earned,
        completed_by_course=completed_by_course,
        completed_by_level=completed_by_level,
        last_completed_at=last_rows[0][0] if last_rows else None,
    )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _course_progress(current_user: User, db: Session, lesson: Dict[str, Any]) -> Dict[str, Any]:
    """Return the parent course's progress after this completion."""

    completed_ids = _user_completed_ids(current_user, db)
    for course in _COURSE_CATALOGUE:
        course_ids = [l["id"] for l in course["lessons"]]
        if lesson["id"] in course_ids:
            done = len(completed_ids & set(course_ids))
            return {
                "course_id": course["id"],
                "title": course["title"],
                "completed_count": done,
                "lesson_count": len(course_ids),
                "completion_percentage": round(done / len(course_ids) * 100, 1),
                "course_complete": done == len(course_ids),
            }
    return {"course_id": lesson.get("course_id"), "completed_count": 0, "lesson_count": 0,
            "completion_percentage": 0.0, "course_complete": False}


def _solved_ctf_ids(current_user: User, db: Session) -> set:
    """Challenge ids the user has solved, from durable submission/progress rows."""

    progress_ids = {
        row[0]
        for row in db.query(UserProgress.challenge_id).filter(
            UserProgress.user_id == current_user.id,
            UserProgress.completed == True,  # noqa: E712 - SQLAlchemy boolean filter
        ).all()
    }
    submissions = db.query(Submission.challenge_id).filter(
        Submission.user_id == current_user.id,
        Submission.verdict == "AC",
    ).distinct().all()
    return progress_ids | {row[0] for row in submissions}


def _maybe_award_badges(current_user: User, db: Session) -> List[str]:
    """Award the cybersecurity discipline badge once the user has any progress.

    Awards exactly one badge type at most per call and is idempotent: an
    already-held badge is skipped, so repeat completions never double-award.
    No XP is added here because the existing badge-awarding path is responsible
    for that; mutating ``user.xp`` in a lesson-completion handler would bypass
    the rest of the platform's XP accounting.
    """

    earned = {
        badge[0]
        for badge in db.query(UserBadge.badge_id).filter(
            UserBadge.user_id == current_user.id
        ).all()
    }
    awarded: List[str] = []

    candidates = db.query(Badge).filter(
        Badge.discipline == "cybersecurity"
    ).order_by(Badge.xp_bonus.asc()).all()
    for badge in candidates:
        if badge.id in earned:
            continue
        criteria = badge.criteria or {}
        required = int(criteria.get("completed", 0) or 0)
        query = db.query(UserProgress).join(Challenge).filter(
            UserProgress.user_id == current_user.id,
            UserProgress.completed == True,  # noqa: E712 - SQLAlchemy boolean filter
            Challenge.discipline == criteria.get("discipline", badge.discipline),
        )
        done = query.count()
        if done >= required and required > 0:
            now = datetime.utcnow()
            db.add(UserBadge(user_id=current_user.id, badge_id=badge.id, awarded_at=now))
            db.commit()
            awarded.append(badge.id)
            break  # one badge per completion; avoid surprise multi-awards
    return awarded


__all__ = ["router"]
