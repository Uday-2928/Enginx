import type { TutorialLesson } from '../types';

export const module01Lessons: TutorialLesson[] = [
  {
    id: 'com-m01-l1',
    title: 'The Communication Chain: Source to Sink',
    summary:
      'The block diagram every radio, modem and satellite link shares: source, modulator, channel, demodulator, sink — and the baseband-versus-passband decision that starts it all.',
    objectives: [
      'Draw and label the standard communication system block diagram.',
      'Explain what each block contributes and where the design problems live.',
      'Distinguish baseband from passband signalling with concrete examples.',
      'Compute antenna sizes from wavelength to motivate modulation.',
    ],
    whyItMatters:
      'Every communication system ever built — telegraph, Wi-Fi, deep-space probes — is this one block diagram with different filling. Holding the diagram firmly means every later topic (modulation, noise, coding) has an obvious home, and reading a radio datasheet becomes a matter of identifying which blocks the chip integrates.',
    prerequisites: [
      'Comfort with sine waves and frequency in Hz',
      'dsp-m01-l1 or equivalent (sampling) is helpful but not required',
    ],
    explanation:
      '### The chain\n\n```\nsource --> transmitter --> channel --> receiver --> sink\n            (source          (noise,     (demodulate,   (user)\n             coding,          loss,       decode,\n             modulation)      distortion) amplify)\n```\n\n- **Source**: the information — voice, data, video — and its conversion into an electrical signal.\n- **Transmitter**: conditions the signal for the channel: source coding (compress), channel coding (add error protection, module 03), and **modulation** (shift it to the channel\'s frequency band).\n- **Channel**: the physical path — cable, fibre, air. It attenuates, delays, distorts, and adds **noise**. Everything the transmitter did is tested here.\n- **Receiver**: undoes the transmitter in reverse order — demodulate, decode, reconstruct — despite the channel\'s damage.\n- **Sink**: the human or machine that wanted the information.\n\nDesign effort concentrates at two interfaces: information into the transmitter (source and channel coding) and signal into the channel (modulation). The channel itself is not designed — it is endured — which is why the rest of the chain exists.\n\n### Baseband versus passband\n\nA **baseband** signal is centred at DC (or near it): a microphone output, a UART line, Ethernet-on-a-cable. A **passband** signal is shifted up to a carrier frequency so it can travel a wireless (or band-limited) channel: the same information, centred at 2.4 GHz or 100 MHz. **Modulation** is the act of moving baseband information onto a passband carrier; **demodulation** moves it back. Module 02 is entirely about the how; this lesson establishes the why.',
    deepDive:
      '### Why modulate at all: the antenna arithmetic\n\nAntennas work efficiently when their size is a meaningful fraction of the wavelength, lambda = c/f (c ≈ 3 x 10^8 m/s). A voice signal at 3 kHz has lambda = 3e8 / 3e3 = 100,000 m — a quarter-wave antenna would be **25 km** tall. The same voice shifted onto a 100 MHz carrier: lambda = 3 m, quarter-wave **75 cm** — a phone antenna. Modulation translates information to where physics is kind. The second reason is **sharing**: many users can occupy one medium simultaneously if each sits at a different carrier frequency (frequency-division multiplexing, FDM) — every radio station and every Wi-Fi channel is this idea. Modulation is therefore not decoration; it is the price of admission for both antenna physics and channel sharing.',
    examples: [
      {
        title: 'Wavelength and antenna-size arithmetic',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
c = 3e8;                    % speed of light, m/s
freqs = [3e3, 1e6, 1e9, 2.4e9];   % audio, AM band, 1 GHz, Wi-Fi

for k = 1:length(freqs)
  lambda = c / freqs(k);
  fprintf('f = %10.0f Hz -> lambda = %10.3f m, quarter-wave = %9.3f m\\n', ...
          freqs(k), lambda, lambda / 4);
end`,
        explanation: [
          'lambda = c/f: 3 kHz gives 100000 m; 1 MHz gives 300 m; 1 GHz gives 0.3 m; 2.4 GHz gives 0.125 m.',
          'Quarter-wave antennas: 25000 m, 75 m, 0.075 m, 0.031 m — only the GHz-range entries are physically buildable in a handset.',
          'Expected output, exactly:',
          'f =       3000 Hz -> lambda = 100000.000 m, quarter-wave = 25000.000 m',
          'f =    1000000 Hz -> lambda =    300.000 m, quarter-wave =    75.000 m',
          'f = 1000000000 Hz -> lambda =      0.300 m, quarter-wave =     0.075 m',
          'f = 2400000000 Hz -> lambda =      0.125 m, quarter-wave =     0.031 m',
          'This table is the entire motivation for modulation, in four lines: baseband audio cannot radiate; a 2.4 GHz carrier can.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'The communication chain with its three design fronts',
        content:
          '  source --> [source coder] --> [channel coder] --> [modulator] --+\n   (voice,                                                        |\n    data)                                                         v\n                                                              CHANNEL\n                                                              (loss, noise,\n   sink   <-- [source decoder] <-- [channel decoder] <-- [demodulator] distortion)\n\n  design fronts:  1. compression + error coding (modules 3 of this course)\n                  2. modulation onto the carrier (module 2)\n                  3. enduring the channel (this module: noise, SNR)',
        caption:
          'One diagram, five blocks, three design fronts. Every communication technology you will meet fills this template.',
      },
    ],
    tables: [
      {
        caption: 'Baseband versus passband',
        headers: ['Property', 'Baseband', 'Passband'],
        rows: [
          ['Spectrum location', 'Centred at/near DC', 'Centred on a carrier f_c'],
          ['Examples', 'UART line, audio, Ethernet baseband', 'FM radio at 100 MHz, Wi-Fi at 2.4 GHz'],
          ['Antenna-friendly?', 'No (huge wavelengths)', 'Yes (carrier chosen for the antenna)'],
          ['Sharing scheme', 'Time sharing on the wire', 'FDM: many carriers, one medium'],
        ],
      },
      {
        caption: 'Wavelength arithmetic (c = 3e8 m/s)',
        headers: ['Frequency', 'Wavelength', 'Quarter-wave antenna'],
        rows: [
          ['3 kHz (voice)', '100 km', '25 km — impossible'],
          ['1 MHz (AM)', '300 m', '75 m — tower scale'],
          ['100 MHz (FM)', '3 m', '75 cm — car antenna'],
          ['2.4 GHz (Wi-Fi)', '12.5 cm', '3.1 cm — phone antenna'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Drawing the chain with the channel coder after the modulator.',
        fix: 'Order matters: error coding operates on information bits *before* modulation, so the coded bits are what travel. Coding after modulation has no defined meaning in a standard chain.',
      },
      {
        mistake: 'Calling any high-frequency signal "passband information".',
        fix: 'The passband carrier carries no information itself — it is the vehicle. Information lives in the modulation (amplitude, frequency, phase changes), which is why module 02 exists.',
      },
      {
        mistake: 'Attributing all errors to "weak signal".',
        fix: 'The channel damages signals in at least three ways: attenuation (weaker), distortion (shape-changed), and noise (added). Different cures apply: amplification fixes the first, equalisation the second, and coding/power the third.',
      },
    ],
    guidedPractice: {
      title: 'Place the blocks',
      brief:
        'For a digital voice radio: (a) name the block where compression happens; (b) where error-correction coding happens; (c) where the signal acquires its carrier frequency; (d) where noise is added. Then state which two blocks the receiver mirrors in reverse order.',
      expectedBehavior:
        '(a) Source coder (compresses digitized voice). (b) Channel coder (adds redundancy). (c) Modulator (shifts to the carrier/passband). (d) The channel. The receiver mirrors in reverse: demodulator, then channel decoder, then source decoder.',
      hints: [
        'Coding acts on information bits; modulation acts on the waveform.',
        'Noise enters exactly where we have least control: the channel.',
        'The receiver is the transmitter read backwards.',
      ],
    },
    practiceExercises: [
      {
        title: 'Antenna for a doorbell',
        brief:
          'A wireless doorbell transmits at 433 MHz. Compute the wavelength and a sensible quarter-wave antenna length, then compare with what a 433 MHz "antenna" trace on a small PCB can achieve.',
        expectedBehavior:
          'lambda = 3e8/433e6 = 0.693 m; quarter-wave ≈ 17.3 cm. A PCB trace of a few cm is far short of resonant, so real doorbells either use a short helical/spiral antenna (electrically lengthened) or accept poor efficiency — the arithmetic explains the coiled antenna you see on cheap units.',
        hints: [
          'Divide 3e8 by 433e6.',
          'A quarter of 69 cm is 17 cm.',
        ],
      },
      {
        title: 'FDM inventory',
        brief:
          'An FM band spans 88-108 MHz with 200 kHz channel spacing. How many stations fit, and what does this have to do with modulation?',
        expectedBehavior:
          '(108 - 88) MHz / 0.2 MHz = 100 stations. Each station modulates its own carrier; receivers tune to one carrier and demodulate — FDM is only possible because modulation placed each source at a distinct frequency.',
        hints: [
          'Divide the band by the spacing.',
          'Each station occupies one carrier slot.',
        ],
      },
    ],
    assessment: {
      title: 'Communication chain checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the standard block diagram, where is noise added?',
          options: ['The channel', 'The modulator', 'The source', 'The sink'],
          answer: 'The channel',
          explanation:
            'The channel is the physical medium we do not control — attenuation, distortion and noise all enter there. The transmitter and receiver are engineered to defeat exactly that.',
          hint: 'Which block is not designed by us?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A voice signal at 3 kHz has what wavelength (c = 3e8 m/s)?',
          options: ['100 km', '100 m', '3 km', '1 km'],
          answer: '100 km',
          explanation:
            'lambda = c/f = 3e8/3e3 = 1e5 m = 100 km — a quarter-wave antenna would be 25 km, which is why audio is modulated onto radio carriers.',
          hint: 'Divide speed by frequency.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Channel coding is applied after modulation so that errors can be corrected in the air.',
          answer: 'false',
          explanation:
            'Channel coding adds redundancy to the information bits *before* modulation; the coded bits are what get modulated and transmitted. There is no meaningful "coding after modulation" in a standard chain.',
          hint: 'What exactly travels the channel: bits or waveforms?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In two words: the scheme that lets 100 FM stations share one band by placing each at its own carrier frequency is called ______ ______.',
          answer: 'frequency division',
          explanation:
            'Frequency-division multiplexing (FDM): distinct carriers per user, one medium. It is possible only because modulation translated each source to its own passband slot.',
          hint: 'Users divide the band by frequency.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Communication chain', definition: 'Source -> transmitter -> channel -> receiver -> sink; the universal block diagram.' },
      { term: 'Modulation', definition: 'Mapping information onto a carrier waveform (amplitude, frequency or phase) for the channel.' },
      { term: 'Baseband / passband', definition: 'Signals at/near DC versus signals centred on a carrier frequency.' },
      { term: 'FDM', definition: 'Frequency-division multiplexing: concurrent users at distinct carrier frequencies.' },
      { term: 'Wavelength', definition: 'lambda = c/f; sets practical antenna sizes and thus the case for modulation.' },
    ],
    revisionSummary: [
      'Five blocks, three design fronts: coding, modulation, enduring the channel.',
      'The receiver is the transmitter mirrored in reverse order.',
      'Baseband does not radiate efficiently; passband does — the antenna arithmetic proves it.',
      'Modulation buys antenna practicality and frequency sharing (FDM).',
    ],
    furtherReading: [
      { label: 'Wikipedia — Communication channel', url: 'https://en.wikipedia.org/wiki/Communication_channel', kind: 'article' },
      { label: 'Wikipedia — Modulation', url: 'https://en.wikipedia.org/wiki/Modulation', kind: 'article' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'com-m01-l2',
    title: 'Digitizing Recap and Thermal Noise',
    summary:
      'A brief, honest recap of sampling and quantization (linking to the DSP course), then the noise floor every receiver battles: where thermal noise comes from and how to compute it.',
    objectives: [
      'Recap sampling and quantization as the two steps of digitization, with the DSP course as the deep dive.',
      'State the origin of thermal noise and its power formula kTB.',
      'Compute the noise floor in dBm for a given bandwidth at room temperature.',
      'Explain why bandwidth trades against noise in every receiver.',
    ],
    whyItMatters:
      'Digital communication means converting the world to bits and defending those bits against physics. The sampling/quantization recap connects this course to the DSP track; the kTB noise floor is the ground truth every link budget stands on — you cannot sensibly discuss SNR (next lesson) without knowing what N is made of.',
    prerequisites: [
      'com-m01-l1 (the chain)',
      'Decibels will be formally introduced next lesson; only ratios appear here',
    ],
    explanation:
      '### Digitization in two steps (recap)\n\nGetting an analog signal into bits takes exactly two operations, covered deeply in the platform\'s DSP course:\n\n- **Sampling**: measure the signal every T seconds. Rule: fs > 2 x fmax, or frequencies fold back as aliases. A voice channel at 4 kHz needs fs > 8 kHz (telephony uses 8 kHz exactly).\n- **Quantization**: round each sample to 2^N levels. Each bit buys about 6 dB of signal-to-noise ratio; 8-bit voice at 8 kHz is the classic digital telephone.\n\nThis course assumes those steps are done and asks the next question: once the bits (or the modulated waveform carrying them) are in the channel, what is fighting them? The fundamental answer is **thermal noise**.\n\n### Thermal noise: physics, not malice\n\nEvery conductor\'s electrons jiggle because the conductor is warm. That agitation produces a random noise voltage across every resistor, with available power\n\n```\nP_noise = k T B\n```\n\nwhere k = 1.38e-23 J/K (Boltzmann), T is absolute temperature (kelvin), and B is the measurement bandwidth in Hz. Crucially, the noise power is **flat with frequency** (white) over practical bands and **proportional to bandwidth**: double the bandwidth, double the collected noise. At room temperature (T = 290 K), this works out to -174 dBm per hertz of bandwidth — the number every radio engineer memorises.\n\nWorked example: a 3 kHz telephone channel at 290 K:\n\n```\nP = kTB = 1.38e-23 x 290 x 3000 = 1.2e-17 W  =  -174 dBm/Hz + 10 log10(3000)\n        =  -174 + 34.8  =  -139.2 dBm\n```\n\nWider bands collect more noise: a 20 MHz Wi-Fi channel has a floor of -174 + 73 = -101 dBm. Bandwidth always costs noise — the trade-off Shannon formalises next lesson.',
    deepDive:
      '### What dBm means, in one paragraph\n\ndBm expresses power in decibels relative to one milliwatt: P(dBm) = 10 log10(P/1 mW). So 1 mW = 0 dBm, 100 mW = +20 dBm, and 1.2e-17 W = -139 dBm. The unit is beloved because link budgets become addition: transmitter power in dBm, minus cable losses, plus antenna gains, minus path loss, gives received power in dBm; subtract the noise floor in dBm and the receiver sensitivity — all additions and subtractions, no slide-rule exponent bookkeeping. The next lesson formalises the dB arithmetic with clean numbers; here you only need the one conversion: dBm = 10 log10(milliwatts).',
    examples: [
      {
        title: 'Noise floor versus bandwidth (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
k = 1.38e-23;   % Boltzmann constant, J/K
T = 290;        % room temperature, K
bw = [3000, 200e3, 20e6];   % phone, FM, Wi-Fi bandwidths

for b = 1:3
  p_watt = k * T * bw(b);
  p_dbm = 10 * log10(p_watt / 1e-3);
  fprintf('B = %8.0f Hz -> noise = %8.1f dBm\\n', bw(b), p_dbm);
end`,
        explanation: [
          'p_watt = kTB: 1.2e-17 W for 3 kHz; 8.0e-16 W for 200 kHz; 8.0e-14 W for 20 MHz.',
          'dBm conversion: 10 log10(p/1 mW). For 3 kHz: 10 log10(1.2e-14) = -139.2 dBm.',
          'Shortcut check: -174 dBm/Hz + 10 log10(B). 10 log10(3000) = 34.8 -> -139.2. 10 log10(20e6) = 73 -> -101.0.',
          'Expected output, exactly:',
          'B =     3000 Hz -> noise =  -139.2 dBm',
          'B =   200000 Hz -> noise =  -121.0 dBm',
          'B = 20000000 Hz -> noise =  -101.0 dBm',
          'The trend is the lesson: every 10x of bandwidth adds 10 dB of noise floor — bandwidth is never free.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Where digitization ends and this course begins',
        content:
          '  analog world                digital world\n\n  voice -->[sampler]-->[quantizer]--> bits --> [source coder]\n            fs > 2fmax   ~6 dB/bit            |\n            (dsp-fundamentals course)         v\n                                        [channel coder]\n                                              |\n     ... this course picks up here: the bits must\n     survive channel noise, starting with the kTB floor.',
        caption:
          'Sampling and quantization (DSP course) create the bits; noise (this module) tests them. The -174 dBm/Hz floor is where every link budget starts.',
      },
    ],
    tables: [
      {
        caption: 'Thermal noise floor at 290 K versus bandwidth',
        headers: ['Bandwidth', 'System', 'Noise floor'],
        rows: [
          ['3 kHz', 'Telephone channel', '-139.2 dBm'],
          ['200 kHz', 'FM channel', '-121.0 dBm'],
          ['20 MHz', 'Wi-Fi channel', '-101.0 dBm'],
          ['1 Hz (reference)', '—', '-174.0 dBm'],
        ],
      },
      {
        caption: 'Digitization recap card',
        headers: ['Step', 'Rule', 'Cost of violation'],
        rows: [
          ['Sampling', 'fs > 2 fmax', 'Aliasing: false frequencies fold in'],
          ['Quantization', 'SNR ~ 6.02N + 1.76 dB', 'Coarse steps: hiss/distortion'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Treating noise power as independent of receiver bandwidth.',
        fix: 'P = kTB: the receiver collects noise across every hertz it opens. A wider filter admits more noise; the design habit is matching bandwidth to the signal\'s actual needs, not "as wide as possible".',
      },
      {
        mistake: 'Confusing dBm with dB.',
        fix: 'dB is a ratio (of powers); dBm is an absolute power referenced to 1 mW. Gains add in dB; powers live in dBm. Mixing them in a link budget is a unit error, not a style choice.',
      },
      {
        mistake: 'Colder receivers "create" less noise — always an improvement.',
        fix: 'Lowering T lowers kTB, which helps, but real receivers add their own noise (noise figure) on top; cooling the antenna does not cool the amplifier. The budget is kTB plus the receiver\'s excess — next lesson\'s SNR is where both sides meet.',
      },
    ],
    guidedPractice: {
      title: 'Noise floor drill',
      brief:
        'Compute the thermal noise floor at 290 K for (a) a 5 kHz channel, (b) a 10 MHz channel. Use -174 dBm/Hz + 10 log10(B) and give answers in dBm.',
      expectedBehavior:
        '(a) 10 log10(5000) = 37.0 -> -174 + 37.0 = -137.0 dBm. (b) 10 log10(1e7) = 70.0 -> -104.0 dBm.',
      hints: [
        '10 log10(5e3): log10(5) = 0.7.',
        '10 log10(1e7) = 70 exactly.',
        'Every 10x bandwidth = +10 dB.',
      ],
    },
    practiceExercises: [
      {
        title: 'Bandwidth versus noise trade',
        brief:
          'A receiver needs 2x more data rate, which its designer proposes to get by doubling the bandwidth. State the noise-floor consequence in dB, and what the signal power must do to keep the same SNR.',
        expectedBehavior:
          'Doubling bandwidth adds 10 log10(2) = 3.01 dB of noise. To keep SNR constant, signal power must rise by the same 3 dB (double). Nothing is free: bandwidth costs noise, and SNR is the currency.',
        hints: [
          'kTB is linear in B.',
          'dB for a factor of 2 in power is about 3.',
        ],
      },
      {
        title: 'Link the courses',
        brief:
          'A voice link digitizes 4 kHz audio at 8 bits. Using the DSP rule SNR ≈ 6.02N + 1.76 dB, state the quantization SNR, and explain in one sentence why the *channel* SNR next lesson is a different quantity.',
        expectedBehavior:
          'Quantization SNR = 6.02 x 8 + 1.76 = 49.9 dB — the noise created *inside* the converter. Channel SNR compares received signal power against kTB-plus-receiver noise *outside*, set by the link. They are independent budgets that both limit end-to-end quality; the smaller one dominates.',
        hints: [
          '6 dB per bit, plus 1.76.',
          'One noise source is designed-in; the other is physics plus distance.',
        ],
      },
    ],
    assessment: {
      title: 'Digitization and noise checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the thermal noise power formula?',
          options: ['P = kTB', 'P = hf', 'P = V^2/R x T', 'P = kT/B'],
          answer: 'P = kTB',
          explanation:
            'Boltzmann constant times absolute temperature times bandwidth. Linear in T and in B; about -174 dBm/Hz at room temperature.',
          hint: 'Three factors: constant, temperature, bandwidth.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A 20 MHz Wi-Fi channel at 290 K has a thermal noise floor of about...',
          options: ['-101 dBm', '-139 dBm', '-174 dBm', '-87 dBm'],
          answer: '-101 dBm',
          explanation:
            '-174 dBm/Hz + 10 log10(20e6) = -174 + 73 = -101 dBm. Wideband receivers collect proportionally more noise.',
          hint: 'Start from -174 dBm/Hz and add 10 log10 of the bandwidth.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Doubling a receiver\'s bandwidth doubles the collected thermal noise power.',
          answer: 'true',
          explanation:
            'P = kTB is linear in B: doubling B doubles P, which is +3.01 dB. This is why bandwidth is a noise budget item.',
          hint: 'Which factor of kTB changes?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one number: an 8-bit quantizer offers about how many dB of quantization SNR (to one decimal)?',
          answer: '49.9',
          explanation:
            '6.02 x 8 + 1.76 = 49.92 ≈ 49.9 dB — the DSP course\'s rule, applied to the digitization step this course builds upon.',
          hint: '6.02 x 8, then add 1.76.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Sampling', definition: 'Measuring a signal at fs > 2 fmax to capture it without aliasing.' },
      { term: 'Quantization', definition: 'Rounding samples to 2^N levels; about 6 dB SNR per bit.' },
      { term: 'Thermal noise', definition: 'Random noise from electron agitation: P = kTB, about -174 dBm/Hz at 290 K.' },
      { term: 'dBm', definition: 'Power in decibels relative to 1 mW: dBm = 10 log10(P/1 mW).' },
      { term: 'Noise floor', definition: 'The kTB noise power collected across the receiver bandwidth.' },
    ],
    revisionSummary: [
      'Digitization = sampling (fs > 2fmax) + quantization (~6 dB/bit) — the DSP course\'s territory.',
      'Thermal noise: P = kTB; flat with frequency, linear in bandwidth.',
      '-174 dBm/Hz at 290 K; add 10 log10(B) for your bandwidth.',
      'Wider band = more noise: bandwidth is a budget item, not a free resource.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Thermal noise', url: 'https://en.wikipedia.org/wiki/Johnson%E2%80%93Nyquist_noise', kind: 'article' },
      { label: 'Wikipedia — dBm', url: 'https://en.wikipedia.org/wiki/DBm', kind: 'article' },
      { label: 'The Scientist and Engineer\'s Guide to DSP — sampling chapters', url: 'https://www.dspguide.com/ch3.htm', kind: 'docs' },
    ],
    estimatedMinutes: 35,
  },
  {
    id: 'com-m01-l3',
    title: 'SNR Arithmetic and the Shannon Limit',
    summary:
      'Decibel math with clean numbers, the SNR definition that anchors every link budget, and Shannon\'s capacity formula with one fully worked example.',
    objectives: [
      'Compute SNR in dB from signal and noise powers, and convert back to ratios.',
      'Add and subtract dB fluently for link budgets.',
      'State the Shannon capacity formula and compute C for clean numbers.',
      'Reason about what the limit means (and does not mean) for real designs.',
    ],
    whyItMatters:
      'The two calculations in this lesson — an SNR and a Shannon capacity — appear in every communications interview, every link-budget spreadsheet and every datasheet margin analysis. Both use arithmetic you can do in your head once shown, and both separate engineers who understand links from engineers who run software that does.',
    prerequisites: [
      'com-m01-l2 (thermal noise, dBm)',
      'Logarithms at the level of log10(100) = 2',
    ],
    explanation:
      '### SNR in decibels\n\nThe **signal-to-noise ratio** compares received signal power to noise power:\n\n```\nSNR(dB) = 10 log10( Ps / Pn )\n```\n\nWorked with clean numbers: Ps = 100 mW, Pn = 1 mW: SNR = 10 log10(100) = **20 dB**. Another: Ps = 3 W, Pn = 30 mW: ratio 100 again — **20 dB** again. Only the ratio matters. The dB rules of thumb worth burning in: every factor of 10 is +10 dB, every factor of 2 is +3 dB, and dB values *add* through a chain.\n\n### Link budgets are addition\n\nBecause dB is logarithmic, a link\'s arithmetic collapses to sums:\n\n```\nTX power (+20 dBm) - cable loss (2 dB) + TX antenna (2 dBi)\n- path loss (100 dB) + RX antenna (0 dBi) = received power -80 dBm\nSNR = received power - noise floor\n```\n\nIf the noise floor is -101 dBm (the 20 MHz Wi-Fi channel from last lesson), SNR = -80 - (-101) = **21 dB**. Every term auditable by hand — that is why the unit survived a century of radio.\n\n### Shannon\'s limit\n\nClaude Shannon proved that a channel of bandwidth B and signal-to-noise ratio SNR (as a *linear* ratio) has a maximum error-free bit rate:\n\n```\nC = B log2( 1 + SNR )\n```\n\nWorked example: B = 3000 Hz, SNR such that the ratio is 1023 (i.e., 10 log10(1023) ≈ 30 dB — call it "30 dB class"):\n\n```\nC = 3000 x log2(1024) = 3000 x 10 = 30,000 bit/s\n```\n\nExactly 30 kbit/s — the numbers were chosen so the log vanishes cleanly. With a true 30.0 dB SNR (ratio 1000): log2(1001) = 9.967, giving C ≈ 29,900 bit/s: about the same. Two readings of the formula that matter: **below** C, codes exist that make errors arbitrarily rare (this is what modern modems achieve); **above** C, no amount of cleverness helps. Shannon gives the ceiling, not the design.',
    deepDive:
      '### What Shannon does and does not promise\n\nThe formula promises *existence*: codes approaching C exist, with delay and complexity as the price — it does not hand you a modulation and coding scheme. Practical systems sit several dB below the ideal curve (real codes, finite blocks, implementation losses); a link plan that budgets to exactly C is a plan to fail. The formula\'s two levers are also worth internalising: capacity grows *linearly* with bandwidth but only *logarithmically* with power — doubling bandwidth doubles C, but doubling transmit power adds just 1 bit/s/Hz-ish to the log term at high SNR. That asymmetry is why spectrum is precious and why modern systems chase spectral efficiency (bits/s/Hz, module 02\'s constellations) rather than raw power.',
    examples: [
      {
        title: 'SNR and Shannon calculator (GNU Octave)',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% SNR from powers
Ps = [100, 3000];    % mW
Pn = [1,   30];      % mW
for k = 1:2
  snr_db = 10 * log10(Ps(k) / Pn(k));
  fprintf('Ps=%5.0f mW, Pn=%3.0f mW -> SNR = %5.1f dB\\n', Ps(k), Pn(k), snr_db);
end

% Shannon capacity
B = 3000;
snr_linear = 1023;
C = B * log2(1 + snr_linear);
fprintf('C = %.0f bit/s (B=%d Hz, ratio %d)\\n', C, B, snr_linear);

snr30 = 1000;                       % true 30 dB
fprintf('C = %.1f bit/s at exactly 30 dB\\n', B * log2(1 + snr30));`,
        explanation: [
          'First SNR: 100/1 = 100 -> 20.0 dB. Second: 3000/30 = 100 -> 20.0 dB — same ratio, same dB, different absolute powers.',
          'Shannon with ratio 1023: log2(1024) = 10 exactly, so C = 30,000 bit/s.',
          'At a true 30 dB (ratio 1000): log2(1001) = 9.9672 -> C = 29901.7 bit/s — the clean-number version and reality agree to 0.3%.',
          'Expected output, exactly:',
          'Ps=  100 mW, Pn=  1 mW -> SNR =  20.0 dB',
          'Ps= 3000 mW, Pn= 30 mW -> SNR =  20.0 dB',
          'C = 30000 bit/s (B=3000 Hz, ratio 1023)',
          'C = 29901.7 bit/s at exactly 30 dB',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'A link budget as pure addition (illustrative numbers)',
        content:
          '  TX power.................... +20 dBm\n  - cable loss................ -  2 dB\n  + TX antenna gain........... +  2 dB\n  - path loss................. -100 dB\n  + RX antenna gain........... +  0 dB\n  ------------------------------------\n  received power.............. -80 dBm\n  - noise floor (20 MHz)...... -(-101 dBm)\n  ------------------------------------\n  SNR......................... +21 dB\n\n  Every line is addition/subtraction -- that is why dB won.',
        caption:
          'A complete link budget in five additions. The SNR then feeds the Shannon formula (as a linear ratio) to bound the achievable bit rate.',
      },
    ],
    tables: [
      {
        caption: 'dB arithmetic you must know cold',
        headers: ['Power ratio', 'dB', 'Memory hook'],
        rows: [
          ['1', '0 dB', 'no change'],
          ['2', '3 dB', 'double'],
          ['4', '6 dB', 'double twice'],
          ['10', '10 dB', 'order of magnitude'],
          ['100', '20 dB', 'two orders'],
          ['1000', '30 dB', 'three orders'],
          ['0.5', '-3 dB', 'half'],
        ],
      },
      {
        caption: 'Shannon capacity examples (C = B log2(1+SNR))',
        headers: ['B', 'SNR (dB)', 'Linear ratio', 'C'],
        rows: [
          ['3 kHz', '≈30', '1023', '30.0 kbit/s'],
          ['3 kHz', '30.0', '1000', '29.9 kbit/s'],
          ['3 kHz', '20', '100', '19.97 kbit/s (log2 101 = 6.66)'],
          ['20 MHz', '20', '100', '132.6 Mbit/s'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Plugging the dB value of SNR into Shannon\'s formula.',
        fix: 'The formula needs the *linear* ratio: SNR = 10^(dB/10). A 30 dB SNR is a ratio of 1000, and log2(1 + 1000) ≈ 10 — not log2(31). Convert first, always.',
      },
      {
        mistake: 'Treating the Shannon limit as a target to design against.',
        fix: 'It is a ceiling: real codes, finite block lengths and implementation losses keep practical systems below it. Budget margin (several dB) below the limit; treat "near-Shannon" claims as marketing until the code family is named.',
      },
      {
        mistake: 'Adding SNR in dB across stages of a receiver.',
        fix: 'dB adds for *gains* (powers multiply), but cascaded noise contributions need Friis-style analysis — each stage adds its own noise. Do not simply sum stage SNRs; compute stage gains and noise figures properly.',
      },
    ],
    guidedPractice: {
      title: 'Budget and bound',
      brief:
        'A link delivers -90 dBm of received signal into a 200 kHz channel (noise floor -123 dBm). Compute the SNR in dB, convert to a linear ratio (nearest power of ten), and compute Shannon capacity.',
      expectedBehavior:
        'SNR = -90 - (-123) = 33 dB. Linear ratio = 10^3.3 ≈ 2000. C = 200,000 x log2(1 + 2000) ≈ 200,000 x 10.97 ≈ 2.19 Mbit/s.',
      hints: [
        'SNR = received power - noise floor (dB subtraction).',
        '33 dB: three decades (30 dB) plus 3 dB (factor 2) -> 2000.',
        'log2(2001) is a little under 11.',
      ],
    },
    practiceExercises: [
      {
        title: 'Double the bandwidth or double the power?',
        brief:
          'At high SNR, compare the capacity gain from doubling B against doubling transmit power (which roughly doubles the SNR ratio). Use B = 1 MHz, SNR ratio 1023 as the base, and compute both new capacities.',
        expectedBehavior:
          'Base: C = 1e6 x 10 = 10 Mbit/s. Doubling B: 2e6 x 10 = 20 Mbit/s (+100%). Doubling power (ratio 2046): log2(2047) ≈ 11.0 -> C = 11.0 Mbit/s (+10%). At high SNR, bandwidth wins massively over power — the deep-dive asymmetry, quantified.',
        hints: [
          'log2(1024) = 10; log2(2048) = 11.',
          'Percent changes: 20 vs 11 Mbit/s from the same 10 Mbit/s base.',
        ],
      },
      {
        title: 'Audit the link budget',
        brief:
          'A plan claims: TX +30 dBm, cable -3 dB, antennas +2 and +2 dBi, path loss -110 dB, into a 10 MHz channel (noise floor -104 dBm), and declares SNR = 17 dB and capacity C = 10 log2(18) Mbit/s ≈ 42 Mbit/s. Check every step and correct any errors.',
        expectedBehavior:
          'Received power = 30 - 3 + 2 - 110 + 2 = -79 dBm. SNR = -79 + 104 = 25 dB (the claim of 17 dB is wrong). Linear ratio = 10^2.5 ≈ 316. C = 10e6 x log2(317) ≈ 10e6 x 8.31 = 83.1 Mbit/s. The claimed 42 Mbit/s used the dB value inside the log (log2(18) ≈ 4.17) — the exact mistake this lesson warns against.',
        hints: [
          'Add the budget step by step.',
          'SNR = received power minus noise floor.',
          'Convert 25 dB to a ratio BEFORE the log.',
        ],
      },
    ],
    assessment: {
      title: 'SNR and Shannon checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Ps = 3 W and Pn = 30 mW. What is the SNR in dB?',
          options: ['20 dB', '23 dB', '30 dB', '17 dB'],
          answer: '20 dB',
          explanation:
            'Ratio = 3/0.03 = 100; 10 log10(100) = 20 dB. Only the ratio matters — the same answer as 100 mW over 1 mW.',
          hint: 'Divide first, then take 10 log10.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'With B = 3000 Hz and an SNR ratio of 1023, Shannon capacity is...',
          options: ['30,000 bit/s', '3,000 bit/s', '102,300 bit/s', '300,000 bit/s'],
          answer: '30,000 bit/s',
          explanation:
            'C = B log2(1 + SNR) = 3000 x log2(1024) = 3000 x 10 = 30,000 bit/s.',
          hint: 'log2(1024) = 10.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A system transmitting above the Shannon capacity of its channel can still work if it uses a very good error-correcting code.',
          answer: 'false',
          explanation:
            'Shannon\'s result is a hard ceiling: above C, no code of any quality achieves arbitrarily low error rates. Codes approach the limit from below; they never cross it.',
          hint: 'Which direction does the theorem bind?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'Convert an SNR of 30 dB to its linear power ratio (number only).',
          answer: '1000',
          explanation:
            'Ratio = 10^(30/10) = 10^3 = 1000. Each 10 dB is one decade: 30 dB is three.',
          hint: '10 dB per decade of power.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'SNR', definition: 'Signal-to-noise power ratio; expressed in dB as 10 log10(Ps/Pn).' },
      { term: 'Link budget', definition: 'The dB addition of gains and losses from transmitter to receiver, ending in received power and SNR.' },
      { term: 'Shannon capacity', definition: 'C = B log2(1 + SNR): the maximum error-free bit rate of a bandlimited noisy channel.' },
      { term: 'Spectral efficiency', definition: 'Bits per second per hertz; the quantity modern systems optimise.' },
      { term: 'dB rules of thumb', definition: '+10 dB per factor of 10 in power, +3 dB per factor of 2.' },
    ],
    revisionSummary: [
      'SNR(dB) = 10 log10(Ps/Pn); ratios 10, 100, 1000 -> 10, 20, 30 dB.',
      'Link budgets are dB addition; SNR = received power - noise floor.',
      'Shannon: C = B log2(1 + SNR) with the LINEAR ratio; 3000 Hz at ratio 1023 gives exactly 30 kbit/s.',
      'Below C: codes can succeed. Above C: nothing can. Practical systems sit below C with margin.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Shannon-Hartley theorem', url: 'https://en.wikipedia.org/wiki/Shannon%E2%80%93Hartley_theorem', kind: 'article' },
      { label: 'Wikipedia — Decibel', url: 'https://en.wikipedia.org/wiki/Decibel', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
];
