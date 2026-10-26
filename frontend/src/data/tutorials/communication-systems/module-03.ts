import type { TutorialLesson } from '../types';

export const module03Lessons: TutorialLesson[] = [
  {
    id: 'com-m03-l1',
    title: 'Why Errors Happen: BER, Parity and Checksums',
    summary:
      'The cheapest defences first: the bit error rate as a design currency, single-bit parity computed on a real byte, and the sum-based checksum used by real protocols.',
    objectives: [
      'Define BER and reason about its consequences at link scale.',
      'Compute even and odd parity for a byte by hand.',
      'Compute and verify a modular-sum checksum for a short frame.',
      'State precisely what parity and checksums can and cannot detect.',
    ],
    whyItMatters:
      'Parity guards every UART byte you will ever transmit, and checksum-style sums guard firmware images and protocol frames everywhere. They cost almost nothing and catch a surprising share of real errors — provided you know exactly which errors they miss, which is the honest core of this lesson.',
    prerequisites: [
      'com-m01-l3 (SNR as the source of errors)',
      'Binary and hex arithmetic',
    ],
    explanation:
      '### The bit error rate\n\nA link\'s quality bottoms out in one number: the **bit error rate (BER)** — the fraction of transmitted bits received wrongly. A good wired link runs at 1e-12 or better; a marginal wireless link at 1e-3 is nearly useless without coding. BER connects to everything in this course: it falls exponentially as SNR rises, and every scheme in module 02 sits at a different point on that curve. Scale intuition: at BER 1e-6, a 1 Mbit/s stream suffers about one error per second — fine for compressed video, fatal for a firmware download, which is why downloads get error checking while voice might not.\n\n### Parity: one bit, one promise\n\nAppend a bit making the total number of 1s **even** (even parity) or **odd** (odd parity). Worked example, byte 0x53 = binary 0101 0011: it contains four 1s — already even, so the even-parity bit is **0**; the odd-parity bit would be **1**. The receiver recounts: any *single* flipped bit changes the count\'s parity and is caught. What it misses, precisely: any even number of flips (two errors cancel) and — the practical killer — it detects but cannot correct: the receiver knows *something* is wrong, not *where*. UART serial links use exactly this scheme, which is why a noisy UART line shows framing/parity errors rather than silently wrong bytes.\n\n### Checksums: a running sum\n\nA checksum adds all frame bytes (often keeping only the low 8 bits) and sends the sum; the receiver recomputes and compares. Worked example, bytes 0x12, 0x34, 0x56:\n\n```\n0x12 + 0x34 = 0x46;   0x46 + 0x56 = 0x9C   -> checksum 0x9C\n```\n\nIf 0x34 is corrupted to 0x35, the receiver\'s sum becomes 0x9D — mismatch, frame rejected. Checksums catch all single-byte errors and most multi-byte ones; they miss compensating errors (+1 on one byte, -1 on another) and any permutation of byte order (the sum ignores position). Real protocols layer stronger codes on top — the next lesson\'s CRC exists because of exactly these holes.',
    deepDive:
      '### The detection-versus-correction line\n\nParity and checksums are **error-detecting** codes: they say "reject this frame" and rely on a retry (ARQ — automatic repeat request). **Error-correcting** codes (Hamming, next lessons; Reed-Solomon in real systems) add enough redundancy to locate and repair errors without a return channel. The choice is economic: detection-plus-retry is cheap and perfect when a return path exists and latency is tolerable; correction is mandatory when the return path is expensive or slow — deep space (round trip hours), broadcast (no return at all), real-time audio (a retransmission would arrive too late). Every error-control design decision starts with that question: is there a cheap way to ask for a do-over?',
    examples: [
      {
        title: 'Parity computed bit by bit (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
byte = [0 1 0 1 0 0 1 1];    % 0x53 as a bit vector (MSB first)
ones_count = sum(byte);
p_even = mod(ones_count, 2); % 0 if already even
p_odd  = 1 - p_even;
fprintf('ones=%d even-parity bit=%d odd-parity bit=%d\\n', ...
        ones_count, p_even, p_odd);

% a single-bit flip breaks even parity:
flipped = byte; flipped(3) = 1 - flipped(3);   % 0x53 -> 0x5B
fprintf('flipped byte has ones=%d, even parity now %d\\n', ...
        sum(flipped), mod(sum(flipped), 2));`,
        explanation: [
          '0x53 = 0101 0011: counting the 1s gives 4.',
          'Even parity bit = 4 mod 2 = 0 (append nothing); odd parity bit = 1.',
          'Flipping bit 3 changes 0x53 to 0x5B (0101 1011): five 1s — odd, so an even-parity receiver now flags the error.',
          'Expected output, exactly:',
          'ones=4 even-parity bit=0 odd-parity bit=1',
          'flipped byte has ones=5, even parity now 1',
          'The second line is the whole detection story: the parity *changed*, so the error is noticed — but nothing indicates which bit flipped.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Error control options after a failed check',
        content:
          '  frame received\n        |\n        v\n   check passes? --yes--> deliver\n        |\n        no\n        |\n        v\n  +--------------------+     +---------------------------+\n  | ARQ: request       |     | FEC: correct locally      |\n  | retransmission     |     | (needs a stronger code)   |\n  | (needs return path |     | (works one-way, costs     |\n  |  + latency)        |     |  more redundant bits)     |\n  +--------------------+     +---------------------------+\n  parity/checksum support ARQ; Hamming/Reed-Solomon support FEC',
        caption:
          'Detection and correction are different contracts: detection says "throw it back", correction says "fix it here". The choice depends on the return path and the latency budget.',
      },
    ],
    tables: [
      {
        caption: 'What parity and checksums catch',
        headers: ['Error pattern', 'Parity (1 bit)', 'Modular-sum checksum'],
        rows: [
          ['Single bit flip', 'Detected', 'Detected'],
          ['Two bit flips in one byte', 'Missed', 'Detected (byte sum changes)'],
          ['Two bytes, +1 and -1', 'Missed', 'Missed (sum unchanged)'],
          ['Byte order swap', 'Missed', 'Missed (sum ignores position)'],
        ],
      },
      {
        caption: 'Checksum worked example',
        headers: ['Byte', 'Running sum'],
        rows: [
          ['0x12', '0x12'],
          ['0x34', '0x46'],
          ['0x56', '0x9C  (sent as checksum)'],
          ['receiver on intact frame', 'recomputes 0x9C: match'],
          ['receiver, 0x34 -> 0x35', 'recomputes 0x9D: mismatch, reject'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Believing parity "corrects" errors.',
        fix: 'Parity detects only: the receiver knows the frame is bad but not which bit is bad. Correction needs positional information — multiple parity equations over overlapping sets (the Hamming code of the next lessons).',
      },
      {
        mistake: 'Assuming a passed checksum proves the data is right.',
        fix: 'Checksums are probabilistic: compensating errors pass. A passed check means "consistent with no error under this code\'s model", never "proven correct" — which is why firmware verification uses cryptographic hashes when the threat model includes deliberate corruption.',
      },
      {
        mistake: 'Summing bytes without a defined width and overflow rule.',
        fix: 'The protocol defines the sum\'s width (8-bit, 16-bit, one\'s or two\'s complement wrap). A 16-bit internet-style sum and an 8-bit sum of the same frame differ; mixing conventions between sender and receiver defeats the check entirely.',
      },
    ],
    guidedPractice: {
      title: 'Parity and checksum by hand',
      brief:
        '(a) Compute the even-parity bit for 0xA7 (binary 1010 0111). (b) Compute the 8-bit checksum of bytes 0x2A, 0x11, 0x40. (c) State whether a two-bit error within one byte would be caught by each scheme.',
      expectedBehavior:
        '(a) 0xA7 has five 1s (odd) -> even-parity bit 1. (b) 0x2A + 0x11 = 0x3B; + 0x40 = 0x7B. (c) Two flips in one byte: parity misses (even count of flips); checksum catches it (the byte value changed).',
      hints: [
        'Count the 1s, then take the count modulo 2.',
        'Hex addition: 0x2A + 0x11 = 0x3B; then add 0x40.',
        'Parity sees only the total count of flips; the checksum sees byte values.',
      ],
    },
    practiceExercises: [
      {
        title: 'BER scale drill',
        brief:
          'A 2 Mbit/s link has BER 1e-7. Compute the expected number of bit errors per minute, and state whether a 12 MB firmware download over it (no other protection) is advisable.',
        expectedBehavior:
          '2e6 bit/s x 60 s = 1.2e8 bit/min; at 1e-7 BER: 12 errors per minute. A 12 MB download = 1e8 bits -> about 10 errors — fatal for an unprotected binary. The conclusion: layer stronger checking (the rest of this module) on top.',
        hints: [
          'Bits per minute = rate x 60.',
          'Errors = bits x BER.',
          'Twelve megabytes is 1e8 bits.',
        ],
      },
      {
        title: 'Find the hole in the checksum',
        brief:
          'Frame bytes: 0x10, 0x20, checksum 0x30. A burst corrupts them to 0x20, 0x20. Show that the checksum check still passes, and state what class of error this is.',
        expectedBehavior:
          'Corrupted sum: 0x20 + 0x20 = 0x40... vs received checksum: if the checksum byte itself was also corrupted to 0x40, the check passes with two wrong bytes — a compensating multi-byte error. This is exactly the hole CRCs (next lesson) close: they weight byte *position*, which position-blind sums ignore.',
        hints: [
          'The corruption includes the checksum byte.',
          'What property of the error does a plain sum fail to see?',
        ],
      },
    ],
    assessment: {
      title: 'BER, parity and checksums checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'The byte 0x53 (0101 0011) is sent with even parity. What parity bit is appended?',
          options: ['0', '1', '0x53', '8'],
          answer: '0',
          explanation:
            '0x53 contains four 1s — already even — so the even-parity bit is 0. (Odd parity would append 1.)',
          hint: 'Count the 1s first.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'The checksum of bytes 0x12, 0x34, 0x56 is...',
          options: ['0x9C', '0x46', '0x68', '0x64'],
          answer: '0x9C',
          explanation:
            '0x12 + 0x34 = 0x46; 0x46 + 0x56 = 0x9C.',
          hint: 'Add in hex, left to right.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A frame with two bit errors in the same byte always fails an even-parity check.',
          answer: 'false',
          explanation:
            'Two flips preserve the count\'s parity: even stays even. Parity detects exactly the odd number of flips per protected unit — its known, designed-in blind spot.',
          hint: 'What happens to the count of 1s?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one word: the error-control strategy that requests retransmission of a failed frame is called ______ (as opposed to forward error correction).',
          answer: 'ARQ',
          explanation:
            'Automatic Repeat reQuest: detect, discard, request a resend. It needs a return path and tolerates latency; FEC corrects without asking.',
          hint: 'Three letters.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'BER (bit error rate)', definition: 'Fraction of transmitted bits received incorrectly; the link\'s raw quality metric.' },
      { term: 'Parity bit', definition: 'One bit making the count of 1s even (or odd); detects odd numbers of flips, corrects nothing.' },
      { term: 'Checksum', definition: 'A running sum of frame bytes sent alongside them; detects most single-byte errors, misses compensating ones.' },
      { term: 'ARQ', definition: 'Automatic repeat request: detection plus retransmission on failure.' },
      { term: 'FEC', definition: 'Forward error correction: enough redundancy to repair errors locally, no return channel needed.' },
    ],
    revisionSummary: [
      'BER scales the pain: 1e-6 at 1 Mbit/s = one error per second.',
      'Parity: count the 1s, append the making-even bit; detects odd flips only.',
      'Checksums sum bytes position-blind; compensating errors pass.',
      'Detection (ARQ) versus correction (FEC) is decided by the return path and latency.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Parity bit', url: 'https://en.wikipedia.org/wiki/Parity_bit', kind: 'article' },
      { label: 'Wikipedia — Checksum', url: 'https://en.wikipedia.org/wiki/Checksum', kind: 'article' },
      { label: 'Wikipedia — Bit error rate', url: 'https://en.wikipedia.org/wiki/Bit_error_rate', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'com-m03-l2',
    title: 'CRC: Polynomial Division You Can Do by Hand',
    summary:
      'The workhorse integrity check of every real protocol: what a CRC actually computes, a complete CRC-3 division worked tap by tap, and why it beats a plain sum.',
    objectives: [
      'Describe a CRC as the remainder of polynomial division by a generator.',
      'Perform a full binary long division for a CRC-3 example and verify the check.',
      'Explain which error classes a CRC catches that a checksum misses.',
      'Choose between CRC strength and cost at a concept level (CRC-8/16/32).',
    ],
    whyItMatters:
      'CRCs guard every Ethernet frame (CRC-32), every CAN bus message, every zip file (CRC-32) and most firmware images. Unlike a sum, a CRC is position-aware and catches burst errors — the dominant real-world corruption class. The by-hand division here is the same computation the silicon performs with a shift register.',
    prerequisites: [
      'com-m03-l1 (parity, checksums, and their blind spots)',
      'XOR of bit patterns',
    ],
    explanation:
      '### The idea\n\nTreat the message as a binary polynomial (bit k = coefficient of x^k) and divide it, using XOR instead of subtraction, by a fixed **generator** polynomial. Send the message followed by the **remainder**. The receiver divides the whole thing by the same generator: a clean transmission leaves remainder zero.\n\nWorked example — generator x^3 + x + 1, written **1011** (a CRC-3: the remainder is 3 bits). Message: **1101**. Append three zeros (the remainder\'s width): dividend **1101000**.\n\n```\n1101000 (dividend)  1011 (divisor)\n1101                <- first 4 bits\n1011                <- divisor aligned, XOR\n----\n 0110               remainder so far; bring down next bit (0)\n 1100               \n 1011               XOR\n ----\n  0111              bring down 0\n  1110\n  1011              XOR\n  ----\n   0101             bring down 0\n   1010\n   1011             XOR\n   ----\n    001             no more bits: REMAINDER = 001\n```\n\nCRC = **001**. Transmitted frame: **1101 001**. Receiver check, dividing 1101001 by 1011:\n\n```\n1101 -> XOR 1011 -> 0110; bring down 0 -> 1100 -> XOR -> 0111\nbring down 0 -> 1110 -> XOR -> 0101; bring down 1 -> 1011 -> XOR -> 0000\nremainder = 000  -> frame accepted\n```\n\nEvery line above is a 4-bit XOR — the whole algorithm. Real CRCs (8, 16, 32 bits) do precisely this with wider registers, in hardware as a shift register with a few XOR taps.\n\n### Why this beats a sum\n\nThe division is **position-sensitive**: shifting the message left multiplies its polynomial by x, which changes the remainder. A burst of errors up to the generator\'s degree (long runs of corrupted bits — the dominant real corruption) is guaranteed caught by a well-chosen generator, and all odd numbers of bit errors are caught when the generator has (x+1) as a factor. Plain sums catch none of these classes reliably. The price: a chosen generator, a wider check field, and slightly more compute — trivial in hardware.',
    deepDive:
      '### From hand division to the shift register\n\nThe silicon implementation of the division above is a 3-bit register processed bit-serially: shift in each message bit; whenever the register\'s top bit is 1, XOR the generator\'s low taps into it. Following our example: start 000, feed 1,1,0,1,0,0,0 — the register state sequence ends at 001, the same remainder, in seven clock cycles regardless of message length. That equivalence — long division equals shift register equals table lookup — is why the same CRC appears as a textbook division, a Verilog always-block, and a `crc32` function, all agreeing bit for bit. When you meet CRC in the RTL courses, you are building exactly the shift-register view of this lesson\'s division.',
    examples: [
      {
        title: 'CRC-3 division and check, computed in GNU Octave',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% CRC-3: generator 1011 (x^3 + x + 1)
div = [1 0 1 1];

% --- encode: message 1101, append 3 zeros ---
aug = [1 1 0 1 0 0 0];
r = aug(1:4);
for k = 5:7
  if r(1) == 1
    r = xor(r, div);
  end
  r = [r(2:4) aug(k)];
end
if r(1) == 1
  r = xor(r, div);
end
fprintf('CRC of 1101 = %d%d%d\\n', r(2), r(3), r(4));

% --- check: transmitted frame 1101001 ---
aug2 = [1 1 0 1 0 0 1];
r2 = aug2(1:4);
for k = 5:7
  if r2(1) == 1
    r2 = xor(r2, div);
  end
  r2 = [r2(2:4) aug2(k)];
end
if r2(1) == 1
  r2 = xor(r2, div);
end
fprintf('check of 1101001 = %d%d%d%d\\n', r2(1), r2(2), r2(3), r2(4));`,
        explanation: [
          'The loop is the long division, one bit column per iteration: conditionally XOR the divisor, then shift in the next augmented-message bit.',
          'Encode trace (matches the hand division in the lesson): start 1101; XOR -> 0110, shift 0 -> 1100; XOR -> 0111, shift 0 -> 1110; XOR -> 0101, shift 0 -> 1010; final XOR -> 0001. Remainder bits: 001.',
          'Check trace: start 1101; XOR -> 0110, shift 0 -> 1100; XOR -> 0111, shift 0 -> 1110; XOR -> 0101, shift 1 -> 1011; final XOR -> 0000 — a clean zero remainder, frame accepted.',
          'Expected output, exactly:',
          'CRC of 1101 = 001',
          'check of 1101001 = 0000',
          'The leading-bit rule (only XOR when the top bit is 1) is what makes this the same operation as the pencil-and-paper division above.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'CRC-3 shift register (x^3 + x + 1)',
        content:
          '  input bit -->(+)---+---[b2]---+---[b1]---+---[b0]--> CRC out\n               ^     |          |          |\n               |     +----------|----------+      taps at b2 and b0\n               |                |                  (x^3 and x^1 terms)\n               +----------------+\n\n  each clock: shift all bits right; the feedback XORs the\n  top bit back into the taps -- one step of the long division.',
        caption:
          'The hardware CRC is the division drawn as a circuit: a shift register whose XOR taps mirror the generator polynomial. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'The worked division, step by step',
        headers: ['Step', 'Window', 'Action', 'Result'],
        rows: [
          ['1', '1101', 'XOR 1011 (top bit 1)', '0110'],
          ['2', 'bring down 0 -> 1100', 'XOR 1011', '0111'],
          ['3', 'bring down 0 -> 1110', 'XOR 1011', '0101'],
          ['4', 'bring down 0 -> 1010', 'XOR 1011', '0001 -> remainder 001'],
        ],
      },
      {
        caption: 'Error classes: sum versus CRC',
        headers: ['Error class', 'Plain sum', 'CRC (good generator)'],
        rows: [
          ['Any single bit', 'Detected', 'Detected'],
          ['Burst up to generator degree', 'Sometimes', 'Always detected'],
          ['Position-shifting errors', 'Missed', 'Detected'],
          ['Compensating +1/-1 pairs', 'Missed', 'Detected'],
        ],
      },
      {
        caption: 'CRC sizes in the wild',
        headers: ['CRC', 'Typical home', 'Check field'],
        rows: [
          ['CRC-8', 'Sensor/I2C-style short frames', '1 byte'],
          ['CRC-16', 'Modbus, USB, Bluetooth', '2 bytes'],
          ['CRC-32', 'Ethernet, zip, PNG', '4 bytes'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Appending the wrong number of zeros before dividing.',
        fix: 'Append exactly (generator degree) zeros — 3 for a CRC-3, 16 for a CRC-16. The zeros reserve room for the remainder; the wrong count silently shifts the entire division and produces a valid-looking wrong CRC.',
      },
      {
        mistake: 'XORing the divisor regardless of the window\'s top bit.',
        fix: 'In this (non-reflected) formulation, XOR only when the window\'s leading bit is 1 — that is the "bring down and compare" step of long division. Unconditional XOR is the most common hand-computation bug; the loop\'s `if r(1) == 1` exists for exactly this reason.',
      },
      {
        mistake: 'Treating CRC as encryption or authentication.',
        fix: 'A CRC is a linear, predictable function: anyone can forge a message with a matching CRC. It detects *accidental* corruption superbly; protecting against deliberate tampering needs cryptographic hashes/MACs. Datasheets and textbooks are careful with this distinction — be too.',
      },
    ],
    guidedPractice: {
      title: 'A second CRC-3 by hand',
      brief:
        'Using generator 1011, compute the CRC-3 of message 1001 (append 000, divide by hand showing every step), then verify that the transmitted frame — 1001 followed by your CRC — divides to remainder 000.',
      expectedBehavior:
        'Divide 1001000: window 1001 XOR 1011 = 0010; bring down 0 -> 0100 (top bit 0, no XOR); bring down 0 -> 1000, XOR 1011 = 0011; bring down 0 -> 0110 (top bit 0, no XOR). Remainder = 110, so CRC = 110 and the frame is 1001110. Verification: 1001 XOR 1011 = 0010; bring 1 -> 0101 (top 0, no XOR); bring 1 -> 1011, XOR 1011 = 0000; bring 0 -> 0000 (top 0, no XOR). Remainder 000 — frame accepted.',
      hints: [
        'Four quotient steps for a 7-bit dividend with a 4-bit divisor.',
        'XOR only when the window\'s top bit is 1, and shift in the next bit after every step.',
        'A correct frame divides to exactly 000 — if your trace says otherwise, recheck which steps XOR.',
      ],
    },
    practiceExercises: [
      {
        title: 'Catch the burst',
        brief:
          'The valid frame 1101001 suffers a 3-bit burst: bits 2-4 all flip, giving 1010001. Verify by division (generator 1011) whether the receiver\'s check catches it, showing each step.',
        expectedBehavior:
          'Divide 1010001 by 1011: window 1010 XOR 1011 = 0001; bring 0 -> 0010 (top 0); bring 0 -> 0100 (top 0); bring 1 -> 1001 (top 1) XOR 1011 = 0010. Remainder 010 — nonzero, frame REJECTED. The 3-bit burst is caught, as promised for bursts up to the generator degree.',
        hints: [
          'Same mechanics as the lesson: conditional XOR, shift.',
          'Nonzero remainder = detected error.',
          'A caught burst is the CRC\'s headline feature.',
        ],
      },
      {
        title: 'Generator choice',
        brief:
          'A protocol designer must pick a 1-byte check for 200-byte frames and asks: why not a plain 8-bit sum, and what does CRC-8 buy? Answer in three sentences naming the error classes from the lesson table.',
        expectedBehavior:
          'A plain sum is position-blind: compensating errors, byte swaps and reordered segments pass. CRC-8 with a good generator guarantees catching all bursts up to 8 bits and (with x+1 as a factor) all odd-error counts, at the same 1-byte cost. The residual risk shifts to rare multi-burst patterns with probability about 2^-8 — vastly better than the sum\'s structured blind spots.',
        hints: [
          'Recall the sum\'s holes from the previous lesson.',
          'What does a polynomial division know that a sum does not? Position.',
        ],
      },
    ],
    assessment: {
      title: 'CRC checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'For a CRC-3 with generator 1011, how many zero bits are appended to the message before division?',
          options: ['3', '4', '7', '1'],
          answer: '3',
          explanation:
            'Append (generator degree) zeros: the remainder of division by a degree-3 polynomial has 3 bits, so 3 zeros reserve their places.',
          hint: 'It matches the remainder width.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In the worked example, the CRC-3 of message 1101 (generator 1011) is...',
          options: ['001', '011', '101', '000'],
          answer: '001',
          explanation:
            'Dividing 1101000 by 1011 leaves remainder 001 (trace: 1101->0110, 1100->0111, 1110->0101, 1010->0001).',
          hint: 'Follow the four XOR steps in the lesson.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A frame whose computed CRC remainder at the receiver is zero is guaranteed to be bit-identical to what was sent.',
          answer: 'false',
          explanation:
            'Remainder zero means consistent with the code — some corrupted frames (roughly 2^-n of all patterns for an n-bit CRC) alias to valid codewords. CRCs make errors *vanishingly unlikely*, not impossible.',
          hint: 'Can two different messages share a remainder?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one or two words: the dominant real-world corruption class that CRCs guarantee to catch (up to the generator degree) is a bit ______.',
          answer: 'burst',
          explanation:
            'Burst errors — runs of consecutive corrupted bits from a glitch or fade — are the CRC\'s headline guarantee: all bursts up to the generator\'s degree are detected.',
          hint: 'Errors that come in runs.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Generator polynomial', definition: 'The fixed divisor (e.g. 1011 for CRC-3) defining the code.' },
      { term: 'CRC remainder', definition: 'The XOR-division remainder appended to the message; the check field.' },
      { term: 'Augmented message', definition: 'Message with (degree) zeros appended, ready for division.' },
      { term: 'Burst error', definition: 'A run of consecutive corrupted bits; caught up to the generator degree by a good CRC.' },
      { term: 'Shift-register CRC', definition: 'The hardware form: a register with XOR taps implementing the same division per clock.' },
    ],
    revisionSummary: [
      'CRC = remainder of XOR division by the generator; append degree-many zeros first.',
      'Hand division = 4-bit windows, conditional XOR, shift; silicon = shift register with taps.',
      'CRCs catch all bursts up to the generator degree and position-shift errors that sums miss.',
      'Zero remainder at the receiver = accept — probabilistically, not absolutely, safe.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Computation of CRC', url: 'https://en.wikipedia.org/wiki/Computation_of_CRC', kind: 'article' },
      { label: 'Wikipedia — Cyclic redundancy check', url: 'https://en.wikipedia.org/wiki/Cyclic_redundancy_check', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'com-m03-l3',
    title: 'Hamming (7,4): Encoding and Correcting by Hand',
    summary:
      'A code that repairs single-bit errors: the parity placement pattern, one nibble encoded end to end, and a flipped bit located and fixed with the syndrome.',
    objectives: [
      'Draw the (7,4) Hamming layout: parity at positions 1, 2, 4; data at 3, 5, 6, 7.',
      'Encode a nibble by computing the three parity bits.',
      'Compute the syndrome of a received word and locate a single-bit error.',
      'Connect the code to real systems (ECC memory, UART parity, unprotected buses).',
    ],
    whyItMatters:
      'Hamming codes are the smallest complete error-*correcting* system: four data bits, three parity bits, every single-bit error repairable — and the same covering-parity idea scales to the ECC that protects server memory. Doing one encode-and-correct cycle by hand demystifies every "error correction" block diagram you will ever see.',
    prerequisites: [
      'com-m03-l1 and com-m03-l2 (detection, and why correction needs more)',
      'XOR arithmetic',
    ],
    explanation:
      '### The layout\n\nNumber the codeword positions 1-7. Powers of two (1, 2, 4) hold **parity bits**; the rest hold the 4 data bits:\n\n```\nposition:  1    2    3    4    5    6    7\ncontent:  p1   p2   d1   p3   d2   d3   d4\n```\n\nEach parity bit covers the positions whose binary index contains its bit:\n\n- **p1** (covers positions with bit 0 set: 1, 3, 5, 7): p1 = d1 XOR d2 XOR d4\n- **p2** (bit 1 set: 2, 3, 6, 7): p2 = d1 XOR d3 XOR d4\n- **p3** (bit 2 set: 4, 5, 6, 7): p3 = d2 XOR d3 XOR d4\n\nThe coverage pattern is the design: every data position is covered by a *unique* subset of parities — that uniqueness is what makes errors locatable.\n\n### Encoding, worked: data 1011\n\nData bits d1=1, d2=0, d3=1, d4=1:\n\n```\np1 = 1 XOR 0 XOR 1 = 0\np2 = 1 XOR 1 XOR 1 = 1\np3 = 0 XOR 1 XOR 1 = 0\n\ncodeword (positions 1..7): 0 1 1 0 0 1 1   = 0110011\n```\n\n### Correcting, worked: error at position 5\n\nThe codeword travels; position 5 flips (0 -> 1). Received: **0 1 1 0 1 1 1**. The receiver recomputes each parity group over the received word and records failures as syndrome bits:\n\n```\ns1 = XOR of positions 1,3,5,7 = 0 XOR 1 XOR 1 XOR 1 = 1   (odd: failed)\ns2 = XOR of positions 2,3,6,7 = 1 XOR 1 XOR 1 XOR 1 = 0   (even: ok)\ns3 = XOR of positions 4,5,6,7 = 0 XOR 1 XOR 1 XOR 1 = 1   (odd: failed)\n\nsyndrome = s3 s2 s1 = 101 binary = 5  ->  the error is in position 5\n```\n\nFlip position 5 back: corrected word 0110011, data recovered as 1011. The syndrome *is* the binary address of the wrong position — no search, no table. (Syndrome 000 means no single-bit error.)',
    deepDive:
      '### Where this code lives, and where it does not\n\nECC server memory is Hamming (72,64)-class: the same covering-parity pattern widened — one flip corrected, and (with the extra overall parity) double flips *detected*. The lesson\'s honest limits matter as much as the mechanism: Hamming (7,4) corrects one bit but a *double* flip produces a valid-looking wrong codeword (syndrome points at a third position); and it spends 75% overhead, which is why long frames prefer CRC-detect-plus-retransmit when a return channel exists. The end-to-end picture of this course: UART gives you optional single parity (detect), I2C gives an ACK but **no data integrity check**, and SPI gives nothing at all — on such buses, integrity is the application\'s responsibility, which is precisely why application-layer CRCs (this lesson) and checksums (lesson 1) exist in real firmware.',
    examples: [
      {
        title: 'Encode and correct, bit by bit (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
d = [1 0 1 1];                       % d1 d2 d3 d4
p1 = xor(xor(d(1), d(2)), d(4));     % covers 3,5,7
p2 = xor(xor(d(1), d(3)), d(4));     % covers 3,6,7
p3 = xor(xor(d(2), d(3)), d(4));     % covers 5,6,7
cw = [p1 p2 d(1) p3 d(2) d(3) d(4)];
fprintf('codeword = %d%d%d%d%d%d%d\\n', cw);

% channel: flip position 5
rx = cw; rx(5) = 1 - rx(5);
s1 = xor(xor(xor(rx(1), rx(3)), rx(5)), rx(7));
s2 = xor(xor(xor(rx(2), rx(3)), rx(6)), rx(7));
s3 = xor(xor(xor(rx(4), rx(5)), rx(6)), rx(7));
pos = s3*4 + s2*2 + s1;
fprintf('syndrome = %d%d%d -> error at position %d\\n', s3, s2, s1, pos);
rx(pos) = 1 - rx(pos);
fprintf('corrected = %d%d%d%d%d%d%d\\n', rx);`,
        explanation: [
          'Encode: p1 = 1 xor 0 xor 1 = 0; p2 = 1 xor 1 xor 1 = 1; p3 = 0 xor 1 xor 1 = 0 — the codeword prints 0110011, matching the hand computation.',
          'The channel flips position 5: received word 0110111.',
          'Syndrome: s1 = 0 xor 1 xor 1 xor 1 = 1; s2 = 1 xor 1 xor 1 xor 1 = 0; s3 = 0 xor 1 xor 1 xor 1 = 1.',
          'Syndrome as a binary number: s3 s2 s1 = 101 = 5 — exactly the flipped position, no search needed.',
          'Expected output, exactly:',
          'codeword = 0110011',
          'syndrome = 101 -> error at position 5',
          'corrected = 0110011',
          'The corrected word equals the codeword — the single-bit error is repaired with three XOR chains and one flip.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Parity coverage map (which parity watches which position)',
        content:
          '  position:      1    2    3    4    5    6    7\n  content:      p1   p2   d1   p3   d2   d3   d4\n  index binary: 001  010  011  100  101  110  111\n\n  p1 covers indices with bit0=1:  1, 3, 5, 7\n  p2 covers indices with bit1=1:  2, 3, 6, 7\n  p3 covers indices with bit2=1:  4, 5, 6, 7\n\n  each data position has a UNIQUE coverage fingerprint:\n     d1 (3):  p1,p2      d2 (5):  p1,p3\n     d3 (6):  p2,p3      d4 (7):  p1,p2,p3\n  uniqueness = locatability (the syndrome reads the fingerprint)',
        caption:
          'The covering-parity design: each position\'s set of covering parities is its address. The syndrome simply reads that address off the failures.',
      },
    ],
    tables: [
      {
        caption: 'Hamming (7,4) encode of data 1011',
        headers: ['Position', 'Content', 'Value', 'Why'],
        rows: [
          ['1', 'p1', '0', 'd1 xor d2 xor d4 = 1 xor 0 xor 1'],
          ['2', 'p2', '1', 'd1 xor d3 xor d4 = 1 xor 1 xor 1'],
          ['3', 'd1', '1', 'data'],
          ['4', 'p3', '0', 'd2 xor d3 xor d4 = 0 xor 1 xor 1'],
          ['5', 'd2', '0', 'data'],
          ['6', 'd3', '1', 'data'],
          ['7', 'd4', '1', 'data'],
        ],
      },
      {
        caption: 'Syndrome decoding of received 0110111',
        headers: ['Check', 'Positions', 'XOR result', 'Meaning'],
        rows: [
          ['s1', '1,3,5,7', '0 xor 1 xor 1 xor 1 = 1', 'parity group 1 failed'],
          ['s2', '2,3,6,7', '1 xor 1 xor 1 xor 1 = 0', 'parity group 2 ok'],
          ['s3', '4,5,6,7', '0 xor 1 xor 1 xor 1 = 1', 'parity group 3 failed'],
          ['syndrome', 's3 s2 s1 = 101', 'decimal 5', 'flip position 5'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Computing parity over data bits only, then checking the same way at the receiver.',
        fix: 'The receiver\'s syndrome recomputes each parity group over the *received word including the parity positions*. Checking data-only reproduces the encode, not the error location — the syndrome would always read zero.',
      },
      {
        mistake: 'Reversing the syndrome bit order.',
        fix: 'The position address is s3 s2 s1 (s3 is the most significant, matching p3\'s weight-4 coverage). Writing s1 s2 s3 mislocates every error: syndrome 101 is position 5, but 101 read backwards is 101 — a coincidence here that hides the bug until another example. Test with position 6 (s3 s2 s1 = 110) before trusting an implementation.',
      },
      {
        mistake: 'Trusting Hamming to fix two flipped bits.',
        fix: 'One flip is corrected; two flips in a (7,4) word produce a syndrome pointing at a *third* position — the "correction" then corrupts good data. Extended Hamming adds an overall parity bit to at least detect (not correct) doubles. Know the guarantee\'s exact boundary.',
      },
    ],
    guidedPractice: {
      title: 'A second nibble, end to end',
      brief:
        'Encode data 0110 (d1=0, d2=1, d3=1, d4=0) with the (7,4) rules; then the channel flips position 6. Compute the received word, the syndrome, the corrected word and the recovered data.',
      expectedBehavior:
        'p1 = 0 xor 1 xor 0 = 1; p2 = 0 xor 1 xor 0 = 1; p3 = 1 xor 1 xor 0 = 0. Codeword: 1 1 0 0 1 1 0 (1100110). Flip position 6: received 1100100. Syndrome: s1 = p1 xor d1 xor d2 xor d4 over received = 1 xor 0 xor 1 xor 0 = 0; s2 = 1 xor 0 xor 0 xor 0 = 1; s3 = 0 xor 1 xor 0 xor 0 = 1. Syndrome s3s2s1 = 110 = 6 -> flip position 6 -> 1100110, data 0110 recovered.',
      hints: [
        'Parities first (they depend only on data), then assemble positions 1..7.',
        'Syndrome groups over the received word, parity positions included.',
        's3 s2 s1 as a binary number is the position.',
      ],
    },
    practiceExercises: [
      {
        title: 'All single-bit syndromes',
        brief:
          'For codeword 0110011, list the syndrome produced by flipping each of positions 1 through 7 (one row each), and verify the pattern: the syndrome equals the flipped position in binary.',
        expectedBehavior:
          'Flip 1: syndrome 001. Flip 2: 010. Flip 3: 011. Flip 4: 100. Flip 5: 101. Flip 6: 110. Flip 7: 111. Each syndrome equals the flipped position\'s binary index — the covering-parity fingerprint at work. (Syndrome 000 = no error.)',
        hints: [
          'Each flip breaks exactly the parity groups covering its position.',
          'The covering sets are in the coverage map.',
          'Position 3 is covered by p1 and p2 -> syndrome 011.',
        ],
      },
      {
        title: 'Audit a bus design',
        brief:
          'A sensor board streams 16-byte packets over SPI, and field units report rare corrupted packets. The designer proposes "add a parity bit per byte". Evaluate the proposal against the course\'s tools and recommend a concrete alternative.',
        expectedBehavior:
          'Per-byte parity detects only odd-flip counts per byte and corrects nothing; a burst across bytes passes untouched. SPI has no integrity layer at all, so the application must own it: append a CRC-8 per packet (or CRC-16 for longer frames) and drop/retransmit failures — matching the lesson\'s point that I2C/SPI leave integrity to the application. Any answer pairing the parity critique with a per-frame CRC recommendation is correct.',
        hints: [
          'Bursts, not single flips, are the field failure mode.',
          'Which layer can see the whole packet?',
        ],
      },
    ],
    assessment: {
      title: 'Hamming (7,4) checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In Hamming (7,4), which positions hold parity bits?',
          options: ['1, 2, 4', '1, 2, 3', '3, 5, 6, 7', '5, 6, 7'],
          answer: '1, 2, 4',
          explanation:
            'The powers of two (1, 2, 4) hold parity; positions 3, 5, 6, 7 hold the four data bits. The power-of-two placement is what makes the syndrome read out as a binary position.',
          hint: 'Powers of two.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Encoding data 1011 (d1..d4) gives which parity bits p1 p2 p3?',
          options: ['0 1 0', '1 0 1', '1 1 0', '0 0 1'],
          answer: '0 1 0',
          explanation:
            'p1 = 1 xor 0 xor 1 = 0; p2 = 1 xor 1 xor 1 = 1; p3 = 0 xor 1 xor 1 = 0. Codeword: 0110011.',
          hint: 'Three XOR chains over the coverage sets.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A syndrome of 000 after transmission means no single-bit error occurred in the codeword.',
          answer: 'true',
          explanation:
            'Syndrome 000 means every parity group is consistent — no single flip (and no triple) occurred. Double flips can alias to another valid pattern\'s syndrome, which is the code\'s known boundary.',
          hint: 'What does a failed parity group contribute to the syndrome?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'The received word yields s3=1, s2=1, s1=0. Which position is in error (number only)?',
          answer: '6',
          explanation:
            'Syndrome = s3 s2 s1 = 110 binary = 6. The syndrome is literally the binary address of the flipped position.',
          hint: 's3 is the most significant bit.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Hamming (7,4)', definition: 'A code encoding 4 data bits into 7 with 3 covering parities; corrects any single-bit error.' },
      { term: 'Parity coverage', definition: 'The set of positions each parity bit watches; unique per position, enabling location.' },
      { term: 'Syndrome', definition: 'The recomputed-parity failure pattern; its binary value is the erroneous position.' },
      { term: 'ECC memory', definition: 'Hamming-class coding in DRAM systems: single-bit correction, multi-bit detection.' },
      { term: 'Application-layer integrity', definition: 'The responsibility buses like I2C and SPI leave to the firmware (CRCs, checksums).' },
    ],
    revisionSummary: [
      'Layout: p1 p2 d1 p3 d2 d3 d4; parities cover power-of-two-indexed groups.',
      'Encode data 1011 -> 0110011; the coverage map is the whole design.',
      'Syndrome = failed parity groups as a binary number = position of the flip.',
      'Corrects one bit; doubles alias. UART parity detects; I2C/SPI leave integrity to the application.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Hamming code', url: 'https://en.wikipedia.org/wiki/Hamming_code', kind: 'article' },
      { label: 'Wikipedia — Error detection and correction', url: 'https://en.wikipedia.org/wiki/Error_detection_and_correction', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
