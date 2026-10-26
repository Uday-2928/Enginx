import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'com-m02-l1',
    title: 'Analog Modulation: AM and FM',
    summary:
      'The two classic ways of riding a carrier: amplitude modulation with its envelope, and frequency modulation with its deviation — plus Carson\'s bandwidth rule, worked.',
    objectives: [
      'Write and sketch the AM waveform, and explain envelope detection.',
      'Explain the modulation index and what over-modulation does.',
      'Define FM frequency deviation and compute occupied bandwidth with Carson\'s rule.',
      'Contrast AM and FM noise behaviour at a concept level.',
    ],
    whyItMatters:
      'AM and FM are the historical foundation of every digital scheme: the ideas of impressing information on amplitude or frequency carry straight into ASK and FSK (next lesson). FM radio still blankets the planet, and Carson\'s rule remains the first bandwidth estimate for any angle-modulated system, digital or not.',
    prerequisites: [
      'com-m01-l1 (modulation\'s purpose, carriers)',
    ],
    explanation:
      '### Amplitude modulation (AM)\n\nAM multiplies a carrier by the message:\n\n```\ns(t) = A_c (1 + m cos(2 pi f_m t)) cos(2 pi f_c t)\n```\n\nThe **envelope** — the curve tracing the carrier\'s peaks — is (1 + m cos(...)) scaled by A_c: the message rides visibly on top. The **modulation index** m (0 to 1 for undistorted AM) sets how deeply the message swings the envelope: m = 0.5 swings between 0.5 A_c and 1.5 A_c. **Envelope detection** — a diode plus an RC that follows the peaks — recovers the message with almost no circuitry, which is why AM survives in cheap receivers. Over-modulate (m > 1) and the envelope crosses zero and folds: the detector recovers distortion instead of message.\n\nThe ASCII trace below shows the envelope explicitly. Spectrum note: AM of a tone at f_m produces sidebands at f_c ± f_m around the carrier — the message lives entirely in the sidebands; the carrier term burns power without carrying information.\n\n### Frequency modulation (FM)\n\nFM leaves the amplitude alone and wobbles the *frequency*:\n\n```\ninstantaneous frequency = f_c + df * cos(2 pi f_m t)\n```\n\ndf is the **frequency deviation** — how far the carrier swings. FM broadcast allows df up to 75 kHz for audio up to 15 kHz. The occupied bandwidth is estimated by **Carson\'s rule**:\n\n```\nB ≈ 2 (df + f_m)   ->   2 (75 + 15) = 180 kHz  (channels spaced 200 kHz)\n```\n\n— the arithmetic that produced the FM band\'s spacing. The payoff for the extra bandwidth: amplitude noise (the common kind) does not disturb frequency, so an FM receiver that *limits* amplitude before demodulating rejects it almost completely — the famous capture effect and quiet backgrounds of FM, at the cost of spectrum.',
    deepDive:
      '### Why bandwidth buys noise immunity (the AM/FM trade)\n\nAM keeps the message in a narrow band (2 f_m) but its information lives in amplitude — exactly where channel noise lives, so every noise spike rides into the detector. FM spreads the signal over 2(df + f_m) — typically 10-20x wider — but encodes the message in *zero crossings*, which noise must be enormous to displace. The trade is general and fundamental: **spreading information over more bandwidth buys immunity**, a theme Shannon formalises (more bandwidth means more capacity at fixed power) and modern spread-spectrum systems exploit deliberately. When you meet FSK and PSK next lesson, watch the same trade reappear in digital clothes.',
    examples: [
      {
        title: 'AM and Carson bandwidth, computed (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% AM with m = 0.5: envelope swing
m = 0.5;
fprintf('envelope swings from %.2f Ac to %.2f Ac\\n', 1 - m, 1 + m);

% over-modulation check
m2 = 1.2;
fprintf('m = %.1f -> envelope low point = %.1f (crosses zero: distortion)\\n', ...
        m2, 1 - m2);

% Carson's rule for FM broadcast
df = 75e3;   % deviation, Hz
fm = 15e3;   % max audio, Hz
fprintf('Carson bandwidth = %.0f kHz\\n', 2 * (df + fm) / 1e3);`,
        explanation: [
          'Envelope for m = 0.5: between 0.50 Ac and 1.50 Ac — the printed line.',
          'Over-modulation m = 1.2: low point is -0.2, i.e. the envelope would need negative amplitude — the detector folds it, producing distortion.',
          'Carson: 2 x (75 kHz + 15 kHz) = 180 kHz — matching the 200 kHz channel spacing with guard band.',
          'Expected output, exactly:',
          'envelope swings from 0.50 Ac to 1.50 Ac',
          'm = 1.2 -> envelope low point = -0.2 (crosses zero: distortion)',
          'Carson bandwidth = 180 kHz',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'AM waveform with envelope (illustrative)',
        content:
          '  envelope (the message)\n     ______________________\n    /                      \\\n   /                        \\\n  +   /\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/\n     /\\/\\/\\/\\/\\/\\/\\/\\/\\/\\/  <- carrier under the envelope\n    \\                          /\n     \\________________________/\n\n  carrier peaks touch the envelope; envelope = 1 + m cos(2 pi f_m t)\n  detector (diode + RC) follows the envelope -> message out\n\n  (educational waveform (illustrative) — schematic shape, not to scale)',
        caption:
          'The message is the outline; the carrier is the fill. A diode and a capacitor recover the outline directly.',
      },
      {
        kind: 'waveform',
        title: 'FM: frequency wobble, constant amplitude (illustrative)',
        content:
          '  message (slow sine)         FM waveform (fast carrier)\n\n  +1 |     ___                    density follows the message:\n     |   /   \\                   tightly packed where message is high\n   0 |--/-----\\------            loosely packed where message is low\n     |/         \\__\n  -1 |\n\n  +  ||||||| ||| ||  |  || |||| |||||||   <- constant amplitude,\n      fast     slow      fast               varying spacing\n\n  (educational waveform (illustrative) — schematic shape, not to scale)',
        caption:
          'FM keeps the amplitude constant and encodes the message in the zero-crossing spacing. Amplitude noise therefore has nothing to grab.',
      },
    ],
    tables: [
      {
        caption: 'AM versus FM',
        headers: ['Property', 'AM', 'FM'],
        rows: [
          ['Information lives in', 'Amplitude (envelope)', 'Instantaneous frequency'],
          ['Bandwidth (tone f_m)', '2 f_m (narrow)', '≈ 2 (df + f_m) (Carson)'],
          ['Noise immunity', 'Poor (noise is amplitude)', 'Good (amplitude limiting works)'],
          ['Receiver complexity', 'Trivial (envelope detector)', 'Moderate (limiter + discriminator)'],
          ['Power efficiency', 'Poor (carrier carries no information)', 'Constant-envelope: efficient amplifiers'],
        ],
      },
      {
        caption: 'Carson arithmetic for common cases',
        headers: ['System', 'df', 'f_m max', 'Carson B'],
        rows: [
          ['FM broadcast', '75 kHz', '15 kHz', '180 kHz'],
          ['Narrowband voice FM', '5 kHz', '3 kHz', '16 kHz'],
          ['Analog TV audio subcarrier', '25 kHz', '15 kHz', '80 kHz'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Assuming the AM carrier frequency appears in the envelope.',
        fix: 'The envelope varies at the *message* rate f_m; the carrier is only the fill inside it. Envelope detection low-passes the rectified waveform — the carrier never needs to be recovered.',
      },
      {
        mistake: 'Reading Carson\'s rule as exact.',
        fix: 'Carson gives the bandwidth containing ~98% of the power for typical deviation ratios; real spectra have skirts beyond it. Use it as a design estimate and spacing guide (as the FM band does), not as a legal boundary.',
      },
      {
        mistake: 'Concluding FM is "better" than AM in all respects.',
        fix: 'FM buys noise immunity with bandwidth and receiver complexity; AM wins on spectrum efficiency and detector simplicity. Broadcast history used both deliberately — AM for talk spectrum efficiency, FM for music quality.',
      },
    ],
    guidedPractice: {
      title: 'Envelope and Carson drill',
      brief:
        '(a) For m = 0.8, state the envelope\'s max and min as fractions of Ac. (b) A narrowband voice FM link uses df = 5 kHz and f_m = 3 kHz: compute the Carson bandwidth. (c) True or false with one-line reason: doubling df doubles the FM bandwidth but leaves the amplitude constant.',
      expectedBehavior:
        '(a) 1.8 Ac max, 0.2 Ac min — never crosses zero, safe. (b) 2(5+3) = 16 kHz. (c) True — deviation changes only the frequency swing; amplitude stays at Ac (constant envelope).',
      hints: [
        'Envelope = 1 ± m.',
        'Carson: 2 (df + f_m).',
        'FM has no amplitude information at all.',
      ],
    },
    practiceExercises: [
      {
        title: 'Design an FM link bandwidth',
        brief:
          'A telemetry link must carry a 5 kHz sensor tone with df = 20 kHz. Compute the Carson bandwidth, how many such links fit in a 500 kHz allocation, and what happens to both if the audio bandwidth requirement rises to 10 kHz.',
        expectedBehavior:
          'Carson B = 2(20 + 5) = 50 kHz -> 500/50 = 10 links. At f_m = 10 kHz: B = 2(20+10) = 60 kHz -> 8 links (500/60 = 8.33). Raising message bandwidth costs capacity per channel — the FDM coupling between audio bandwidth and link count.',
        hints: [
          'Carson first, then divide the allocation.',
          'Integer division: you cannot fit a fraction of a link.',
        ],
      },
      {
        title: 'Diagnose the AM receiver symptom',
        brief:
          'An AM receiver produces garbled audio that improves when the volume (RF gain) is reduced. Explain over-modulation versus detector clipping as candidate causes and which measurement distinguishes them.',
        expectedBehavior:
          'If the *transmitted* envelope crosses zero (over-modulation, m > 1), distortion is baked into the waveform and reducing RF gain will not help. If the *receiver\'s* detector clips (audio stage saturating on peaks), reducing gain helps. Distinguish with a scope at the detector output: folded (inverted) envelope lobes indicate over-modulation; flat-topped audio peaks indicate receiver clipping.',
        hints: [
          'Ask where the distortion enters: the air or the box?',
          'Envelope folding looks like phase inversion on peaks.',
        ],
      },
    ],
    assessment: {
      title: 'Analog modulation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In AM, where does the transmitted information live?',
          options: [
            'In the envelope (sidebands around the carrier)',
            'In the carrier frequency itself',
            'In the carrier phase',
            'In the transmitter power supply',
          ],
          answer: 'In the envelope (sidebands around the carrier)',
          explanation:
            'The message shapes the envelope and appears as sidebands at fc ± fm; the bare carrier term carries no information — one reason AM is power-inefficient.',
          hint: 'What does the envelope detector recover?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Using Carson\'s rule, what bandwidth does an FM signal with df = 75 kHz and f_m = 15 kHz occupy?',
          options: ['180 kHz', '150 kHz', '90 kHz', '200 kHz'],
          answer: '180 kHz',
          explanation:
            'B ≈ 2 (df + f_m) = 2 x 90 kHz = 180 kHz. Broadcast channels are spaced 200 kHz to leave guard bands.',
          hint: 'Two times the sum of deviation and message bandwidth.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A modulation index of 1.2 in AM produces recoverable audio with a standard envelope detector.',
          answer: 'false',
          explanation:
            'm > 1 drives the envelope below zero; the detector folds the negative lobes and outputs distortion. Over-modulation is a broadcast offence for exactly this reason.',
          hint: 'Check the envelope\'s low point: 1 - m.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one word: the FM receiver stage that removes amplitude noise before demodulation is called the ______.',
          answer: 'limiter',
          explanation:
            'The limiter clips the signal to constant amplitude; since FM information is in frequency only, this removes amplitude noise "for free" — the basis of FM\'s quiet reception.',
          hint: 'It limits the amplitude.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Envelope', definition: 'The curve through an AM waveform\'s peaks; the message itself.' },
      { term: 'Modulation index (m)', definition: 'Depth of AM: envelope swings 1 ± m; m > 1 over-modulates and distorts.' },
      { term: 'Frequency deviation (df)', definition: 'Peak frequency swing of an FM signal around the carrier.' },
      { term: 'Carson\'s rule', definition: 'B ≈ 2 (df + f_m): the standard occupied-bandwidth estimate for FM.' },
      { term: 'Limiter', definition: 'FM receiver stage forcing constant amplitude, rejecting amplitude noise.' },
    ],
    revisionSummary: [
      'AM: message in the envelope; detector = diode + RC; m ≤ 1 or distortion.',
      'FM: message in frequency; deviation df; Carson B ≈ 2(df + f_m).',
      'FM trades bandwidth for noise immunity via the limiter; AM trades noise immunity for bandwidth.',
      'The bandwidth-for-immunity trade is the recurring theme of modulation design.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Amplitude modulation', url: 'https://en.wikipedia.org/wiki/Amplitude_modulation', kind: 'article' },
      { label: 'Wikipedia — Frequency modulation', url: 'https://en.wikipedia.org/wiki/Frequency_modulation', kind: 'article' },
      { label: 'Electronics Tutorials — Amplitude modulation', url: 'https://www.electronics-tutorials.ws/communication/amplitude-modulation.html', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'com-m02-l2',
    title: 'Digital Modulation: ASK, FSK and BPSK',
    summary:
      'Bits onto carriers the digital way: on-off keying, binary frequency shift, and binary phase shift keying — with a bit-to-phase table, waveforms, and a threshold-detector round trip in Octave.',
    objectives: [
      'Describe ASK/OOK, FSK and PSK as digital versions of the analog schemes.',
      'Map bits to BPSK symbols and detect them with a threshold decision.',
      'Read BPSK waveforms including the 180-degree phase flip at bit boundaries.',
      'Explain why constant-envelope schemes (FSK, PSK) suit efficient amplifiers.',
    ],
    whyItMatters:
      'These three keys are the entire alphabet of digital radio: every scheme from Bluetooth (FSK-family) to deep-space probes (PSK-family) builds on them. The BPSK round trip in this lesson — map, transmit, threshold, recover — is the smallest complete digital link that exists, and it is exactly what the platform\'s BPSK challenge tests.',
    prerequisites: [
      'com-m02-l1 (analog AM/FM — the digital schemes mirror them)',
      'com-m01-l3 (SNR as the quality currency)',
    ],
    explanation:
      '### Three keys\n\n- **ASK (amplitude shift keying)**: bit 0 = low amplitude, bit 1 = high amplitude. The simplest case, **OOK** (on-off keying), literally switches the carrier off for 0 — used in remote controls and fibre (light on/off). Vulnerability mirrors AM: amplitude noise corrupts the decision.\n- **FSK (frequency shift keying)**: bit 0 = f1, bit 1 = f2 (BFSK). The digital FM: constant envelope, immune to amplitude noise, used in Bluetooth-class radios and early modems. Costs bandwidth (two tones) or detection complexity.\n- **PSK (phase shift keying)**: bit 0 = phase 0°, bit 1 = phase 180° (BPSK) — the carrier flips sign. Also constant envelope, and the most power-efficient of the three at low SNR: the decision is a single comparison of the recovered phase against a threshold.\n\n### BPSK, precisely\n\nWith the carrier sampled once per bit, BPSK is just a sign:\n\n| Bit | Phase | Symbol |\n|---|---|---|\n| 0 | 0° | +1 |\n| 1 | 180° | −1 |\n\nDetection after a noiseless channel: positive sample → 0, negative → 1. Add channel noise and the threshold at zero is where errors are born — the probability a noise sample pushes a symbol across zero is the subject of every BER analysis (module 03 starts there). The Octave round trip below does the noiseless version; the challenge linked to this lesson adds the noise thinking.',
    deepDive:
      '### Why constant envelope matters in hardware\n\nAn RF power amplifier is most efficient when it saturates — a switch, not a linear valve. Saturating amplifiers destroy amplitude information (any AM in, AM-distorted out) but preserve phase and frequency. Constant-envelope schemes (FSK, PSK, and FM before them) therefore survive saturated amplifiers: the transmitter runs at peak efficiency and the modulation is untouched. Amplitude-bearing schemes (QAM, OFDM — the high-spectral-efficiency families) need linear, less efficient amplifiers and careful back-off. This hardware consequence — envelope constancy versus amplifier efficiency — is one of the real forces shaping which modulation a product ships with.',
    examples: [
      {
        title: 'BPSK round trip in GNU Octave (noiseless channel)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
bits = [0 1 1 0 1 0 0 1];
s = 1 - 2*bits;            % BPSK map: 0 -> +1, 1 -> -1
r = s;                     % noiseless channel: received = sent
bits_hat = r < 0;          % threshold detector: decide at 0

for k = 1:8
  fprintf('bit=%d symbol=%+d detected=%d\\n', bits(k), s(k), bits_hat(k));
end
fprintf('bit errors: %d\\n', sum(bits ~= bits_hat));`,
        explanation: [
          'Mapping: s = 1 - 2*bits turns 0 into +1 and 1 into -1 — the table in the lesson, as one line of arithmetic.',
          'The channel model here is honest about being noiseless (r = s); the challenge ece-matlab-04-bpsk-symbols extends the thinking toward noisy decisions.',
          'The detector is a threshold at zero: any positive sample decides 0, any negative decides 1.',
          'Expected output, exactly:',
          'bit=0 symbol=+1 detected=0',
          'bit=1 symbol=-1 detected=1',
          'bit=2 symbol=-1 detected=1',
          'bit=3 symbol=+1 detected=0',
          'bit=4 symbol=-1 detected=1',
          'bit=5 symbol=+1 detected=0',
          'bit=6 symbol=+1 detected=0',
          'bit=7 symbol=-1 detected=1',
          'bit errors: 0',
          'Eight bits, eight correct decisions — the round trip closes with zero errors, as it must on a noiseless channel.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'BPSK waveform: the 180-degree flip (illustrative)',
        content:
          '  bits:      0        1        1        0\n\n             + carrier  + flip!   + carrier  + back to 0 deg\n             /\\    /\\   ___       ___ ___             /\\  /\\\n            /  \\  /  \\ /   \\     /       \\           /  \\/  \\\n           /    \\/    X     \\   /         \\         /\n          /     /\\    /\\     \\_/           \\___    /    phase\n             /  \\  /  \\ (carrier                \\  /     continuous,\n            /    \\/    \\  inverted)              \\/      amplitude constant\n\n  same amplitude and frequency throughout; only the phase flips\n  at each 0 -> 1 or 1 -> 0 bit boundary.\n\n  (educational waveform (illustrative) — schematic shape)',
        caption:
          'BPSK is a phase reversal, not an amplitude or frequency change: the sinusoid continues seamlessly but upside-down after the flip.',
      },
    ],
    tables: [
      {
        caption: 'The three binary keys',
        headers: ['Scheme', 'Bit 0', 'Bit 1', 'Analog ancestor', 'Envelope'],
        rows: [
          ['ASK / OOK', 'Amplitude low / off', 'Amplitude high / on', 'AM', 'Varies'],
          ['FSK (BFSK)', 'Frequency f1', 'Frequency f2', 'FM', 'Constant'],
          ['PSK (BPSK)', 'Phase 0°', 'Phase 180°', 'PM (angle modulation)', 'Constant'],
        ],
      },
      {
        caption: 'BPSK decision table',
        headers: ['Bit', 'Phase', 'Symbol (sampled)', 'Decision rule'],
        rows: [
          ['0', '0°', '+1', 'sample > 0 -> decide 0'],
          ['1', '180°', '−1', 'sample < 0 -> decide 1'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Confusing BPSK symbols with voltages: "+1" is a phase state, not a rail.',
        fix: 'The ±1 is the complex symbol multiplying the carrier — the carrier amplitude is set by transmit power. On a scope the two symbols look like the *same* sinusoid with different polarity; on a constellation (next lesson) they are two points.',
      },
      {
        mistake: 'Assuming OOK and BPSK are equally power-efficient.',
        fix: 'For the same average power, BPSK\'s antipodal symbols (+1/−1) are maximally separated, while OOK\'s (0/1) are half separated — BPSK needs roughly 3 dB less power for the same error rate. Antipodality is a gift you exploit wherever power is scarce (space probes).',
      },
      {
        mistake: 'Detecting by comparing to a fixed voltage instead of the decision threshold in the recovered symbol space.',
        fix: 'The threshold is at the midpoint of the *symbol* values (zero here), after carrier recovery and sampling at the symbol centre. Detecting raw waveform amplitudes without recovering the carrier phase turns BPSK into nothing detectable — carrier recovery is the hidden half of every PSK receiver.',
      },
    ],
    guidedPractice: {
      title: 'Map and detect a new sequence',
      brief:
        'Map the bits [1 0 0 1 1 1 0] to BPSK symbols, list them in order, and state what a threshold detector outputs for the sequence [−1 +1 +1 −1 +1 −1 −1 +1]. Then give the bit error count between the two sequences as transmitted.',
      expectedBehavior:
        'Symbols for [1 0 0 1 1 1 0]: −1 +1 +1 −1 −1 −1 +1. Detecting [−1 +1 +1 −1 +1 −1 −1 +1] gives bits [1 0 0 1 0 1 1 0]. Comparing the 7-bit original (−1 +1 +1 −1 −1 −1 +1) against the first 7 detected symbols (−1 +1 +1 −1 +1 −1 −1): positions 5 and 7 differ -> 2 bit errors.',
      hints: [
        'Bit 1 -> −1; bit 0 -> +1.',
        'Detection: negative sample -> bit 1.',
        'Compare position by position; only 7 positions have a transmitted partner.',
      ],
      challengeId: 'ece-matlab-04-bpsk-symbols',
    },
    practiceExercises: [
      {
        title: 'Choose the scheme for the job',
        brief:
          'Pick ASK/OOK, FSK or BPSK for each, with a one-line reason: (a) a £1 keyfob transmitter with an inefficient antenna; (b) a satellite downlink where every milliwatt counts; (c) a low-cost 2.4 GHz beacon that must survive a saturated power amplifier.',
        expectedBehavior:
          '(a) OOK: simplest possible transmitter and detector; power efficiency is irrelevant at these powers. (b) BPSK: antipodal symbols give the best energy-per-bit efficiency of the binary schemes. (c) FSK (or BPSK): constant envelope survives the saturated amplifier; OOK would be distorted. Any defensible pairing with the matching reason is acceptable.',
        hints: [
          'Rank by simplicity (OOK), power efficiency (BPSK), and amplifier compatibility (constant envelope).',
          'Satellites care about dB; keyfobs care about pennies.',
        ],
      },
      {
        title: 'Where errors are born',
        brief:
          'A BPSK receiver samples +0.2 for a bit that was sent as −1. Explain in two sentences what happened and what determines how often it happens.',
        expectedBehavior:
          'Channel noise added about +1.2 to the −1 symbol, pushing the sample across the zero threshold — a decision error. The frequency of such crossings is set by the SNR: noise amplitude versus the fixed symbol separation (2 for BPSK), which is why BER curves are plotted against Eb/N0 and why the antipodal spacing of BPSK matters.',
        hints: [
          'The threshold is at zero; the symbol was at −1.',
          'Noise amplitude scales with SNR; the gap is fixed by the modulation.',
        ],
      },
    ],
    assessment: {
      title: 'Digital modulation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In BPSK, what distinguishes the two symbols?',
          options: [
            'A 180-degree phase difference (sign flip)',
            'Two different frequencies',
            'Presence versus absence of the carrier',
            'Two amplitude levels',
          ],
          answer: 'A 180-degree phase difference (sign flip)',
          explanation:
            'BPSK sends +1 (0°) and −1 (180°): the same sinusoid with opposite sign. Frequencies and amplitude are identical — that is what makes it constant-envelope.',
          hint: 'The name says phase.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which scheme literally turns the carrier off for one of the bits?',
          options: ['OOK (a form of ASK)', 'BFSK', 'BPSK', 'QPSK'],
          answer: 'OOK (a form of ASK)',
          explanation:
            'On-off keying is ASK with the "0" amplitude at zero: carrier present for 1, absent for 0. It is the oldest and simplest keying scheme (and how morse-like telegraphy worked).',
          hint: 'On. Off.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In the Octave mapping s = 1 - 2*bits, the bit 0 maps to the symbol +1.',
          answer: 'true',
          explanation:
            'bits = 0 gives s = 1 - 0 = +1 (phase 0°); bits = 1 gives s = 1 - 2 = -1 (180°). This is the standard BPSK mapping table in arithmetic form.',
          hint: 'Substitute both bit values.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one or two words: the receiver operation that compares each received symbol sample against zero to decide the bit is called ______ detection.',
          answer: 'threshold',
          explanation:
            'Threshold detection at the symbol midpoint (zero for antipodal BPSK) is the optimal single-sample decision; noise near the threshold is what produces bit errors.',
          hint: 'Decide by which side of a line the sample falls.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'ASK / OOK', definition: 'Amplitude shift keying; on-off keying switches the carrier fully off for one bit state.' },
      { term: 'FSK (BFSK)', definition: 'Frequency shift keying between two tones; constant envelope, FM\'s digital descendant.' },
      { term: 'PSK (BPSK)', definition: 'Phase shift keying; BPSK flips the carrier 180° between bits — antipodal symbols.' },
      { term: 'Symbol', definition: 'The modulation state transmitted during one symbol period (here: ±1).' },
      { term: 'Threshold detection', definition: 'Deciding a bit by comparing the received symbol against the midpoint of the symbol set.' },
    ],
    revisionSummary: [
      'ASK/OOK = digital AM; FSK = digital FM; PSK = digital phase modulation.',
      'BPSK table: bit 0 -> 0° -> +1; bit 1 -> 180° -> −1; detect by threshold at 0.',
      'Constant envelope (FSK/PSK) survives saturated amplifiers; OOK is simplest; BPSK is most power-efficient.',
      'Bit errors are born at the threshold — set by SNR against the fixed symbol separation.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Phase-shift keying', url: 'https://en.wikipedia.org/wiki/Phase-shift_keying', kind: 'article' },
      { label: 'Wikipedia — Frequency-shift keying', url: 'https://en.wikipedia.org/wiki/Frequency-shift_keying', kind: 'article' },
      { label: 'Electronics Tutorials — Digital modulation', url: 'https://www.electronics-tutorials.ws/communication/digital-modulation.html', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'com-m02-l3',
    title: 'QPSK, Constellations and the Symbol-Rate Ledger',
    summary:
      'Two bits per symbol: the QPSK constellation with Gray coding, ASCII constellation reading, the symbol-versus-bit-rate arithmetic, and the eye diagram as a quality window.',
    objectives: [
      'Draw and label a QPSK constellation with Gray-coded bit assignments.',
      'Compute bit rate from symbol rate and bits per symbol (and back).',
      'Read ASCII constellation diagrams and explain what noise does to them.',
      'Describe the eye diagram and what closing it means for detection.',
    ],
    whyItMatters:
      'Constellation literacy is the single most transferable skill in digital communications: every modern standard (Wi-Fi, 5G, satellite) specifies itself as a constellation, and every lab session diagnoses links by looking at one. This lesson adds the accounting layer — symbols versus bits — that connects constellations to data rates.',
    prerequisites: [
      'com-m02-l2 (BPSK symbols and threshold detection)',
    ],
    explanation:
      '### QPSK: four phases, two bits\n\nQPSK uses four phases 45°, 135°, 225°, 315°, assigning two bits to each with **Gray coding** — adjacent symbols differ in exactly one bit, so the most likely error (crossing into a neighbouring constellation point under noise) corrupts one bit, not two:\n\n| Phase | Bits |\n|---|---|\n| 45° | 00 |\n| 135° | 01 |\n| 225° | 11 |\n| 315° | 10 |\n\nThe constellation diagram plots each symbol on I (in-phase, x) versus Q (quadrature, y) axes: four points on the diagonals, all the same radius (constant envelope). Noise nudges each received point randomly; the detector decides which of the four quadrants the noisy point landed in.\n\n### The ledger: symbols versus bits\n\nA **symbol** is one modulation state held for one symbol period; the **symbol rate** (baud) counts symbols per second, and the **bit rate** is symbol rate times bits per symbol:\n\n```\nBPSK: 1 bit/symbol.  QPSK: 2.  8PSK: 3.  16QAM: 4.\n1200 baud QPSK -> 2400 bit/s.\n```\n\nThe same wire or carrier carrying 1200 symbols/s carries 2400 bit/s with QPSK — spectral efficiency doubles. The price: four points packed in the same circle are closer together than two, so a given noise nudge is more likely to cause a wrong decision — higher-order schemes trade power efficiency (or SNR requirement) for bits per symbol. That trade is the entire economy of modern modulation design, and it connects directly to Shannon: more bits/s/Hz needs more SNR.',
    deepDive:
      '### The eye diagram: what the receiver actually sees\n\nOverlay every symbol period of the received waveform on one period\'s width and you get the **eye diagram**: an opening whose vertical height is the noise-plus-ISI margin at the sampling instant and whose width is the timing jitter margin. A wide-open eye — two clean levels clearly separated — means decisions are comfortable; a closing eye (noise filling the gap, edges blurring the crossing) predicts symbol errors exactly where the eye is thinnest. Engineers read eyes the way doctors read ECGs: the shape localises the problem (noise closes the eye vertically; timing jitter narrows it horizontally; intersymbol interference makes multiple tracks). Every high-speed serial standard specifies a minimum eye mask for this reason — the constellation and the eye are the same link health, viewed in symbol space and in time respectively.',
    examples: [
      {
        title: 'Symbol-rate ledger and constellation reading (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% Gray-coded QPSK: two bits per symbol, four phases
bitsPerSymbol = [1 2 3 4];              % BPSK, QPSK, 8PSK, 16QAM
names = {'BPSK', 'QPSK', '8PSK', '16QAM'};
baud = 1200;

for k = 1:4
  fprintf('%6s: %4d baud -> %5d bit/s\\n', names{k}, baud, baud * bitsPerSymbol(k));
end

% QPSK mapping of the bit pair stream 00 01 11 10
pairs = [0 0; 0 1; 1 1; 1 0];
for k = 1:4
  fprintf('bits %d%d -> phase %d deg\\n', pairs(k,1), pairs(k,2), 45 + 90*k - 90);
end`,
        explanation: [
          'The ledger: same 1200 baud, bit rates 1200, 2400, 3600, 4800 — bits per symbol multiplies the rate.',
          'QPSK mapping check: k = 1 -> 45 deg for bits 00; k = 2 -> 135 for 01; k = 3 -> 225 for 11; k = 4 -> 315 for 10 — exactly the lesson table, generated arithmetically.',
          'Expected output, exactly:',
          '  BPSK: 1200 baud ->  1200 bit/s',
          '  QPSK: 1200 baud ->  2400 bit/s',
          '  8PSK: 1200 baud ->  3600 bit/s',
          ' 16QAM: 1200 baud ->  4800 bit/s',
          'bits 00 -> phase 45 deg',
          'bits 01 -> phase 135 deg',
          'bits 11 -> phase 225 deg',
          'bits 10 -> phase 315 deg',
          'Reading the constellation is the mirror operation: a received point at (−0.7, −0.7)-ish lands in the third quadrant -> 225° -> bits 11.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'QPSK constellation with Gray coding (I-Q plane)',
        content:
          '                Q\n                |\n       01 *     |     * 00\n   (135 deg)    |    (45 deg)\n                |\n  --------------+-------------- I\n                |\n       11 *     |     * 10\n   (225 deg)    |    (315 deg)\n                |\n\n  all four points at the same radius (constant envelope)\n  adjacent points differ in ONE bit (Gray):\n     00 <-> 01, 00 <-> 10, 11 <-> 01, 11 <-> 10\n  noise moves points; the detector picks the nearest quadrant\n  a small nudge corrupts exactly one bit, never two',
        caption:
          'The QPSK constellation: four points on the diagonals, Gray-coded so that the most likely mistake (one quadrant over) flips one bit.',
      },
      {
        kind: 'waveform',
        title: 'Eye diagram: open versus noisy (illustrative)',
        content:
          '  clean channel                   noisy channel\n\n  Hi ____        ____             Hi  ~~~___      ___~\n      \\  /      /    \\                \\    ~ \\    / ~\n       \\/      /      \\                ~\\___/ ~\\__/~\n       /\\     /        /                 ~ ~ eye ~ ~\n      /  \\___/        /              Lo  \\_/~~~\\__/\n  Lo\n       ^ sampling instant: eye wide open      eye nearly closed:\n       vertical gap = noise margin            errors imminent\n\n  (educational waveform (illustrative) — schematic overlay,\n   not measured data)',
        caption:
          'The eye diagram overlays all symbol periods. The vertical opening is the noise margin at the sampling instant; closing eyes predict the BER the detector will suffer.',
      },
    ],
    tables: [
      {
        caption: 'The modulation ledger (1200 baud example)',
        headers: ['Scheme', 'Bits/symbol', 'Symbol rate', 'Bit rate', 'Points'],
        rows: [
          ['BPSK', '1', '1200 baud', '1200 bit/s', '2'],
          ['QPSK', '2', '1200 baud', '2400 bit/s', '4'],
          ['8PSK', '3', '1200 baud', '3600 bit/s', '8'],
          ['16QAM', '4', '1200 baud', '4800 bit/s', '16'],
        ],
      },
      {
        caption: 'QPSK Gray mapping (as used in the example)',
        headers: ['Phase', 'I component', 'Q component', 'Bits'],
        rows: [
          ['45°', '+0.707', '+0.707', '00'],
          ['135°', '−0.707', '+0.707', '01'],
          ['225°', '−0.707', '−0.707', '11'],
          ['315°', '+0.707', '−0.707', '10'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Calling the symbol rate the bit rate.',
        fix: 'Bit rate = symbol rate x bits/symbol. Only BPSK makes them equal; for QPSK and above they differ by the ledger factor. Datasheets quoting "baud" and "bit/s" interchangeably are being sloppy — do not inherit the habit.',
      },
      {
        mistake: 'Assigning constellation bits in binary order (00, 01, 10, 11) around the circle.',
        fix: 'That skips Gray coding: neighbours 01 (01) and 10 would differ in two bits, doubling the bit errors from a one-quadrant slip. Always label constellations so adjacent points differ in exactly one bit.',
      },
      {
        mistake: 'Assuming higher-order modulation is always better.',
        fix: 'More points in the same circle shrink the decision margins: 16QAM needs several dB more SNR than QPSK for the same error rate. Higher order buys rate only when SNR can afford it — exactly the Shannon trade from module 01.',
      },
    ],
    guidedPractice: {
      title: 'Constellation drill',
      brief:
        'A receiver recovers QPSK samples at approximately (+0.7, −0.7), (−0.7, +0.7), (+0.7, +0.7). Decode each to bits using the Gray table. Then state the bit rate if these arrived at 2400 baud.',
      expectedBehavior:
        '(+0.7, −0.7) is quadrant IV -> 315° -> 10. (−0.7, +0.7) is quadrant II -> 135° -> 01. (+0.7, +0.7) is quadrant I -> 45° -> 00. Bit stream: 10 01 00. At 2400 baud QPSK: 4800 bit/s.',
      hints: [
        'Sign of I picks left/right; sign of Q picks up/down.',
        'Gray table: I+,Q+ = 00; I−,Q+ = 01; I−,Q− = 11; I+,Q− = 10.',
        'Bit rate = baud x 2 for QPSK.',
      ],
    },
    practiceExercises: [
      {
        title: 'Budget the upgrade',
        brief:
          'A 1 Mbaud link currently runs BPSK at 12 dB SNR and works with margin. A designer proposes 16QAM (4 bits/symbol) on the same link. Compute the new bit rate, and explain (one sentence each) what must be true of the SNR and what happens to the eye diagram if it is not.',
        expectedBehavior:
          'New bit rate = 1e6 x 4 = 4 Mbit/s (vs 1 Mbit/s). 16QAM\'s 16 points pack the same circle: the minimum decision distance shrinks about 4x versus BPSK, requiring roughly 8-10 dB more SNR for the same error rate. If the SNR does not rise, the constellation points blur together and the eye closes — errors rise sharply, and the link is worse than the BPSK it replaced.',
        hints: [
          'Bits/symbol: 4x the rate at the same baud.',
          'Same circle, more points: check the spacing.',
          'The eye diagram is the diagnostic that shows the failure.',
        ],
      },
      {
        title: 'Read a sick constellation',
        brief:
          'A live QPSK constellation shows all four points smeared into rings (correct angles, fuzzy radius) and slowly rotating together. Identify the two impairments suggested and the receiver function that fixes the rotation.',
        expectedBehavior:
          'Radial smearing with clean angles = amplitude noise (constant-envelope scheme, so amplitude noise does not directly cause bit errors); uniform rotation = carrier phase/frequency offset between transmitter and receiver. The fix for rotation is carrier recovery (a phase-locked loop tracking the carrier); the radial noise is mitigated by SNR, not by the detector.',
        hints: [
          'Angles carry the information in PSK.',
          'What does a slowly rotating constellation mean about the receiver\'s carrier estimate?',
        ],
      },
    ],
    assessment: {
      title: 'QPSK and constellations checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'A 2400 baud QPSK link carries what bit rate?',
          options: ['4800 bit/s', '2400 bit/s', '1200 bit/s', '9600 bit/s'],
          answer: '4800 bit/s',
          explanation:
            'QPSK carries 2 bits per symbol: 2400 x 2 = 4800 bit/s.',
          hint: 'Two bits per symbol.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why is Gray coding used on constellations?',
          options: [
            'So the most likely symbol error flips only one bit',
            'So the constellation is symmetric',
            'To double the bit rate',
            'To make detection threshold-free',
          ],
          answer: 'So the most likely symbol error flips only one bit',
          explanation:
            'Noise most often pushes a point into an adjacent position; Gray coding makes that adjacent position differ in exactly one bit, halving the average bit damage per symbol error.',
          hint: 'What is the most likely mistake under noise?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In a constellation diagram, greater distance between points means better noise immunity at fixed noise level.',
          answer: 'true',
          explanation:
            'The detector picks the nearest point; larger separation means a noise nudge must be larger to cause a wrong decision — the geometric statement of power efficiency versus spectral efficiency.',
          hint: 'How far must noise push a point to change the decision?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In two words: the diagnostic display made by overlaying all symbol periods of a received waveform is called an eye ______.',
          answer: 'diagram',
          explanation:
            'The eye diagram shows the vertical (noise) and horizontal (timing) margins at the sampling instant; closing eyes predict rising BER.',
          hint: 'The overlaid traces form an eye shape.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Constellation diagram', definition: 'I-Q plot of a scheme\'s symbols; the geometry encodes the rate/robustness trade.' },
      { term: 'Gray coding', definition: 'Bit labelling such that adjacent constellation points differ in one bit.' },
      { term: 'Symbol rate (baud)', definition: 'Modulation states per second; bit rate = baud x bits/symbol.' },
      { term: 'QPSK', definition: 'Four-phase PSK carrying two bits per symbol at 45/135/225/315 degrees.' },
      { term: 'Eye diagram', definition: 'Overlay of all symbol periods; opening sizes show noise and timing margins.' },
    ],
    revisionSummary: [
      'Bit rate = baud x bits/symbol: 1200 baud QPSK = 2400 bit/s.',
      'Gray code the constellation so one-quadrant slips cost one bit.',
      'More points = more bits/symbol but tighter decision geometry: needs more SNR.',
      'Constellation (symbol space) and eye diagram (time) are the two health views of a link.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Quadrature phase-shift keying', url: 'https://en.wikipedia.org/wiki/Phase-shift_keying#Quadrature_phase-shift_keying_(QPSK)', kind: 'article' },
      { label: 'Wikipedia — Constellation diagram', url: 'https://en.wikipedia.org/wiki/Constellation_diagram', kind: 'article' },
      { label: 'Wikipedia — Eye pattern', url: 'https://en.wikipedia.org/wiki/Eye_pattern', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
