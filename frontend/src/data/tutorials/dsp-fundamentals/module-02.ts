import type { TutorialLesson } from '../types';

export const module02Lessons: TutorialLesson[] = [
  {
    id: 'dsp-m02-l1',
    title: 'LTI Systems and Difference Equations',
    summary:
      'The input-output contract of digital filters: linearity, time invariance, and the difference equation — computed by hand, sample by sample.',
    objectives: [
      'Define linearity (superposition) and time invariance and check both on simple systems.',
      'Read a difference equation as a recursion over past outputs and inputs.',
      'Compute outputs of a first-order recursive filter by hand for arbitrary inputs.',
      'Recognise the feedback term as the signature of infinite impulse response.',
    ],
    whyItMatters:
      'Every filter, equaliser, smoothing routine and controller in digital form is a difference equation. It is the smallest complete description of what a system does — small enough to compute by hand, which is exactly what you should do the first time you meet one. This lesson builds the muscle that convolution (module 03) and implementation (module 04) both depend on.',
    prerequisites: [
      'dsp-m01-l1 (discrete signals, x[n])',
      'Arithmetic with fractions and decimals',
    ],
    explanation:
      'A **system** maps an input sequence x[n] to an output sequence y[n]. Two properties define the well-behaved class this course works with:\n\n- **Linearity**: scaling the input scales the output, and inputs that are added produce added outputs. T(x1 + a·x2) = T(x1) + a·T(x2). Doubling a recording\'s amplitude doubles a (linear) filter\'s response.\n- **Time invariance**: shifting the input shifts the output identically — the system behaves the same on Monday as on Tuesday. Delay x by 3 and y delays by 3.\n\nSystems with both properties are **LTI**, and LTI systems are completely described by their response to a single input: the impulse (module 02\'s next lesson). For now, meet the *equation* form.\n\n### The difference equation\n\nA **difference equation** defines each output sample from a few past inputs and outputs:\n\n```\ny[n] = 0.5 y[n-1] + x[n]\n```\n\nRead it right to left: take the current input, add half of the previous output, and that is the current output. Because y appears on both sides, the system **feeds back** on itself — a recursive filter. Computing it is a mechanical march: start from rest (all history zero), evaluate the equation at n = 0, 1, 2, 3, ... Each step needs only the previous result.\n\n### Hand trace, impulse input\n\nLet the input be the single pulse x = [1, 0, 0, 0] and assume y[-1] = 0:\n\n```\ny[0] = 0.5(0) + 1 = 1\ny[1] = 0.5(1) + 0 = 0.5\ny[2] = 0.5(0.5) + 0 = 0.25\ny[3] = 0.5(0.25) + 0 = 0.125\n```\n\nThe output rings down geometrically: 1, 0.5, 0.25, 0.125 — each term half the last, never *exactly* zero. That tail is the system\'s **impulse response**, and because it is infinite in length, this is an **IIR** system. A filter without the feedback term (y[n] = sum of past x only) always finishes after a fixed number of samples: **FIR**. The next lesson formalises the contrast.',
    deepDive:
      '### Why LTI deserves the emphasis\n\nLinearity and time invariance are not pedantry — they are what make analysis *decomposable*. Because of linearity, the response to any signal is the scaled sum of responses to the impulses that make it up; because of time invariance, each of those responses is the same shape. One measurement (the impulse response) therefore describes behaviour against *every* possible input. Nonlinear or time-varying systems lose this: you must analyse each case separately, which is why DSP engineers go far out of their way to keep systems LTI (and model deviations — saturation, quantization — as small additive troublemakers on top of an LTI core). A useful sanity check to carry: a system that clips peaks (saturation) is nonlinear; a system whose gain depends on the sampling instant is time-varying.',
    examples: [
      {
        title: 'Hand trace of y[n] = 0.5 y[n-1] + x[n] for a step input',
        language: 'text',
        code: `System:  y[n] = 0.5 y[n-1] + x[n],   initially at rest (y[-1] = 0)
Input:   x = [1, 1, 1, 1]   (a unit step, first four samples)

n = 0:  y[0] = 0.5*y[-1] + x[0] = 0.5*0 + 1 = 1
n = 1:  y[1] = 0.5*y[0]  + x[1] = 0.5*1 + 1 = 1.5
n = 2:  y[2] = 0.5*y[1]  + x[2] = 0.5*1.5 + 1 = 1.75
n = 3:  y[3] = 0.5*y[2]  + x[3] = 0.5*1.75 + 1 = 1.875

Output: y = [1, 1.5, 1.75, 1.875]

Pattern: y[n] approaches 2 from below; each sample closes
         half of the remaining gap to 2.
Steady state: if y holds still, 0.5*y + 1 = y  =>  y = 2.
         The gain from constant input to final output is
         1/(1 - 0.5) = 2.`,
        explanation: [
          'Each line uses only the previous output and the current input — the recursion is fully self-contained.',
          'The sequence 1, 1.5, 1.75, 1.875 is 2 minus successive halves of 1: 2 - 1, 2 - 0.5, 2 - 0.25, 2 - 0.125.',
          'The steady-state check (set y[n] = y[n-1]) gives the DC gain 1/(1-0.5) = 2: feed a constant 1 forever and the output settles at 2.',
          'The same filter on the impulse input produced 1, 0.5, 0.25, 0.125 — different input, same machine, one equation.',
          'Tracing by hand like this is the primary verification method for every Octave filter script in this course.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'First-order recursive filter structure',
        content:
          '  x[n] --->(+)-----------------------------------> y[n]\n            ^\n            |\n            |        feedback path: past output scaled by 0.5\n            +----[ *0.5 ]<---[ z^-1 ]<--- y[n-1]\n\n  z^-1 = one-sample delay: the y[n-1] memory cell\n  The loop  y[n-1] -> delay -> *0.5 -> sum  is the feedback\n  that makes the impulse response decay forever.',
        caption:
          'The feedback loop through the delay and the 0.5 multiplier is what makes the response linger forever. A filter without that loop is FIR. (Illustrative block diagram.)',
      },
    ],
    tables: [
      {
        caption: 'Hand-trace bookkeeping table (step input)',
        headers: ['n', '0.5*y[n-1]', 'x[n]', 'y[n]'],
        rows: [
          ['0', '0.5 x 0 = 0', '1', '1.000'],
          ['1', '0.5 x 1 = 0.5', '1', '1.500'],
          ['2', '0.5 x 1.5 = 0.75', '1', '1.750'],
          ['3', '0.5 x 1.75 = 0.875', '1', '1.875'],
        ],
      },
      {
        caption: 'Checking the two properties on three toy systems',
        headers: ['System', 'Linear?', 'Time-invariant?'],
        rows: [
          ['y[n] = 2 x[n]', 'yes (gain)', 'yes'],
          ['y[n] = x[n]^2', 'no: (x1+x2)^2 ≠ x1^2 + x2^2', 'yes'],
          ['y[n] = x[n] + n', 'yes (offset)', 'no: delay the input, the +n stays put'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Forgetting the initial condition y[-1] = 0 (or using the wrong one).',
        fix: 'At n = 0 the equation references y[-1]; the "initially at rest" convention sets it to zero. If a filter starts mid-stream with a warm history, the first samples differ — always state the initial condition before tracing.',
      },
      {
        mistake: 'Calling any system with delay "time-varying".',
        fix: 'A constant delay z^-1 is time-invariant: shift the input and the output shifts identically. Time invariance fails only when the rule itself changes with n (like the +n term in the table above).',
      },
      {
        mistake: 'Computing y[n] from y[n] itself.',
        fix: 'The recursion is strictly causal: y[n] depends on y[n-1], not on itself. In code, compute into a new variable (or update the history buffer in the right order) — a subtle implementation bug previewed in module 04.',
      },
    ],
    guidedPractice: {
      title: 'Trace a second input by hand',
      brief:
        'For y[n] = 0.5 y[n-1] + x[n] (at rest), trace the output for x = [2, 0, 0, 0]. Then use linearity to check your answer against the impulse trace (1, 0.5, 0.25, 0.125) from the lesson.',
      expectedBehavior:
        'y = [2, 1, 0.5, 0.25]: every sample of the impulse response doubled — exactly what linearity predicts for a doubled input. If your trace disagrees with 2x the impulse response, an arithmetic slip happened.',
      hints: [
        'n=0: 0.5(0) + 2 = 2. n=1: 0.5(2) = 1. n=2: 0.5. n=3: 0.25.',
        'Linearity: 2 x (1, 0.5, 0.25, 0.125) = (2, 1, 0.5, 0.25).',
        'The agreement is not a coincidence — it is the property working.',
      ],
    },
    practiceExercises: [
      {
        title: 'A different feedback coefficient',
        brief:
          'Trace y[n] = 0.25 y[n-1] + x[n] (at rest) for the impulse input x = [1, 0, 0, 0], and state the DC gain this filter would show for a constant input held forever.',
        expectedBehavior:
          'Impulse response: 1, 0.25, 0.0625, 0.015625. DC gain = 1/(1-0.25) = 4/3 ≈ 1.333: the steady-state equation 0.25y + 1 = y gives y = 4/3.',
        hints: [
          'Each output is a quarter of the previous one.',
          'Set y[n] = y[n-1] = y* in steady state: y* = 0.25 y* + 1.',
        ],
      },
      {
        title: 'Spot the non-LTI culprit',
        brief:
          'A "filter" computes y[n] = x[n] + 0.5 x[n]^2. A colleague reports that filtering (x1 + x2) does not give (y1 + y2). Show the property that fails with a concrete pair of inputs (x1 = 1, x2 = 2), and state which LTI property is violated.',
        expectedBehavior:
          'Linearity fails. For x = 1: y = 1 + 0.5 = 1.5; for x = 2: y = 2 + 2 = 4; sum = 5.5. For x = 3 (the sum input): y = 3 + 4.5 = 7.5 ≠ 5.5. The squared term makes output depend on input amplitude nonlinearly.',
        hints: [
          'Compute y(1), y(2) and y(3) separately.',
          'The square mixes amplitudes; only linear terms superpose.',
        ],
      },
    ],
    assessment: {
      title: 'Difference equations checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'For y[n] = 0.5 y[n-1] + x[n] at rest, what is y[2] when x = [1, 0, 0, 0]?',
          options: ['0.5', '0.25', '1.5', '0.125'],
          answer: '0.25',
          explanation:
            'y[0] = 1, y[1] = 0.5(1) + 0 = 0.5, y[2] = 0.5(0.5) = 0.25. Each output is half the previous.',
          hint: 'March one step at a time: 1, then 0.5, then...',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which feature of a difference equation signals an infinite impulse response (IIR)?',
          options: [
            'Past output values appear on the right-hand side',
            'The input is delayed',
            'The coefficients are fractional',
            'The output is longer than the input',
          ],
          answer: 'Past output values appear on the right-hand side',
          explanation:
            'Feedback (y terms on the right) makes each output depend on all earlier history, so the response to one impulse never fully dies — infinite impulse response. Delays of the input alone give FIR behaviour.',
          hint: 'Look for y[...] on the right-hand side.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The system y[n] = x[n] + 5 is linear.',
          answer: 'false',
          explanation:
            'Doubling the input gives 2x + 5, but twice the output would be 2x + 10 — the constant offset breaks superposition. (It is affine, not linear; in practice it is modelled as a linear system plus a bias.)',
          hint: 'Test superposition with x and 2x.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'For y[n] = 0.5 y[n-1] + x[n], a constant input x = 1 held forever settles at what output value (decimal)?',
          answer: '2',
          explanation:
            'Steady state: y = 0.5y + 1 gives y = 2. The DC gain is 1/(1-0.5) = 2.',
          hint: 'Solve y = 0.5y + 1.',
          difficulty: 'easy',
        },
      ],
    },
    keyTerms: [
      { term: 'LTI system', definition: 'A system that is linear (superposition holds) and time-invariant (delays pass through); completely characterised by its impulse response.' },
      { term: 'Difference equation', definition: 'A recursion defining y[n] from current/past inputs and past outputs — the computational core of a digital filter.' },
      { term: 'Feedback (recursion)', definition: 'Output terms appearing on the right-hand side; the source of infinite impulse response.' },
      { term: 'Initial condition', definition: 'The stored past (e.g. y[-1]) needed to begin the recursion; "at rest" means all zeros.' },
      { term: 'DC gain', definition: 'The output value under a constant input; for y = a y + x it equals 1/(1-a).' },
    ],
    revisionSummary: [
      'LTI = superposition + shift-invariance; the properties make one impulse response describe everything.',
      'Difference equations are marched sample by sample; state the initial condition first.',
      'y = 0.5y + x traced on the impulse gives 1, 0.5, 0.25, 0.125 — a decaying tail (IIR).',
      'Steady state: set y[n] = y[n-1]; DC gain = 1/(1-a) for y = a y + x.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Linear systems chapter', url: 'https://www.dspguide.com/ch5.htm', kind: 'docs' },
      { label: 'Wikipedia — Linear time-invariant system', url: 'https://en.wikipedia.org/wiki/Linear_time-invariant_system', kind: 'article' },
      { label: 'Wikipedia — Digital filter (recursion section)', url: 'https://en.wikipedia.org/wiki/Digital_filter', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'dsp-m02-l2',
    title: 'Impulse Response, FIR versus IIR',
    summary:
      'One input tells all: the impulse response as a system\'s fingerprint, and the engineering trade-offs between finite and infinite response filters.',
    objectives: [
      'Define the impulse and impulse response, and connect them to the difference equation.',
      'Classify filters as FIR or IIR from structure and from response length.',
      'Compare FIR and IIR on stability, phase, and coefficient count (comparison table).',
      'Compute a filter\'s response to a short input using its impulse response and superposition.',
    ],
    whyItMatters:
      'The impulse response is the complete specification of an LTI system: every behaviour, at every frequency, against every input, is contained in that one sequence. FIR-versus-IIR is the first real design decision of digital filtering — it determines stability analysis, latency, phase behaviour and computational cost for the rest of your design.',
    prerequisites: [
      'dsp-m02-l1 (difference equations, hand tracing)',
    ],
    explanation:
      'The **unit impulse** δ[n] is the simplest possible input: 1 at n = 0, zero everywhere else. The output an LTI system produces for it — h[0], h[1], h[2], ... — is the **impulse response** h[n]. It deserves the emphasis it gets: since any input can be written as a scaled sum of shifted impulses, and LTI systems turn shifted, scaled inputs into shifted, scaled outputs, the response to *any* input is a sum of shifted, scaled copies of h[n]. That operation has a name — **convolution** — and it is the engine of module 03.\n\nFor the first-order system y[n] = 0.5 y[n-1] + x[n], the impulse response is the hand trace from last lesson:\n\n```\nh = [1, 0.5, 0.25, 0.125, ...]     (h[n] = 0.5^n, forever)\n```\n\nInfinitely long — the feedback term never lets it die exactly. Contrast a filter with no feedback:\n\n```\ny[n] = 0.5 x[n] + 0.5 x[n-1]\nh = [0.5, 0.5, 0, 0, ...]          (done after two samples)\n```\n\n### FIR versus IIR\n\n- **FIR (finite impulse response)**: output built from input samples only (a weighted moving average). Always stable (nothing feeds back), can be designed with exactly linear phase (symmetric coefficients), but sharp filters need many coefficients.\n- **IIR (infinite impulse response)**: output feeds back. Very efficient — a few coefficients achieve sharp selectivity — but stability must be checked (bad coefficients make the response grow without bound), and phase is inherently nonlinear near the cutoff.\n\nThe table below is the comparison to internalise; the design habit it produces is: choose FIR when phase matters and compute is cheap; choose IIR when the filter must be sharp and cheap, and then *prove* stability.',
    deepDive:
      '### Reading stability from the coefficients\n\nFor first-order y[n] = a y[n-1] + x[n], the impulse response is a^n: it decays when |a| < 1 (stable) and explodes when |a| > 1 (unstable). Try a = 1.1: h = 1, 1.1, 1.21, 1.331 — the filter *amplifies its own history*, and in fixed-point hardware it saturates or overflows. This scalar picture scales up: in general IIR design, stability requires all feedback "poles" inside the unit circle of the z-plane, and every filter-design tool reports pole locations for exactly this reason. In this course\'s practical terms: after any IIR design step, check the response decays; after any implementation step (module 04), check it again, because rounding the coefficients can push marginal poles outside.',
    examples: [
      {
        title: 'Superposition from the impulse response (by hand)',
        language: 'text',
        code: `System: y[n] = 0.5 y[n-1] + x[n],  at rest
Impulse response (from lesson 1 trace): h[n] = 0.5^n

Input: x = [1, 2]  (1 at n=0, 2 at n=1, zero after)

Superposition view: x = 1*delta[n] + 2*delta[n-1]
=> y = 1*h[n] + 2*h[n-1]

n=0:  1*h[0]           = 1*1    = 1
n=1:  1*h[1] + 2*h[0]  = 0.5 + 2 = 2.5
n=2:  1*h[2] + 2*h[1]  = 0.25 + 1 = 1.25
n=3:  1*h[3] + 2*h[2]  = 0.125 + 0.5 = 0.625

y = [1, 2.5, 1.25, 0.625]

Cross-check by running the difference equation:
y[0] = 0.5*0 + 1 = 1          (matches)
y[1] = 0.5*1 + 2 = 2.5        (matches)
y[2] = 0.5*2.5 + 0 = 1.25     (matches)
y[3] = 0.5*1.25 + 0 = 0.625   (matches)`,
        explanation: [
          'The input decomposes into two impulses: one of size 1 now, one of size 2 one sample later.',
          'Each contributes a shifted, scaled copy of h: h[n] and 2 h[n-1]. Adding them column-wise gives y.',
          'The direct recursion (lower block) produces identical numbers — superposition is not an approximation but an identity of LTI systems.',
          'This computation is convolution in miniature: multiply-and-add the impulse response against the input, with offsets. Module 03 generalises it.',
          'Platform challenge ece-matlab-02-convolution drills exactly this computation for longer sequences.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Impulse responses: FIR versus IIR (illustrative)',
        content:
          '  FIR: h = [0.5, 0.5]                    IIR: h[n] = 0.5^n\n\n  0.5 |  o                               1.0 | o\n      |  o                                   |\n      +--+--*--*--*--> n                 0.5 |    o\n         0  1  2  3                          |       o\n                                       0.25 |          o\n      (ends after 2 samples:                |             o  ...\n       finite)                        0.125 |                o\n\n      values: 1, 0.5, 0.25, 0.125, ... (halves forever:\n       infinite — practically tiny, mathematically endless)\n\n  (educational waveform (illustrative))',
        caption:
          'The FIR response stops; the IIR response decays geometrically but never reaches zero. Stability is about the *decay*, not the length.',
      },
    ],
    tables: [
      {
        caption: 'FIR versus IIR comparison',
        headers: ['Property', 'FIR', 'IIR'],
        rows: [
          ['Structure', 'Feed-forward only (weighted sum of inputs)', 'Has feedback (past outputs)'],
          ['Impulse response', 'Finite length (= number of taps)', 'Infinite, decaying tail'],
          ['Stability', 'Always stable', 'Must be designed/verified (poles inside unit circle)'],
          ['Phase', 'Exactly linear with symmetric coefficients', 'Nonlinear, especially near cutoff'],
          ['Efficiency (sharp filters)', 'Many coefficients needed', 'Very few coefficients'],
          ['Sensitivity to coefficient rounding', 'Benign', 'Can destabilise marginal designs'],
          ['Typical use', 'Audio EQ, image filtering, matched filters', 'Cheap sharp low-pass/high-pass, control loops'],
        ],
      },
      {
        caption: 'First-order stability by feedback coefficient',
        headers: ['a in y = a*y[n-1] + x', 'Impulse response h[n] = a^n', 'Verdict'],
        rows: [
          ['0.5', '1, 0.5, 0.25, 0.125, ...', 'stable (decays)'],
          ['-0.5', '1, -0.5, 0.25, -0.125, ...', 'stable (decays, alternating)'],
          ['1.0', '1, 1, 1, 1, ...', 'marginal (never decays: an accumulator)'],
          ['1.1', '1, 1.1, 1.21, 1.331, ...', 'unstable (grows)'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Judging stability by how small the tail looks in a plot.',
        fix: 'Stability is about the mathematical trend, not the rendering. 0.5^n never equals zero; it is stable because it *decays*. Conversely a response that looks flat at 1.0 forever is already marginal. Check the per-step ratio (|a| < 1, or poles inside the unit circle in general).',
      },
      {
        mistake: 'Assuming FIR filters cannot misbehave.',
        fix: 'FIR cannot diverge, but a poorly chosen FIR can distort badly (ripple, long delay, poor attenuation). "Always stable" constrains one failure mode, not quality.',
      },
      {
        mistake: 'Calling the impulse response "the filter\'s output" without naming the input.',
        fix: 'The impulse response is the output *to the unit impulse specifically*. Always state the input; h[n] is a property of the system, y[n] is a property of an experiment.',
      },
    ],
    guidedPractice: {
      title: 'Two-tap FIR by superposition',
      brief:
        'A filter has h = [0.5, 0.5] (y[n] = 0.5x[n] + 0.5x[n-1]). Using superposition (or direct recursion — do both), compute y for x = [4, 0, 0, 0] and for x = [1, 1, 1, 1].',
      expectedBehavior:
        'Impulse input: y = [0.5, 0.5, 0, 0] — the impulse response itself. Step input: y = [0.5, 1.0, 1.0, 1.0] — one sample of half-then-full, settling at the DC gain 1. Direct recursion for the step: y[0]=0.5(1)+0.5(0)=0.5; y[1]=0.5+0.5=1.0; y[2]=0.5(1)+0.5(1)=1.0.',
      hints: [
        'The response to an impulse IS h.',
        'For the step, superposition gives h[n] + h[n-1]: 0.5, 0.5+0.5, 0+0.5 shifted...',
        'DC gain of a FIR is the sum of its coefficients: 0.5 + 0.5 = 1.',
      ],
      challengeId: 'ece-matlab-02-convolution',
    },
    practiceExercises: [
      {
        title: 'Instability on paper',
        brief:
          'For y[n] = 1.1 y[n-1] + x[n] at rest, trace four samples of the impulse response, then compute how many samples it takes for the response to exceed 2.0 in magnitude.',
        expectedBehavior:
          'h = 1, 1.1, 1.21, 1.331, ... Each step multiplies by 1.1; 1.1^n > 2 at n = ceil(ln2/ln1.1) = ceil(7.27) = 8, i.e. h[8] = 1.1^8 = 2.1436 > 2. (h[7] = 1.9487 < 2.)',
        hints: [
          'Multiply successively by 1.1 — do not exponentiate blindly.',
          '1.1^7 = 1.9487; 1.1^8 = 2.1436.',
          'Growth is slow at first, then relentless — the practical danger of marginal instability.',
        ],
      },
      {
        title: 'Design the opposite',
        brief:
          'Give one application where FIR is clearly the better choice and one where IIR is, each justified with one property from the comparison table.',
        expectedBehavior:
          'Example FIR case: a mastering EQ where phase must be exactly linear (symmetric FIR) so transients keep their shape, and CPU is available. Example IIR case: a hearing-aid or sensor low-pass needing a sharp cutoff in few multiply-accumulates on a tiny MCU, where a few IIR coefficients beat hundreds of FIR taps. Any pairing justified from the table is acceptable.',
        hints: [
          'Pull one row at a time from the table: phase, efficiency, stability.',
          'Compute budgets and phase fidelity are the usual deciding rows.',
        ],
      },
    ],
    assessment: {
      title: 'Impulse response checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'What is the impulse response of y[n] = 0.5 x[n] + 0.5 x[n-1] (at rest)?',
          options: ['h = [0.5, 0.5]', 'h = [1, 0.5, 0.25]', 'h = [0.5, 1.0]', 'h = [1, 1]'],
          answer: 'h = [0.5, 0.5]',
          explanation:
            'Feed δ = [1, 0, 0, ...]: y[0] = 0.5(1) + 0.5(0) = 0.5; y[1] = 0.5(0) + 0.5(1) = 0.5; y[2] = 0. The response is the coefficient list itself for FIR filters.',
          hint: 'Impulse in, read out the taps.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'A filter\'s difference equation contains the term 0.9 y[n-1]. Without further analysis, what can be concluded?',
          options: [
            'It is IIR and, with |0.9| < 1 at first order, likely stable',
            'It is FIR because the coefficient is below 1',
            'It is definitely unstable',
            'It has linear phase',
          ],
          answer: 'It is IIR and, with |0.9| < 1 at first order, likely stable',
          explanation:
            'Feedback makes it IIR. For a first-order system the response a^n with a = 0.9 decays, so it is stable; higher-order systems need the full pole check, hence "likely" pending design verification.',
          hint: 'Feedback => IIR; |a| < 1 => first-order decay.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'An FIR filter\'s response to any input can be computed as shifted, scaled copies of its impulse response added together.',
          answer: 'true',
          explanation:
            'That is exactly superposition plus time invariance — the convolution sum. It holds for all LTI systems; for FIR it terminates after a finite number of terms.',
          hint: 'Decompose the input into shifted impulses.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'short-answer',
          prompt:
            'For y[n] = a y[n-1] + x[n], the DC gain equals 1/(1-a). What is the DC gain for a = -0.5 (decimal)?',
          answer: '0.667',
          explanation:
            '1/(1-(-0.5)) = 1/1.5 = 0.666... ≈ 0.667. A negative feedback coefficient *reduces* DC gain below 1 — the mechanism behind smoothing filters.',
          hint: '1/(1+0.5).',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Unit impulse δ[n]', definition: 'The sequence that is 1 at n = 0 and 0 elsewhere.' },
      { term: 'Impulse response h[n]', definition: 'The output of an LTI system to δ[n]; its complete fingerprint.' },
      { term: 'FIR filter', definition: 'A filter whose output is a finite weighted sum of input samples; finite impulse response, always stable.' },
      { term: 'IIR filter', definition: 'A filter with feedback from past outputs; infinite decaying response, efficient but stability-critical.' },
      { term: 'Linear phase', definition: 'Delay that is identical at all frequencies, achieved by symmetric FIR coefficients; preserves waveform shape.' },
    ],
    revisionSummary: [
      'Impulse response = output to δ[n]; any LTI output is a sum of shifted, scaled copies of h (convolution).',
      'Feedback terms in the difference equation => IIR; input-only terms => FIR.',
      'FIR: stable, linear-phase capable, many taps. IIR: sharp and cheap, stability must be verified.',
      'First order: h[n] = a^n; stable iff |a| < 1; DC gain 1/(1-a).',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Convolution chapter', url: 'https://www.dspguide.com/ch6.htm', kind: 'docs' },
      { label: 'Wikipedia — Finite impulse response', url: 'https://en.wikipedia.org/wiki/Finite_impulse_response', kind: 'article' },
      { label: 'Wikipedia — Infinite impulse response', url: 'https://en.wikipedia.org/wiki/Infinite_impulse_response', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'dsp-m02-l3',
    title: 'The Moving-Average Filter, Traced End to End',
    summary:
      'The workhorse smoother: its difference equation, a hand-computed output, and the same computation in GNU Octave with every printed value accounted for.',
    objectives: [
      'Write the M-point moving-average difference equation.',
      'Hand-compute its output for a step-like input and predict the ramp.',
      'Implement it in Octave with explicit boundary handling.',
      'Explain the delay (group latency) and noise-smoothing trade-off of averaging.',
    ],
    whyItMatters:
      'The moving average is the most implemented DSP filter in embedded systems — smoothing sensor readings, debouncing signals, easing control values. It is also the perfect first filter to fully verify: short enough to trace by hand, representative enough to introduce tap buffers, boundary handling and latency, which every later filter shares.',
    prerequisites: [
      'dsp-m02-l1 and dsp-m02-l2 (difference equations, impulse response)',
    ],
    explanation:
      'The M-point **moving average** outputs the mean of the most recent M inputs:\n\n```\ny[n] = ( x[n] + x[n-1] + ... + x[n-M+1] ) / M\n```\n\nIt is an FIR filter whose impulse response is M identical values of 1/M: for M = 4, h = [0.25, 0.25, 0.25, 0.25]. Two consequences fall straight out of that: the **DC gain is 1** (coefficients sum to 1 — a constant input passes at its own value), and fast wiggles average away while slow trends pass — smoothing, with a **delay of (M-1)/2 samples** because the output at n is centred on old data.\n\n### Hand trace: step-down input, M = 4\n\nInput: eight samples, 8 for a while, then 0 (a step down at n = 4), assuming x[n] = 0 before the array starts:\n\n```\nx = [8, 8, 8, 8, 0, 0, 0, 0]\n\ny[0] = (8 + 0 + 0 + 0)/4 = 2      <- window fills up: the ramp\ny[1] = (8+8+0+0)/4       = 4\ny[2] = (8+8+8+0)/4       = 6\ny[3] = (8+8+8+8)/4       = 8      <- steady: gain 1 on the constant\ny[4] = (0+8+8+8)/4       = 6      <- the step leaves: mirrored ramp down\ny[5] = (0+0+8+8)/4       = 4\ny[6] = (0+0+0+8)/4       = 2\ny[7] = (0+0+0+0)/4       = 0\n```\n\nOutput: 2, 4, 6, 8, 6, 4, 2, 0. The instant step became a two-sample-per-side ramp: that is the filter\'s smoothing, and the ramp\'s asymmetry is the (M-1)/2 = 1.5-sample group delay made visible. Every number above is checkable with mental arithmetic — and the Octave script below reproduces them exactly.',
    deepDive:
      '### The sliding-sum shortcut, and why it matters on small CPUs\n\nNaive code re-adds M samples per output: M multiply-free additions per sample. The **recursive running sum** does better: keep S = sum of the last M inputs; each step add the new sample and subtract the one leaving the window, then divide by M — two operations per sample regardless of M. On an MCU without a hardware multiplier, that is the difference between feasible and not. The catch: the running sum must be updated in the right order (add, subtract, or subtract, add — but never divide a stale sum), and in fixed-point (module 04) the accumulate-then-divide order protects precision. This tiny optimisation is a first taste of the implementation thinking that fills module 04.',
    examples: [
      {
        title: 'Moving average in GNU Octave, fully traced',
        language: 'octave',
        code: `% Runs on GNU Octave via the platform evaluator; MATLAB-compatible syntax.
x = [8 8 8 8 0 0 0 0];   % step down at n = 4 (0-based)
M = 4;
N = length(x);
y = zeros(1, N);

for n = 1:N                    % Octave position; sample index is n-1
  acc = 0;
  for k = 0:M-1                % k = 0..3: x[n], x[n-1], x[n-2], x[n-3]
    idx = n - k;               % Octave index of sample (n-1)-k
    if idx >= 1                % treat samples before the array as 0
      acc = acc + x(idx);
    end
  end
  y(n) = acc / M;
  fprintf('y[%d] = %.1f\\n', n - 1, y(n));
end`,
        explanation: [
          'The inner loop gathers the M most recent samples; the guard `idx >= 1` implements "history before the array is zero" — the same assumption as the hand trace.',
          'The printed label n-1 keeps the mathematical 0-based index in view while the storage stays 1-based.',
          'Hand-check against the lesson trace: acc at n=1 is 8 (only x[1] exists) -> y[0] = 2.0; acc at n=4 is 32 -> y[3] = 8.0; acc at n=5 is 24 -> y[4] = 6.0.',
          'Expected output, exactly:',
          'y[0] = 2.0',
          'y[1] = 4.0',
          'y[2] = 6.0',
          'y[3] = 8.0',
          'y[4] = 6.0',
          'y[5] = 4.0',
          'y[6] = 2.0',
          'y[7] = 0.0',
          'The printed sequence equals the hand trace line for line — the verification habit this course is built on.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'Step into moving average: the ramp is the smoothing (illustrative)',
        content:
          '  x[n]                                y[n]\n  8 | o o o o                     8 |       o\n    |         |                     |      / \\\n    |         v  step down          6 |     /   \\\n  0 |         o o o o              4 |    /     \\\n                                    2 |   /       \\\n                                  0 |__/         \\___\n                                     0 1 2 3 4 5 6 7   n\n\n  ramp up: window fills (n=0..3)\n  peak at steady input (n=3)\n  ramp down: window drains (n=4..7)\n\n  (educational waveform (illustrative) — plotted from the\n   verified values 2 4 6 8 6 4 2 0)',
        caption:
          'A step becomes a linear ramp of slope 8/4 per sample on each side. The ramp\'s midpoint sits (M-1)/2 = 1.5 samples after the input edge — the filter\'s delay.',
      },
    ],
    tables: [
      {
        caption: 'Moving-average properties (M = 4 example)',
        headers: ['Property', 'Value', 'Where it comes from'],
        rows: [
          ['Impulse response', 'h = [0.25, 0.25, 0.25, 0.25]', '1/M for M samples'],
          ['DC gain', '1', 'coefficients sum to 4/4 = 1'],
          ['Group delay', '(M-1)/2 = 1.5 samples', 'centroid of h'],
          ['Output length', 'same as input (with zero history)', 'FIR of length 4'],
          ['Operations per sample', 'M adds + 1 divide (naive); 2 ops + 1 divide (running sum)', 'lesson deep dive'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dividing each input by M before summing (per-sample rounding) in fixed-point code.',
        fix: 'Accumulate first, divide once at the end. Dividing early throws away bits on every term (module 04 quantifies exactly this); the running-sum form keeps full precision until the single final division.',
      },
      {
        mistake: 'Wrong boundary behaviour at the start of the array.',
        fix: 'Decide and implement the convention: samples before n = 0 are zero (startup transient, as traced here), or the filter only outputs after the window fills. The transient values 2, 4, 6 are correct *given* the zero-history convention — silently picking another convention is how "the filter is wrong" bugs start.',
      },
      {
        mistake: 'Expecting the moving average to preserve edges exactly.',
        fix: 'Averaging is smoothing: steps become ramps of duration M-1 samples. If edges must stay sharp while noise is removed, a moving average is the wrong tool (look at median filters for impulse noise, or proper low-pass designs).',
      },
    ],
    guidedPractice: {
      title: 'Change M, predict the trace',
      brief:
        'For the same input x = [8, 8, 8, 8, 0, 0, 0, 0], predict the output of the M = 2 moving average at every sample, assuming zero history. Then state its group delay.',
      expectedBehavior:
        'y = [4, 8, 8, 8, 4, 0, 0, 0]: y[0] = (8+0)/2 = 4; y[1] = (8+8)/2 = 8; steady 8 through y[3]; y[4] = (0+8)/2 = 4; y[5] = 0; then 0. Group delay (M-1)/2 = 0.5 samples — half of M = 4\'s 1.5.',
      hints: [
        'Two-term windows: x[n] + x[n-1], halved.',
        'The steady plateau equals the DC gain 1 times the input 8.',
        'Delay shrinks as M shrinks — but so does the smoothing.',
      ],
    },
    practiceExercises: [
      {
        title: 'Running-sum implementation (paper)',
        brief:
          'Write the update rule for the recursive running sum S over an M = 4 window at each step, and apply it to x = [8, 8, 8, 8, 0, 0, 0, 0] listing S and y = S/4 at every step. Verify the y values match the lesson trace.',
        expectedBehavior:
          'S starts 0. Each step: S = S + x[n] - x[n-4] (x[n-4] = 0 when n < 4, using 0-based n). S: 8, 16, 24, 32, 24, 16, 8, 0 -> y = S/4: 2, 4, 6, 8, 6, 4, 2, 0 — identical to the direct-window computation, with 2 additions per sample instead of 3.',
        hints: [
          'The sample leaving the window at step n is x[n-M].',
          'Check S[3] = 32 against the direct sum of the first four inputs.',
          'Same outputs, fewer operations — that is the whole point.',
        ],
      },
      {
        title: 'Noise smoothing, quantified lightly',
        brief:
          'A sensor signal is a constant 10 plus independent noise samples of ±2 (alternating +2, -2, +2, -2...). Compute the output of the M = 4 moving average after the window fills, and state the noise reduction factor.',
        expectedBehavior:
          'Once the window holds four samples, each window contains two +2 and two -2 noise values: sum = 40 + 0 = 40, output exactly 10 — the alternating noise cancels completely. In general, averaging M independent noise terms reduces noise power by M (amplitude by sqrt(M)); this alternating case is the best possible cancellation.',
        hints: [
          'Sum the noise inside one full window: +2 -2 +2 -2.',
          'The constant 10 passes at DC gain 1.',
          'General rule: noise amplitude falls as sqrt(M) for independent noise.',
        ],
      },
    ],
    assessment: {
      title: 'Moving average checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'For the M = 4 moving average with zero history, what is y[1] for input x = [8, 8, 8, 8, 0, 0, 0, 0]?',
          options: ['4', '8', '2', '6'],
          answer: '4',
          explanation:
            'The window at n = 1 holds x[1] and x[0] (history is zero): (8 + 8 + 0 + 0)/4 = 4. The window fills linearly: 2, 4, 6, 8.',
          hint: 'How many 8s are inside the window at n = 1?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is the group delay of the M-point moving average?',
          options: ['(M-1)/2 samples', 'M samples', 'M/2 samples exactly for all M', '1 sample always'],
          answer: '(M-1)/2 samples',
          explanation:
            'The impulse response is a rectangle of M equal taps; its centre of mass sits (M-1)/2 samples after the input. For M = 4: 1.5 samples.',
          hint: 'Where is the middle of the window relative to its newest sample?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The M-point moving average is an IIR filter because each output depends on past inputs.',
          answer: 'false',
          explanation:
            'Depending on *past inputs* is feed-forward — FIR. IIR requires feedback from past *outputs*. The moving average forgets completely after M samples.',
          hint: 'Which signals appear on the right-hand side: x or y?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the Octave script, what does the guard `if idx >= 1` implement?',
          code: 'idx = n - k;\nif idx >= 1\n  acc = acc + x(idx);\nend',
          options: [
            'Samples before the array start contribute zero',
            'The filter skips every fourth sample',
            'Division by zero is prevented',
            'The loop runs only four times',
          ],
          answer: 'Samples before the array start contribute zero',
          explanation:
            'When n - k < 1 the referenced sample lies before the array (n < 0 in 0-based terms); skipping the addition treats that history as zero, matching the hand-trace convention.',
          hint: 'What mathematical index does idx = 0 correspond to?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Moving average', definition: 'FIR filter outputting the mean of the most recent M inputs; h = M taps of 1/M.' },
      { term: 'Window (tap buffer)', definition: 'The stored set of the M most recent inputs used to compute one output.' },
      { term: 'Group delay', definition: 'The (M-1)/2-sample lag between input events and the filter\'s response to them.' },
      { term: 'Running sum', definition: 'Recursive implementation: S += x[n] - x[n-M]; two operations per sample for any M.' },
    ],
    revisionSummary: [
      'y[n] = mean of last M inputs; h = M taps of 1/M; DC gain exactly 1.',
      'Step inputs become ramps; delay is (M-1)/2 samples.',
      'Boundary convention (zero history) must be stated and implemented identically in hand trace and code.',
      'Running-sum form: 2 operations per sample for any M — the standard embedded trick.',
    ],
    furtherReading: [
      { label: 'The Scientist and Engineer\'s Guide to DSP — Moving average filters', url: 'https://www.dspguide.com/ch15.htm', kind: 'docs' },
      { label: 'Wikipedia — Moving average', url: 'https://en.wikipedia.org/wiki/Moving_average', kind: 'article' },
      { label: 'GNU Octave documentation', url: 'https://docs.octave.org/latest/', kind: 'tool' },
    ],
    estimatedMinutes: 40,
  },
];
