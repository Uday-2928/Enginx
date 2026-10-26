import type { TutorialLesson } from '../types';

export const module04Lessons: TutorialLesson[] = [
  {
    id: 'dsp-m04-l1',
    title: 'Fixed-Point Numbers: Q-Format by Hand',
    summary:
      'When there is no floating-point unit: binary scaling, Q-notation, the range-versus-precision trade, and every Q4.4 value worked out in Octave.',
    objectives: [
      'Explain fixed-point as integers with an agreed binary scale factor.',
      'Read and write Q-format values (Q4.4 focus): range, step, and conversions both ways.',
      'Convert between real values and Q4.4 integer encodings by hand.',
      'Choose a Q-format for a given dynamic range and precision requirement.',
    ],
    whyItMatters:
      'Most DSP in the world runs on hardware without floating point: sensor MCUs, hearing aids, digital radio, older audio chips. Fixed-point is how they do it — faster, smaller, lower-power — and it is the default in RTL, which matters for this platform\'s FPGA track. The Q-notation in this lesson is the shared language between algorithm designers and implementers.',
    prerequisites: [
      'Two\'s complement integers',
      'dsp-m01-l3 (quantization intuition — fixed point is quantization you control)',
    ],
    explanation:
      'A **fixed-point** number is an integer that both sides agree to interpret as scaled: store the integer, and every operation accounts for a fixed power-of-two scale. In **Q-notation**, Qm.n means m integer bits, n fraction bits (the total is the storage width). **Q4.4** is an 8-bit format with the binary point after 4 bits:\n\n```\nbits:    s iii . ffff        (sign, 4 integer bits, 4 fraction bits)\nvalue  = stored_byte / 2^4  = stored_byte / 16\nrange:  -8.0  to  +7.9375   (step 1/16 = 0.0625)\n```\n\nConversions, both directions:\n\n- **Real to stored**: multiply by 16 and round. 3.5 x 16 = 56 = 0x38. -2.25 x 16 = -36; in 8-bit two\'s complement -36 is 0xDC.\n- **Stored to real**: divide by 16. 0x2A = 42 -> 2.625. 0x7F = 127 -> 7.9375.\n\nThe design decision is always the same trade: more fraction bits (larger n) give finer precision but a smaller maximum; more integer bits give range at the cost of precision. Q4.4 spans ±8 with 1/16 steps; Q2.6 (same 8 bits) spans ±2 with 1/64 steps. You pick per signal: a sensor reading that never exceeds 5 V but needs millivolt resolution wants n large; an accumulator that can reach 100 wants m large.',
    deepDive:
      '### Why power-of-two scales (and not 10, 100, 1000)\n\nDividing by 2^n is a bit-shift: free, exact, single-cycle. Dividing by 100 is a genuine division: slower, and in fixed-point hardware often approximated by shift-and-subtract sequences. So fixed-point formats are always binary-scaled. The practical consequence is that decimal fractions rarely land exactly: 0.1 in Q4.4 is 1.6/16 -> rounds to 2/16 = 0.125. Designers either accept the 25% error on that coefficient, widen the format (0.1 in Q4.12 is 409.6 -> 410/4096 = 0.100098, off by 0.01%), or rescale the algorithm so the constants are binary-friendly. Module 04\'s last lesson shows the same arithmetic inside a running filter.',
    examples: [
      {
        title: 'Q4.4 decode table, computed in GNU Octave',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
q = 16;                    % scale factor 2^4
vals = [56, 220, 42, 127]; % raw stored bytes

for k = 1:4
  s = vals(k);
  if s > 127
    s = s - 256;           % two's complement interpretation
  end
  fprintf('0x%02X -> %.4f\\n', vals(k), s / q);
end`,
        explanation: [
          'Values above 127 have the sign bit set and are converted to their two\'s complement value by subtracting 256.',
          '0x38 = 56 -> 56/16 = 3.5000.',
          '0xDC = 220 -> 220 - 256 = -36 -> -36/16 = -2.2500.',
          '0x2A = 42 -> 42/16 = 2.6250.',
          '0x7F = 127 -> 127/16 = 7.9375 (the largest positive Q4.4 value).',
          'Expected output, exactly:',
          '0x38 -> 3.5000',
          '0xDC -> -2.2500',
          '0x2A -> 2.6250',
          '0x7F -> 7.9375',
          'Encoding check (the reverse direction): 3.5 x 16 = 56 = 0x38, and -2.25 x 16 = -36, whose 8-bit two\'s complement is 256 - 36 = 220 = 0xDC.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Q4.4 bit layout and number line (illustrative)',
        content:
          '  byte:   [ s | i i i | f f f f ]\n            s = sign (two\'s complement)\n            iii = integer part (weight 8, 4, 2)\n            ffff = fraction (weight 1/2, 1/4, 1/8, 1/16)\n\n  0x38 = 0011 1000:\n            s=0  iii=011 (3)  ffff=1000 (8/16 = 0.5)  ->  3.5\n\n  number line (Q4.4):\n   -8  -7.9375 ........................ 0 ... 3.5 ... 7.9375\n   ^min                                  ^0      ^0x38   ^max\n   step = 1/16 = 0.0625 everywhere',
        caption:
          'The binary point is an interpretation, not a stored bit: the same byte is 56 as an integer and 3.5 in Q4.4. Only the agreed convention differs.',
      },
    ],
    tables: [
      {
        caption: 'Common Q-formats on an 8-bit and 16-bit word',
        headers: ['Format', 'Width', 'Range', 'Step'],
        rows: [
          ['Q4.4', '8 bits', '-8.0 to 7.9375', '0.0625'],
          ['Q2.6', '8 bits', '-2.0 to 1.984375', '0.015625'],
          ['Q7.8', '16 bits', '-128.0 to 127.996', '0.00390625 (1/256)'],
          ['Q1.15', '16 bits', '-1.0 to 0.99997', '0.0000305 (1/32768)'],
        ],
      },
      {
        caption: 'Q4.4 conversions used in this lesson',
        headers: ['Real value', 'x16 (round)', 'Stored byte', 'Hex'],
        rows: [
          ['3.5', '56', '56', '0x38'],
          ['-2.25', '-36', '220 (two\'s complement)', '0xDC'],
          ['2.625', '42', '42', '0x2A'],
          ['7.9375', '127', '127', '0x7F'],
          ['0.1', '1.6 -> 2', '2', '0x02 (stored) = 0.125 (25% error)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing formats in one expression without rescaling.',
        fix: 'Q4.4 times Q4.4 yields Q8.8 (16 bits): the product must be shifted right by 4 before it is Q4.4 again. Adding Q4.4 to Q2.6 directly corrupts the binary point — align scales first. Track the format of every variable in a comment.',
      },
      {
        mistake: 'Assuming the stored byte "means" its integer value.',
        fix: 'The byte means nothing until the Q-format is stated: 0x38 is 56 raw, 3.5 in Q4.4, 0.21875 in Q8.8, 14.0 in Q0.4... wait, carefully: 56/16 in Q0.4 would be 3.5 as well only if the format were Q4.4 — the point is the scale factor must be agreed. Declare formats at the interface of every function.',
      },
      {
        mistake: 'Choosing the format from the *average* signal level instead of the worst case.',
        fix: 'Range is set by peaks (and transients), not averages. Leave headroom for the largest conceivable sum of terms in an accumulator — module 04\'s next lesson shows saturation logic as the safety net when headroom runs out mid-signal.',
      },
    ],
    guidedPractice: {
      title: 'Encode and decode, both directions',
      brief:
        'Convert to Q4.4: 1.75, -0.5, 6.25. Then decode: 0xC0 and 0x15. Verify one of your encodings with the two\'s complement arithmetic shown in the lesson.',
      expectedBehavior:
        '1.75 x 16 = 28 = 0x1C. -0.5 x 16 = -8 -> 256-8 = 248 = 0xF8. 6.25 x 16 = 100 = 0x64. Decode: 0xC0 = 192 -> 192-256 = -64 -> -64/16 = -4.0. 0x15 = 21 -> 21/16 = 1.3125.',
      hints: [
        'Multiply by 16 first, then round to an integer.',
        'Negative encodings: convert the magnitude to 8-bit two\'s complement (256 - value).',
        '0xC0 = 1100 0000: sign bit set -> negative.',
      ],
    },
    practiceExercises: [
      {
        title: 'Format selection',
        brief:
          'A signal ranges from -3.0 to +3.0 and needs resolution of at least 0.01. Choose an 8-bit or 16-bit Q-format, state its range and step, and justify why the alternatives fail.',
        expectedBehavior:
          'Need range > 3 and step <= 0.01. 8-bit options: Q4.4 has range 8 but step 0.0625 (too coarse); Q2.6 has step 0.015625 (still too coarse) and range 2 (too small); Q1.7 step 0.0078 with range 1 (too small). No 8-bit format works. 16-bit Q7.8: range 128, step 0.0039 — both requirements met with headroom.',
        hints: [
          'The format must satisfy both constraints simultaneously.',
          'Qm.n on a 16-bit word: n fraction bits give step 2^-n; m = 15 - n integer bits.',
        ],
      },
      {
        title: 'Decimal constants in binary scales',
        brief:
          'A coefficient 0.25 must live in Q4.4 and a coefficient 0.2 must live in Q4.12 (16-bit). Compute both stored values and the relative error of each.',
        expectedBehavior:
          '0.25 x 16 = 4 -> stored 4, exact (0% error). 0.2 x 4096 = 819.2 -> round to 819; 819/4096 = 0.199951; error = (0.2 - 0.199951)/0.2 = 0.000244 = 0.024%. In Q4.4, 0.2 x 16 = 3.2 -> 3 -> 3/16 = 0.1875, a 6.25% error — the same coefficient, two formats, very different fidelity.',
        hints: [
          'Q4.12 scale is 2^12 = 4096.',
          'Relative error = |exact - stored| / exact.',
          'Binary scales love quarters and hate fifths.',
        ],
      },
    ],
    assessment: {
      title: 'Q-format checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What real value does the byte 0x2A represent in Q4.4?',
          options: ['2.625', '42.0', '0.164', '5.25'],
          answer: '2.625',
          explanation:
            '0x2A = 42; Q4.4 divides by 16: 42/16 = 2.625. (42 would be the plain integer reading; 2.625 is the Q4.4 reading.)',
          hint: '42 divided by 2^4.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the range of the Q4.4 format?',
          options: ['-8.0 to +7.9375', '-7.9375 to +7.9375', '0 to 255', '-16 to +16'],
          answer: '-8.0 to +7.9375',
          explanation:
            'Stored bytes -128..127 divided by 16: -8.0 up to 127/16 = 7.9375. The range is asymmetric because two\'s complement has one more negative value.',
          hint: 'Divide the integer range -128..127 by 16.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In Q4.4, the decimal constant 0.1 can be stored exactly.',
          answer: 'false',
          explanation:
            '0.1 x 16 = 1.6, which is not an integer. The nearest stored value is 2 (0.125) — a 25% error. Binary scales represent powers-of-two fractions exactly and most decimals only approximately.',
          hint: 'Is 1.6 an integer?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'A Q4.4 value is multiplied by another Q4.4 value. What Q-format is the raw 16-bit product in (format only, e.g. Qa.b)?',
          answer: 'Q8.8',
          explanation:
            'Fraction bits add under multiplication: 4 + 4 = 8 fraction bits (and 8 integer bits). The product must be shifted right by 4 to return to Q4.4.',
          hint: 'n bits of fraction times n bits of fraction.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Fixed-point', definition: 'Integer storage interpreted with a fixed power-of-two scale factor.' },
      { term: 'Q-notation (Qm.n)', definition: 'm integer bits and n fraction bits; scale factor 2^-n.' },
      { term: 'Binary point', definition: 'The implied division point between integer and fraction bits — a convention, not stored data.' },
      { term: 'Step size', definition: '2^-n: the smallest representable difference in Qm.n.' },
    ],
    revisionSummary: [
      'Fixed point = integer x 2^-n; Q4.4 means divide (or multiply) by 16.',
      'Range -8..7.9375, step 0.0625 for Q4.4; more fraction bits = finer but smaller.',
      'Negative encodings use two\'s complement on the scaled integer.',
      'Decimals are rarely exact in binary scales; check coefficient error when choosing formats.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Q (number format)', url: 'https://en.wikipedia.org/wiki/Q_(number_format)', kind: 'article' },
      { label: 'Wikipedia — Fixed-point arithmetic', url: 'https://en.wikipedia.org/wiki/Fixed-point_arithmetic', kind: 'article' },
      { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'dsp-m04-l2',
    title: 'Scaling and Saturation in Fixed-Point Arithmetic',
    summary:
      'Multiply two Q4.4 numbers and the binary point moves: managing format growth with shifts, and protecting range with saturation instead of silent wrap-around.',
    objectives: [
      'Track format growth through multiplication and addition.',
      'Re-scale products with right shifts and justify the rounding implications.',
      'Explain why overflow wraps in two\'s complement and how saturation differs.',
      'Apply saturating arithmetic to a worked accumulator example.',
    ],
    whyItMatters:
      'Fixed-point bugs do not throw exceptions — they produce plausible-looking garbage. A missed shift halves every gain by 16; an unsaturated accumulator inverts a waveform the moment it overflows. The shift-and-saturate discipline in this lesson is what separates fixed-point code that works from code that works *on the test vector only*.',
    prerequisites: [
      'dsp-m04-l1 (Q-notation, Q4.4)',
      'Two\'s complement wrap-around behaviour',
    ],
    explanation:
      '### Multiplication grows the format\n\nTwo Q4.4 values multiply to a **Q8.8** product: fraction bits add (4 + 4), and the product needs 16 bits. The arithmetic is plain integer multiplication — the Q-interpretation just changes:\n\n```\n1.5 x 2.0:   stored 24 x stored 32 = 768\n             768 in Q8.8 = 768/256 = 3.0   (correct: 1.5 x 2 = 3)\nback to Q4.4: 768 >> 4 = 48  = 3.0 in Q4.4\n```\n\nThe right shift by n (here 4) converts the product back to the input format. Every multiply-accumulate in a fixed-point filter does exactly this, per tap or once at the end.\n\n### Addition grows the *range*, not the step\n\nAdding two Q4.4 values stays Q4.4 (steps unchanged) but the sum can exceed the ±8 range: 7.9375 + 7.9375 = 15.875 needs Q5.4. In an 8-bit register the true sum 254 wraps to -2 (two\'s complement) — a catastrophic sign flip from an ordinary addition. Two defences: **headroom** (widen the accumulator: keep sums in 16-bit Q11.4, say) and **saturation**.\n\n### Saturation: clamp, do not wrap\n\n**Saturating arithmetic** clamps results to the format\'s limits instead of wrapping:\n\n```\nsaturate_8bit(x) = min(max(x, -128), 127)\n```\n\nWorked example in Q4.4: 5.0 x 2.0 -> stored 80 x 32 = 2560 -> >>4 = 160 -> as Q4.4 that is 10.0, beyond the 7.9375 maximum. Unsaturated, the 8-bit store wraps 160 to -96 = -6.0: a positive gain produced a negative output. Saturated, 160 clamps to 127 = 7.9375: wrong magnitude, right sign, bounded error — audibly and visually a *clip* rather than a polarity catastrophe. Saturation converts loss of range into controlled distortion; wrap-around converts it into garbage.',
    deepDive:
      '### Where the shift\'s rounding goes\n\nShifting right discards the low bits: 768 >> 4 is exact (low 4 bits are 0000), but 750 >> 4 = 46 = 2.875 for a true 2.9297 — a truncation toward negative infinity for signed values. DSP hardware offers **rounding shifts** (add half the discarded range before shifting: (750 + 8) >> 4 = 47) and accumulators keep full product precision until the final scaling, so truncation happens once per block instead of once per tap. The rule of thumb: compute in the widest format available, scale once, and prefer round-to-nearest at that single point. This is the fixed-point mirror of the quantization lesson: each format conversion is a small quantizer, and you choose where those quantizers sit.',
    examples: [
      {
        title: 'Q4.4 multiply-shift-saturate chain, worked in Octave',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
% Three Q4.4 products: (1.5)(2.0), (3.75)(2.0), (5.0)(2.0)
a = [24, 60, 80];      % stored Q4.4 of 1.5, 3.75, 5.0
b = [32, 32, 32];      % stored Q4.4 of 2.0

for k = 1:3
  prod16 = a(k) * b(k);                 % Q8.8 product (fits in 16 bits)
  back4  = floor(prod16 / 16);          % shift right by 4 -> Q4.4 integer
  sat    = min(max(back4, -128), 127);  % saturate to 8-bit range
  fprintf('raw=%d q88=%.4f q44_sat=%.4f\\n', prod16, prod16/256, sat/16);
end`,
        explanation: [
          'prod16 is the integer product: 24x32 = 768; 60x32 = 1920; 80x32 = 2560.',
          'q88 = product/256 is the true Q8.8 value: 3.0, 7.5, 10.0.',
          'shift by 4 gives the Q4.4 integer: 48, 120, 160.',
          '160 exceeds the Q4.4 maximum stored value 127, so saturation clamps it to 127 = 7.9375; without saturation, 160 stored in 8 bits wraps to -96 = -6.0 (wrong sign).',
          'Expected output, exactly:',
          'raw=768 q88=3.0000 q44_sat=3.0000',
          'raw=1920 q88=7.5000 q44_sat=7.5000',
          'raw=2560 q88=10.0000 q44_sat=7.9375',
          'The third line is the lesson: 10.0 cannot live in Q4.4; saturation keeps 7.9375 (right sign, bounded error) where wrap-around would hand back -6.0.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Format bookkeeping through a multiply (illustrative)',
        content:
          '    Q4.4 (8 bit)      Q4.4 (8 bit)       product\n      1.5 = 24    x     2.0 = 32     =   768 (Q8.8, 16 bit)\n                                              |\n                                              v  >> 4 (rescale)\n                                           48  (Q4.4)\n                                              |\n                                              v  saturate to 8 bits\n                                       48 within -128..127: ok -> 3.0\n\n    overflow case:\n      5.0 = 80 x 32 = 2560 (Q8.8) -> >>4 -> 160 -> SATURATE -> 127 (7.9375)\n                                        (wrap would give -96 = -6.0)',
        caption:
          'The multiply-accumulate pipeline of every fixed-point filter: widen, accumulate, rescale once, saturate on the final store. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'Format growth rules',
        headers: ['Operation', 'Format result', 'Range note'],
        rows: [
          ['Qa.n x Qb.n', 'Q(a+b).(n+n)', 'Fraction bits add; product needs the wider type'],
          ['Qm.n + Qm.n', 'Q(m+1).n', 'One more integer bit may be needed; widen or saturate'],
          ['Qm.n >> s', 'Q(m-s).n (or Qm.(n-s) view)', 'Discards low bits; round if needed'],
          ['Sum of K products', 'Integer bits grow by ceil(log2 K)', 'Size accumulators for worst case'],
        ],
      },
      {
        caption: 'Overflow handling compared',
        headers: ['Policy', 'On overflow', 'Failure mode', 'Typical use'],
        rows: [
          ['Wrap (default C)', 'Value folds sign', 'Polarity inversion: catastrophic', 'Never acceptable for audio/control accumulators'],
          ['Saturate', 'Clamps to limit', 'Bounded distortion (clip)', 'Audio DACs, filter accumulators'],
          ['Headroom (widen)', 'No overflow up to design limit', 'Costs bits/registers', 'Accumulators inside filters'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Shifting after every multiply instead of after the accumulate.',
        fix: 'Shifting per tap quantizes every intermediate term; shifting once after the sum quantizes once. Keep the accumulator wide (Q8.8 or wider) and rescale at the end — the discipline the C example in the next lesson follows.',
      },
      {
        mistake: 'Using signed right shift and assuming truncation is neutral.',
        fix: 'Arithmetic right shift rounds toward negative infinity: -33 >> 4 = -3 (true -2.06). For symmetric behaviour add a rounding bias ((v + 8) >> 4 for Q4.4) at the single rescaling point, and document the choice.',
      },
      {
        mistake: 'Testing saturation only with the nominal signal.',
        fix: 'Saturation logic is exercised by *worst-case* input, which unit tests rarely contain. Bound the input explicitly in the test plan (this course\'s projects do), and check the accumulator\'s worst-case growth: K taps of full-scale products need ceil(log2 K) extra integer bits.',
      },
    ],
    guidedPractice: {
      title: 'Bookkeeping drill',
      brief:
        'In Q4.4: compute stored values for 2.5 and -1.5; their 16-bit product; the product\'s value in Q8.8; the value after >> 4; and whether saturation applies.',
      expectedBehavior:
        '2.5 -> 40; -1.5 -> -24. Product: 40 x -24 = -960. Q8.8: -960/256 = -3.75. >> 4: -960/16 = -60 -> -60/16 = -3.75 in Q4.4. -60 is within -128..127, so no saturation — the result is exact (2.5 x -1.5 = -3.75).',
      hints: [
        'Scale by 16 first: 2.5 -> 40, -1.5 -> -24.',
        'The integer product is -960; divide by 256 for Q8.8, by 16 after the shift.',
        'Saturation only matters outside -128..127.',
      ],
    },
    practiceExercises: [
      {
        title: 'Accumulator sizing',
        brief:
          'A 64-tap FIR runs in Q4.4: each tap contributes a product of at most 7.9375 x 7.9375 = 63.0. What is the worst-case accumulator range, and how many integer bits must a Q-format accumulator have (keeping n = 8 fraction bits) to be safe?',
        expectedBehavior:
          'Worst-case sum = 64 x 63.0 = 4032. With 8 fraction bits, integer bits needed: 4032 needs 12 bits (2^12 = 4096), plus a sign bit: Q13.8 (13 integer bits incl. sign, 8 fraction = 21 bits, or round to a 24/32-bit accumulator). An 8-bit Q4.4 accumulator would saturate on the first few taps.',
        hints: [
          'Worst case: every tap at full-scale positive.',
          '4032 < 4096 = 2^12, so 12 magnitude bits plus sign.',
          'Practical accumulators use 32-bit registers — headroom is cheap.',
        ],
      },
      {
        title: 'Wrap-around in the wild',
        brief:
          'An unsigned 8-bit counter wraps past 255. A fixed-point filter that wraps past 127 produces -6.0 where 10.0 was intended (worked above). Explain in three sentences why one of these is acceptable engineering and the other is not.',
        expectedBehavior:
          'The counter wraps by design: modular arithmetic is the specification (timers, hash indices), and consumers expect it. The filter\'s wrap is an *unintended* interpretation of an out-of-range physical quantity: the sign flip corrupts the signal relationship (a loud passage becomes an inverted one), which downstream logic cannot detect or undo. Saturation bounds the error in the value while preserving the sign relationship — controlled degradation instead of semantic corruption.',
        hints: [
          'Ask whether the wrap is part of the specification.',
          'What does a sign flip do to control loops and audio?',
        ],
      },
    ],
    assessment: {
      title: 'Scaling and saturation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Multiplying two Q4.4 numbers produces a product in which format?',
          options: ['Q8.8', 'Q4.4', 'Q4.8', 'Q16.16'],
          answer: 'Q8.8',
          explanation:
            'Fraction bits add (4+4=8) and integer bits add (4+4=8): a 16-bit Q8.8 product. Shift right by 4 to return to Q4.4.',
          hint: 'n + n fraction bits.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does the third line of the worked example print?',
          code: 'a = 80; b = 32;          % Q4.4 stored values\nprod16 = a * b;          % Q8.8\nback4 = floor(prod16 / 16);\nsat = min(max(back4, -128), 127);\nprintf("q44_sat=%.4f", sat/16);',
          options: ['q44_sat=7.9375', 'q44_sat=10.0000', 'q44_sat=-6.0000', 'q44_sat=0.0000'],
          answer: 'q44_sat=7.9375',
          explanation:
            'prod16 = 2560; back4 = 160; saturating to 127 gives 127/16 = 7.9375. Without saturation, 160 would wrap to -96 = -6.0.',
          hint: '160 does not fit in -128..127.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Adding two Q4.4 numbers can overflow even though neither operand is out of range.',
          answer: 'true',
          explanation:
            'The range of Q4.4 is ±8; the sum of two in-range values can reach nearly 16. Range grows with addition even though the step size does not — widen the accumulator or saturate.',
          hint: 'Try 7.9375 + 7.9375.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In two words, what arithmetic clamps results to the format limits instead of wrapping?',
          answer: 'saturating arithmetic',
          explanation:
            'Saturating arithmetic clamps to min/max, converting overflow into bounded distortion (a clip) rather than a sign-corrupting wrap.',
          hint: 'The result saturates at the rails.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'Format growth', definition: 'The widening of Q-format requirements under multiplication (n+n fraction bits) and addition (+1 integer bit).' },
      { term: 'Rescaling shift', definition: 'A right shift by n that converts a Q8.8 product back to Q4.4 representation.' },
      { term: 'Saturation', definition: 'Clamping results to the representable range instead of wrapping on overflow.' },
      { term: 'Wrap-around', definition: 'Two\'s complement modular behaviour: overflowing values fold to the opposite sign.' },
      { term: 'Rounding shift', definition: 'A right shift preceded by adding half the discarded range, giving round-to-nearest instead of truncation.' },
    ],
    revisionSummary: [
      'Multiply: Q4.4 x Q4.4 = Q8.8 (16-bit); rescale with >> 4 back to Q4.4.',
      'Add: step unchanged, range grows — accumulators need headroom or saturation.',
      'Saturation clamps; wrap-around flips sign. Choose saturation for signal paths.',
      'Scale once after the accumulate, with rounding — not after every tap.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Saturation arithmetic', url: 'https://en.wikipedia.org/wiki/Saturation_arithmetic', kind: 'article' },
      { label: 'Wikipedia — Fixed-point arithmetic (multiplication section)', url: 'https://en.wikipedia.org/wiki/Fixed-point_arithmetic', kind: 'article' },
      { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dsp-m04-l3',
    title: 'Fixed-Point Filters on Real Hardware: MCU, FPGA, DSP',
    summary:
      'The moving-average filter rebuilt with integers only — traced line by line in C — and an honest comparison of where DSP algorithms actually run.',
    objectives: [
      'Implement a Q4.4 FIR filter in C with integer arithmetic only.',
      'Trace the delay-line and accumulator state through eight samples.',
      'Compare MCU, FPGA and DSP implementations against honest criteria.',
      'Recognise where this course\'s arithmetic appears in the platform\'s RTL and embedded tracks.',
    ],
    whyItMatters:
      'This is the payoff lesson: everything from modules 01-03 (difference equations, taps, Q-formats, saturation) assembles into one small, complete, verifiable program — the shape of real DSP code on the microcontrollers this platform\'s embedded course targets. The platform evaluator runs text-based checks rather than DSP hardware, and this lesson is explicit about that: everything here is simulated or traced, which is exactly how fixed-point algorithms are validated before hardware anyway.',
    prerequisites: [
      'dsp-m02-l3 (moving average)',
      'dsp-m04-l1 and dsp-m04-l2 (Q4.4, shift and saturate)',
      'C basics (arrays, loops)',
    ],
    explanation:
      '### The design\n\nFilter: 4-tap moving average, coefficients 0.25 each. In Q4.4 each coefficient is 0.25 x 16 = 4, so the tap list is c = [4, 4, 4, 4]. Input: the same step-down as module 02, but scaled into Q4.4 — the level 2.0 is stored as 2.0 x 16 = 32, giving x = [32, 32, 32, 32, 0, 0, 0, 0].\n\nPer sample: shift the delay line, accumulate the four products (Q8.8 intermediate), shift right by 4, store as Q4.4. Expected output, in stored units: 8, 16, 24, 32, 24, 16, 8, 0 — which reads as 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.0: exactly the module-02 ramp, in fixed point.\n\n### The implementation checks in this course\n\nThe platform\'s evaluator executes Octave scripts on the MATLAB-compatible track and returns text; it does not run C on DSP hardware, and no DSP chip is claimed anywhere in this course. That is not a limitation for learning: fixed-point algorithms are always validated against a *reference model* first (the Octave float version), then against the integer implementation (the traced C below), and only then on hardware. The comparison table at the end is about where such code eventually runs, with the criteria engineers actually use.',
    deepDive:
      '### Three places the same filter lives\n\n**MCU (C)**: the code below, one MAC per tap, delay line in RAM; the CPU does everything, so cost is cycles per sample. **FPGA**: the same taps become parallel multipliers and a register pipeline — every sample processed in one clock, throughput set by clock rate, coefficients changeable only by reconfiguration; the platform\'s RTL courses build exactly these MAC pipelines and their timing closure. **DSP chip**: a processor *architected* around this loop — single-cycle MAC, circular addressing for the delay line, multiple accumulators — which is why a 100 MHz DSP can out-filter a 500 MHz general CPU on this workload. The arithmetic is identical in all three; what changes is who executes the multiply-accumulate and how fast. Note the honest pattern in all three: the *reference model* (Octave/float, module 02) and the *bit-true model* (this C trace) come first; hardware last.',
    examples: [
      {
        title: 'Integer-only Q4.4 FIR in C, traced',
        language: 'c',
        code: `#include <stdio.h>
#include <stdint.h>

int main(void) {
    const int32_t c[4] = { 4, 4, 4, 4 };   /* Q4.4 coefficient 0.25 */
    const int32_t x[8] = { 32, 32, 32, 32, 0, 0, 0, 0 };  /* 2.0 step in Q4.4 */
    int32_t xbuf[4] = { 0, 0, 0, 0 };      /* delay line, newest first */

    for (int n = 0; n < 8; n++) {
        for (int k = 3; k > 0; k--) xbuf[k] = xbuf[k - 1];
        xbuf[0] = x[n];
        int32_t acc = 0;                   /* Q8.8 accumulator */
        for (int k = 0; k < 4; k++) acc += c[k] * xbuf[k];
        int32_t y = acc >> 4;              /* rescale Q8.8 -> Q4.4 */
        printf("n=%d acc=%d y_q44=%d y=%.4f\\n", n, acc, y, y / 16.0);
    }
    return 0;
}`,
        explanation: [
          'The delay line shifts oldest-to-oldest first (k = 3 down to 1) so nothing is overwritten before it moves; then the newest sample enters at xbuf[0].',
          'The accumulator multiplies Q4.4 x Q4.4 = Q8.8 terms: 4 x 32 = 128 per occupied tap.',
          'Trace, sample by sample (acc = 4 x sum of window):',
          'n=0 acc=128 y_q44=8 y=0.5000',
          'n=1 acc=256 y_q44=16 y=1.0000',
          'n=2 acc=384 y_q44=24 y=1.5000',
          'n=3 acc=512 y_q44=32 y=2.0000',
          'n=4 acc=384 y_q44=24 y=1.5000',
          'n=5 acc=256 y_q44=16 y=1.0000',
          'n=6 acc=128 y_q44=8 y=0.5000',
          'n=7 acc=0 y_q44=0 y=0.0000',
          'The y column (divided by 16) matches the float moving-average ramp from module 02 lesson 3: 0.5, 1.0, 1.5, 2.0, 1.5, 1.0, 0.5, 0.0 — the fixed-point implementation is bit-exact with the reference model on this input.',
          'No floats exist anywhere in the arithmetic: y / 16.0 appears only in the printf for human reading; every stored value is an integer.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Where the same filter runs (illustrative comparison)',
        content:
          '  MCU (C, this lesson)          FPGA (RTL track)            DSP chip\n  +------------------+          +------------------+        +------------------+\n  | CPU does 4 MACs  |          | 4 parallel MAC   |        | single-cycle MAC |\n  | sequentially per |          | units + pipeline |        | circular delay   |\n  | sample           |          | registers        |        | line addressing  |\n  +------------------+          +------------------+        +------------------+\n  cost: cycles/sample           cost: LUTs, DSP blocks      cost: $, power\n  flexible: any C               fastest per clock           tuned for filters\n\n  All three run the SAME arithmetic: acc = sum c[k] x[k], then >> 4.',
        caption:
          'One algorithm, three execution models. The choice is driven by sample rate, power budget and flexibility — not by different mathematics. (Illustrative.)',
      },
    ],
    tables: [
      {
        caption: 'MCU versus FPGA versus DSP for signal processing (honest, typical)',
        headers: ['Criterion', 'MCU (C)', 'FPGA', 'DSP chip'],
        rows: [
          ['Model of computation', 'Sequential software', 'Parallel hardware pipeline', 'Software on MAC-optimised core'],
          ['Throughput per clock', 'One tap at a time', 'Many taps in parallel', 'One MAC per cycle, fast cycles'],
          ['Flexibility', 'Maximum (any C)', 'Reconfiguration required to change', 'High (software) with fixed ISA'],
          ['Typical sample rates', 'kHz range (audio-rate with effort)', 'MHz-GHz range', 'Hundreds of kHz to MHz'],
          ['Cost/power', 'Lowest', 'Highest', 'Middle'],
          ['Verification flow', 'Reference model + bit-true trace', 'Bit-true + timing simulation', 'Reference model + on-chip test'],
        ],
      },
      {
        caption: 'The fixed-point verification ladder this course teaches',
        headers: ['Stage', 'Tool', 'Checks'],
        rows: [
          ['1. Float reference', 'Octave (module 02)', 'Correct algorithm and expected sequence'],
          ['2. Bit-true model', 'Integer C trace (this lesson)', 'Q-format, shift and saturation logic'],
          ['3. Hardware', 'Real target (outside this course)', 'Timing, peripherals, end-to-end behaviour'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Shifting the delay line in the wrong direction and double-writing a cell.',
        fix: 'Shift from the oldest end first (k = 3 down to 1 here); write the new sample last. Tracing two consecutive iterations by hand — as the example explanation does — catches both bugs immediately.',
      },
      {
        mistake: 'Trusting the float reference model for overflow behaviour.',
        fix: 'Floats rarely overflow where fixed point does (module 04 lesson 2). The bit-true integer model must be run with worst-case inputs — full-scale steps, sign-alternating extremes — not just nominal signals.',
      },
      {
        mistake: 'Claiming fixed-point equivalence from one test vector.',
        fix: 'Bit-exactness on a step input does not prove the formats hold for arbitrary signals. Bound the worst-case accumulator (lesson 2\'s sizing exercise) and test at the bounds; equivalence arguments cite the bounds, not the examples.',
      },
    ],
    guidedPractice: {
      title: 'Change the input level, retrace',
      brief:
        'In the C example, replace the input level 2.0 (stored 32) with 1.0 (stored 16). Predict the full printed table (acc, y_q44 and y columns) before checking the logic.',
      expectedBehavior:
        'Each occupied tap contributes 4 x 16 = 64; acc: 64, 128, 192, 256, 192, 128, 64, 0; y_q44: 4, 8, 12, 16, 12, 8, 4, 0; y: 0.2500, 0.5000, 0.7500, 1.0000, 0.7500, 0.5000, 0.2500, 0.0000. Exactly half of the lesson\'s table — linearity, visible in fixed point.',
      hints: [
        'The per-tap product halves: 64 instead of 128.',
        'The y column is the module-02 ramp for a 1.0 step.',
        'Halving the input halves the output — a linear filter, even in integers.',
      ],
    },
    practiceExercises: [
      {
        title: 'Coefficients that are not quarters',
        brief:
          'A 2-tap FIR has float coefficients 0.2 and 0.6. In Q4.4, compute the stored coefficients, their actual sum as realized, and the DC gain error versus the ideal sum of 0.8. Then state which Q-format stores both exactly.',
        expectedBehavior:
          'Q4.4: 0.2 x 16 = 3.2 -> 3; 0.6 x 16 = 9.6 -> 10. Realized sum = 13/16 = 0.8125 versus ideal 0.8 — error 1.56%. In Q4.12: 0.2 x 4096 = 819.2 -> 819; 0.6 x 4096 = 2457.6 -> 2458; sum 3277/4096 = 0.800049 — error 0.006%. No binary format stores 0.2 and 0.6 exactly (fifths), so "exactly" is a trick: the best answer is that no Q-format is exact; Q4.12 gets within 0.006%.',
        hints: [
          'Round each coefficient separately.',
          'DC gain = sum of coefficients; compare to 0.8.',
          'Fifths are the enemy of binary scales (lesson 1 of this module).',
        ],
      },
      {
        title: 'Map the filter to three targets',
        brief:
          'For the 4-tap Q4.4 filter: (a) state the per-sample MAC count on an MCU; (b) state how many parallel multipliers an FPGA would instantiate to finish in one clock; (c) state what a DSP\'s circular addressing saves versus the C code.',
        expectedBehavior:
          '(a) 4 multiply-accumulates plus the shift bookkeeping, sequentially. (b) 4 multipliers (one per tap) feeding an adder tree — the adder tree itself becomes pipeline depth. (c) Circular addressing updates the delay line pointer without copying data, eliminating the explicit shift loop (the k = 3..1 code) entirely.',
        hints: [
          'Count the inner loop iterations.',
          'One multiplier per tap for single-cycle operation.',
          'The C shift loop exists because RAM indices are explicit.',
        ],
      },
    ],
    assessment: {
      title: 'Fixed-point implementation checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In the C example, what is the accumulator format before the >> 4 rescale?',
          options: ['Q8.8', 'Q4.4', 'Q0.8', 'float'],
          answer: 'Q8.8',
          explanation:
            'Each product is Q4.4 x Q4.4 = Q8.8; four of them sum in a 32-bit Q8.8 accumulator, rescaled once at the end.',
          hint: 'Fraction bits add under multiplication.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'output-prediction',
          prompt: 'What does the program print for n = 3 (the last input sample of the step)?',
          code: '/* x = {32,32,32,32,0,0,0,0}, c = {4,4,4,4} */\n/* n = 3: window holds x[3..0], all 32 */',
          options: ['n=3 acc=512 y_q44=32 y=2.0000', 'n=3 acc=128 y_q44=8 y=0.5000', 'n=3 acc=384 y_q44=24 y=1.5000', 'n=3 acc=256 y_q44=16 y=1.0000'],
          answer: 'n=3 acc=512 y_q44=32 y=2.0000',
          explanation:
            'Four taps at 4 x 32 = 128 each: acc = 512; y = 512 >> 4 = 32 stored = 2.0. The steady-state point of the ramp.',
          hint: 'All four delay-line cells hold 32 at n = 3.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In the traced program, floating-point arithmetic is used to compute the filter output.',
          answer: 'false',
          explanation:
            'All storage and arithmetic are int32_t; the only float is in the printf argument (y / 16.0) for human-readable display, computed after the integer result exists.',
          hint: 'Look at the types, and at where the division happens.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'In one or two words: what DSP-chip feature updates the delay line without explicitly copying samples, as the C code does with its shift loop?',
          answer: 'circular addressing',
          explanation:
            'Circular (modulo) addressing keeps a moving pointer into a fixed buffer — new samples overwrite the oldest slot in place, eliminating the data-movement loop that C code performs explicitly.',
          hint: 'The buffer is used as a ring.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'MAC (multiply-accumulate)', definition: 'The acc += c * x operation that forms one FIR tap; the benchmark operation of DSP hardware.' },
      { term: 'Delay line', definition: 'The buffer of recent input samples a FIR reads; shifted or ring-accessed each sample.' },
      { term: 'Bit-true model', definition: 'An integer-exact simulation of the fixed-point algorithm, verified against the float reference before hardware.' },
      { term: 'Circular addressing', definition: 'Hardware indexing that treats a buffer as a ring, replacing explicit delay-line shifts.' },
    ],
    revisionSummary: [
      'Coefficients in Q4.4 (0.25 -> 4); input in Q4.4 (2.0 -> 32); MAC into Q8.8; rescale once.',
      'The traced output reproduces the float ramp bit-exactly: 8, 16, 24, 32, 24, 16, 8, 0 stored.',
      'Verification ladder: float reference -> bit-true integer model -> hardware.',
      'MCU = cycles, FPGA = parallelism, DSP = MAC-optimised core; the mathematics is identical.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Mixed-signal and software chapters', url: 'https://www.dspguide.com/ch28.htm', kind: 'docs' },
      { label: 'Wikipedia — Digital signal processor', url: 'https://en.wikipedia.org/wiki/Digital_signal_processor', kind: 'article' },
      { label: 'Wikipedia — Multiply-accumulate operation', url: 'https://en.wikipedia.org/wiki/Multiply%E2%80%93accumulate_operation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
