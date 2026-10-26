import type { TutorialLesson } from '../types';

export const module07Lessons: TutorialLesson[] = [
  {
    id: 'embc-m07-l1',
    title: 'UART Frames and Baud Rates',
    summary:
      'The simplest serial link dissected: idle levels, start bit, LSB-first data, stop bit — plus baud-rate generation arithmetic and where framing errors come from.',
    objectives: [
      'Draw a UART frame for a given byte, bit by bit, LSB first.',
      'Compute bit times and frame times from the baud rate.',
      'Compute a baud-rate divider from a clock and evaluate the resulting error.',
      'Explain framing errors, overrun and why both ends must agree on the frame format.',
    ],
    whyItMatters:
      'UART is the universal debug channel of embedded development — the first thing working on any new board. It is also the cleanest introduction to serial protocols: fixed frames, timing budgets and error flags, all of which reappear in SPI and I2C.',
    prerequisites: ['embc-m05-l1', 'embc-m03-l3'],
    explanation:
      'UART (universal asynchronous receiver/transmitter) sends bytes over two wires — TX and RX, crossed between the two devices — with **no shared clock**. Both sides instead agree in advance on a bit rate (the **baud rate**) and a frame format, and resynchronise on every byte.\n\n### The frame\n\nThe line idles **high**. To send a byte, the transmitter pulls the line low for one bit time (the **start bit**), then sends the 8 data bits **least-significant bit first**, then returns the line high for at least one **stop bit** (1, 1.5 or 2 bit times; 1 is typical). Optionally a **parity bit** sits between data and stop for single-bit error detection. Ten bits per byte (start + 8 data + stop) is the common case, so 9600 baud moves at most 960 bytes per second.\n\nThe receiver\'s trick for having no clock: it waits for the falling edge (start), then samples the middle of each bit time using its own baud generator. Its clock must match the transmitter\'s within a few percent, because the sampling instants drift across the 10-bit frame — by bit 9, a 5% error is half a bit and the frame falls apart. That is the error budget: **combined clock error of both ends must stay under roughly 2-4%**, and the manual of your UART specifies the exact allowance.\n\n### Baud-rate generation\n\nThe UART divides its input clock to make the baud rate, typically oversampling each bit 16 times. The divider is **DIV = f_clk / (16 * baud)**, rounded to an integer the hardware accepts — and the rounding *is* the error. With f_clk = 72 MHz and a target of 115200: DIV = 72,000,000 / (16 * 115200) = 39.06 → 39, actual baud = 72,000,000 / (16 * 39) = 115,384.6, an error of +0.16% — comfortably fine. Low baud rates divide more exactly; very high baud rates on slow clocks are where errors blow past the budget.\n\n### Error flags\n\nReal UARTs report their failures in a status register: **framing error** (a stop bit sampled as 0 — wrong baud, noise, or the line broke mid-frame), **overrun** (a new byte finished before software read the last one — the receive path lost data), and **parity error** where parity is used. Draining errors (reading the status) is part of any receive routine; module 07-l2 wires them into the polling loop.',
    deepDive:
      '### Sampling, majority voting and the 16x clock\n\nWhy oversample at 16x? The receiver counts 16 of its own ticks per bit and samples three times around the middle of each bit (e.g. ticks 7, 8, 9), taking a majority. This rejects glitches that would corrupt a single mid-bit sample and anchors the resynchronisation at every start edge. It also explains the divider formula: the hardware needs a clock 16 times the baud rate because it must place those sample points. Some UARTs oversample 8x for higher baud rates — same idea, tighter error budget.\n\n### Where baud accuracy really comes from\n\nThe divider rounding is only one error term. The other is the clock source itself: a crystal is parts-per-million accurate, but an internal RC oscillator can drift 1-2% over voltage and temperature — and UART is one of the few interfaces where that *directly* causes framing errors, because there is no clock line to recover from. This is why boards intended for reliable high-baud serial almost always clock the UART from a crystal (or why ESP32/STM32 documentation discusses clock source selection for UART). Add both ends\' errors, keep the sum inside the datasheet budget — typically a few percent — and framing errors stay theoretical.\n\n### Reading UART chapters in a real manual, honestly\n\nEvery vendor\'s UART chapter has the same sections: frame format diagram (theirs will match the one above, bit for bit), baud-rate generation formula *for their specific divider scheme* (some use f_clk/(16*DIV), some f_clk/(16*(DIV+fractional parts)), ATmega uses UBRR = f_clk/(16*baud) − 1 — note the different rounding form), and the status-flag table (TXE/RXNE/TXE-empty/TC, framing/overrun/parity flags, and whether reading DR clears RXNE). Our mock uses simple flag names; when you sit at a real chip, translate: the *concepts* here transfer one-to-one, the *bit positions and clearing idioms* never do.',
    examples: [
      {
        title: 'Building and printing a UART frame for a byte, bit by bit',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Host-side model of the UART transmitter line, one slot per bit. */\nstatic void print_frame(uint8_t byte) {\n    printf("idle(1) START(0)");\n    for (uint8_t i = 0u; i < 8u; i++) {\n        uint8_t bit = (uint8_t)((byte >> i) & 1u); /* LSB first */\n        printf(" d%u=%u", (unsigned)i, (unsigned)bit);\n    }\n    printf(" STOP(1) idle(1)\\n");\n}\n\nint main(void) {\n    print_frame(0x41u);   /* ASCII \'A\' */\n    print_frame(0x00u);   /* NUL byte  */\n    return 0;\n}',
        explanation: [
          'The loop extracts bit i with `(byte >> i) & 1` — shifting the wanted bit to position 0, exactly the extraction idiom from module 02.',
          'For 0x41 = 0100 0001: bits are d0=1, d1=0, d2=0, d3=0, d4=0, d5=0, d6=1, d7=0.',
          'Exact output line 1: `idle(1) START(0) d0=1 d1=0 d2=0 d3=0 d4=0 d5=0 d6=1 d7=0 STOP(1) idle(1)`.',
          'For 0x00 all data bits are 0: line 2 is `idle(1) START(0) d0=0 d1=0 d2=0 d3=0 d4=0 d5=0 d6=0 d7=0 STOP(1) idle(1)` — a frame that looks like one long low pulse with the stop bit marking the end.',
          'This is the frame the waveform diagram shows; receivers sample the middle of each slot and reassemble the byte.',
        ],
      },
      {
        title: 'Baud divider arithmetic with error evaluation',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define F_CLK 72000000u\n#define OVERSAMPLE 16u\n\nstatic void baud_report(uint32_t target) {\n    uint32_t div = (F_CLK + (OVERSAMPLE * target) / 2u)\n                   / (OVERSAMPLE * target);      /* rounded division */\n    uint32_t actual = F_CLK / (OVERSAMPLE * div);\n\n    /* error in tenths of a percent: |actual-target| * 1000 / target */\n    uint32_t err_tenths;\n    if (actual > target) {\n        err_tenths = ((actual - target) * 1000u) / target;\n    } else {\n        err_tenths = ((target - actual) * 1000u) / target;\n    }\n\n    printf("target %6u -> div %3u, actual %6u, error %u.%u%%\\n",\n           (unsigned)target, (unsigned)div, (unsigned)actual,\n           (unsigned)(err_tenths / 10u), (unsigned)(err_tenths % 10u));\n}\n\nint main(void) {\n    baud_report(9600u);\n    baud_report(115200u);\n    return 0;\n}',
        explanation: [
          'The rounded division adds half a divisor before truncating, so 39.06 rounds to 39 and 468.75 rounds to 469 — deliberate rounding, then the error is measured against the target.',
          'For 9600: div = 72000000/(16*9600) = 468.75 → rounded 469; actual = 72000000/(16*469) = 9594.9; error = 5.1/9600 = 0.053%.',
          'For 115200: div = 39.06 → 39; actual = 115384.6; error = 184.6/115200 = 0.16%.',
          'Exact output: `target   9600 -> div 469, actual   9594, error 0.0%` and `target 115200 -> div  39, actual 115384, error 0.1%` (the code prints tenths of a percent, so 9594 shows error 0.0% — integer math on 5.1/9600 gives 0 tenths; the true value is 0.053%, printed truncated as 0.0).',
          'Both errors are far inside the few-percent budget; an RC oscillator adding 1-2% per side would still pass, but only just — which is why UART chapters spend pages on clock sources.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'waveform',
        title: 'UART frame for the byte 0x41 (A)',
        content:
          '  line\n   1 -------+      +---------------------------------+------+------ idle\n            |      |                                 |      |\n            |      |                                 |      |\n   0        +------+                                 +------+\n\n            start    d0   d1   d2   d3   d4   d5   d6    d7   stop\n  0x41 = 0100 0001 -> LSB first: 1,0,0,0,0,0,1,0\n\n  one bit time @9600 baud = 1/9600 s = 104.2 us\n  whole frame (10 bits)   = 1.042 ms',
        caption:
          'Educational waveform (illustrative). Idle high, falling start edge, eight data bits LSB first, high stop bit. The receiver resynchronises on every start edge.',
      },
    ],
    tables: [
      {
        caption: 'Bit and frame timing at common baud rates (10-bit frames)',
        headers: ['Baud', 'Bit time', 'Max bytes/s'],
        rows: [
          ['9600', '104.2 us', '960'],
          ['19200', '52.1 us', '1920'],
          ['115200', '8.68 us', '11520'],
        ],
      },
      {
        caption: 'Divider examples at f_clk = 72 MHz, 16x oversampling',
        headers: ['Target baud', 'Ideal DIV', 'Used DIV', 'Actual baud', 'Error'],
        rows: [
          ['9600', '468.75', '469', '9594.9', '−0.053%'],
          ['38400', '117.19', '117', '38461.5', '+0.16%'],
          ['115200', '39.06', '39', '115384.6', '+0.16%'],
        ],
      },
      {
        caption: 'UART status flags (generic names; positions differ per vendor)',
        headers: ['Flag', 'Meaning', 'Typical clearing'],
        rows: [
          ['TXE', 'Transmit data register empty — may load next byte', 'Reading status / writing DR'],
          ['RXNE', 'Received data ready — must read DR', 'Reading DR'],
          ['FE', 'Framing error: stop bit was 0', 'Read status then DR'],
          ['ORE', 'Overrun: byte lost, RX not drained in time', 'Read status then DR'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Mixing up baud and bytes per second.',
        fix:
          'Baud is bits per second on the wire; a 10-bit frame makes bytes/s ≈ baud/10. 9600 baud is about 960 bytes/s, not 9600.',
      },
      {
        mistake: 'Crossing TX and RX straight through (TX-to-TX, RX-to-RX).',
        fix:
          'UART is cross-wired: this device\'s TX goes to the other\'s RX. A silent link with clean idle levels on both lines is the classic crossed/uncrossed wiring symptom.',
      },
      {
        mistake: 'Trusting the divider math without checking the datasheet\'s exact formula.',
        fix:
          'Divider schemes differ (some subtract 1, some have fractional fields). Compute with the vendor formula and verify the resulting error against the budget — the concept here, the constants there.',
      },
    ],
    guidedPractice: {
      title: 'Frame and timing drill',
      brief:
        'For the byte 0xC3: (a) list the 8 data bits in transmission order; (b) compute the frame duration at 19200 baud; (c) state what a receiver that expects 8N1 would see if the sender actually used 2 stop bits.',
      expectedBehavior:
        '(a) 0xC3 = 1100 0011 → LSB first: 1,1,0,0,0,0,1,1. (b) 10 bits at 1/19200 = 52.1 us each → 521 us per frame. (c) It still receives the byte correctly — the extra stop bit looks like idle time before the next start; stop-bit count only matters as a minimum idle, and mismatched *start/data* timing is what breaks frames.',
      hints: [
        'Write the byte in binary and read it right-to-left.',
        'The receiver samples only up to the first stop bit.',
      ],
    },
    practiceExercises: [
      {
        title: 'Error budget check',
        brief:
          'Device A uses a crystal (error 0.02%) and B an internal RC that can drift +2.0%. At 115200 baud with a 3% combined budget: does the link work at the worst case? At 9600 with a 5% budget?',
        expectedBehavior:
          '115200: divider error +0.16% plus crystal 0.02% plus RC 2.0% ≈ 2.2% worst case — inside 3%, works. 9600: ≈ 2.1% — inside 5%. In both cases the RC dominates; at higher baud or a 5% budget at 115200 the margin would be thin, and the RC drift direction can add rather than cancel.',
        hints: [
          'Sum the worst-case magnitudes of both ends plus the divider error.',
          'Budgets are per-UART-model; the principle is the sum stays below it.',
        ],
      },
      {
        title: 'Predict the divider',
        brief:
          'An 8 MHz clock, 16x oversampling, target 9600 baud: compute DIV exactly, choose the integer, give the actual baud and error. Compare with the ATmega form UBRR = 8e6/(16*9600) − 1 = 51.08 → 51 and verify both forms describe the same hardware choice.',
        expectedBehavior:
          'DIV = 8e6/153600 = 52.08 → 52 → actual 8e6/(16*52) = 9615.4 (+0.16%). ATmega form: UBRR = 51 means divisor 52 — identical hardware value, different formula convention (one names the divisor, the other divisor−1).',
        hints: [
          '16*9600 = 153,600.',
          'UBRR+1 is the divisor.',
        ],
      },
    ],
    assessment: {
      title: 'UART frames checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'In a UART frame, data bits are sent:',
          options: [
            'Least-significant bit first',
            'Most-significant bit first',
            'In parallel',
            'In an order negotiated per byte',
          ],
          answer: 'Least-significant bit first',
          explanation:
            'Standard UART order is LSB first after the start bit — the frame diagram and the print_frame example both show it.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'At 115200 baud with 10-bit frames, the maximum byte rate is about:',
          options: ['11520 bytes/s', '115200 bytes/s', '11520 bits/s', '9600 bytes/s'],
          answer: '11520 bytes/s',
          explanation: '115200 bits/s ÷ 10 bits per frame = 11,520 bytes/s.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'A framing error means a stop bit was sampled as low.',
          options: ['true', 'false'],
          answer: 'true',
          explanation:
            'The stop position must be high; a 0 there signals baud mismatch, noise or a broken frame.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'What does print_frame(0x05) print for the data bits?',
          code: 'for (uint8_t i = 0u; i < 8u; i++) {\n    printf(" d%u=%u", i, (byte >> i) & 1u);\n} /* byte = 0x05 */',
          options: ['d0=1 d1=0 d2=1 d3=0 ... d7=0', 'd0=1 d1=1 d2=1 ... ', 'd0=0 d1=0 d2=1 ...', 'd0=5'],
          answer: 'd0=1 d1=0 d2=1 d3=0 ... d7=0',
          explanation:
            '0x05 = 0000 0101: bit0=1, bit1=0, bit2=1, bits 3-7=0. LSB first prints 1,0,1,0,0,0,0,0.',
          hint: 'Read the byte right to left.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Name the two error conditions that occur when software is too slow to drain received bytes, and when the baud clocks disagree.',
          answer: 'overrun (ORE) and framing error (FE)',
          explanation:
            'Overrun: a completed byte was overwritten because DR was not read in time. Framing error: the sampling drift made the stop bit read 0.',
          hint: 'One is about time, one about rate.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Baud rate', definition: 'Bits per second on the wire; a 10-bit frame carries one byte.' },
      { term: 'Start / stop bit', definition: 'The low pulse that begins a frame and the high level that ends it — the resynchronisation markers.' },
      { term: 'Oversampling', definition: 'Receiving each bit from several samples (typically 16x clock) with majority voting.' },
      { term: 'Framing error', definition: 'Status flag raised when a stop bit reads 0 — clock mismatch or noise.' },
      { term: 'Overrun', definition: 'Status flag raised when a received byte is overwritten before software reads it.' },
    ],
    revisionSummary: [
      'Idle high; start 0; 8 data LSB first; stop 1. 10 bits per byte.',
      'Bit time = 1/baud; frame = 10 bit times.',
      'DIV = f_clk/(16*baud), rounded; the rounding is the error.',
      'Combined clock error of both ends must fit the budget (a few percent).',
      'Status flags: TXE, RXNE, framing, overrun — read the vendor table for positions and clearing.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Universal asynchronous receiver-transmitter', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'Wikipedia — Baud', url: 'https://en.wikipedia.org/wiki/Baud', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m07-l2',
    title: 'Driving a UART: Polling, Interrupts and Timeouts',
    summary:
      'Move bytes through status flags and a data register — polled transmit, polled and bounded receive, then the interrupt-driven echo service on a mock UART.',
    objectives: [
      'Drive a mock UART\'s TXE/RXNE flags for byte transmit and receive.',
      'Write a bounded (timeout) receive function instead of an unbounded wait.',
      'Trace an echo program end to end on the mock.',
      'Decide when polled UART service is acceptable and when interrupts are required.',
    ],
    whyItMatters:
      'Once your printf works over UART, you can debug everything else. This lesson is also the first complete driver: flags, data register, error handling, timeout policy — the same skeleton every peripheral driver follows.',
    prerequisites: ['embc-m07-l1', 'embc-m06-l1'],
    explanation:
      'A UART exposes two registers that matter: a **data register (DR)** — writing it queues a byte for transmission, reading it fetches the oldest received byte — and a **status register (SR)** whose TXE bit says "transmit holding register empty, you may write DR" and whose RXNE bit says "a received byte is waiting in DR".\n\n### Polled transmit\n\nSending one byte: wait for TXE, write DR. At 9600 baud each byte takes ~1 ms on the wire, but the *write* returns immediately — the UART shifts the byte out in the background while your code continues. TXE clears on the DR write and sets again when the byte moves to the shift register, so back-to-back writes pace themselves naturally. The one caveat: "write returned" does not mean "wire idle" — a **transmission-complete** flag (TC) exists for when the last bit must physically be gone (e.g. before switching a shared pin to another function).\n\n### Polled receive — with a timeout\n\nReceiving is where naive code dies: `while (RXNE == 0)` waits forever if the cable falls out. Every production receive is **bounded**:\n\n```c\n/* try for `tries` polls; return 1 and the byte, or 0 on timeout */\nuint8_t uart_getc_timeout(uint8_t *out, uint32_t tries);\n```\n\nThe timeout converts a hang into a return code the caller can act on (retry, log, reset the link). Combine with the overrun/framing error flags from lesson 1: a robust receive path checks errors when RXNE is set, drains DR either way (reading DR clears RXNE and the error conditions on most families), and reports failure upward.\n\n### Interrupt-driven service\n\nPolling burns loop iterations and — worse — a byte arriving while you are busy gets the overrun treatment. The interrupt path (module 06 patterns, applied): enable the RXNE interrupt; the ISR reads DR (which clears RXNE) and pushes the byte into a ring buffer; the main loop consumes the buffer at leisure. Transmit can stay polled (it is self-pacing) or become interrupt-driven with a software TX queue; the classic design ships RX via interrupt + ring buffer and TX polled or interrupt-driven depending on latency needs. Lesson 3 builds the ring buffer that completes this design.',
    deepDive:
      '### The echo program as a driver milestone\n\nEcho — read a byte, send it back — is the "hello world" that proves a whole chain: clock config, pin mux, baud generation, flags, and the physical link. Every board bring-up does it first. On our mock the "wire" is a host variable, but the structure is the real structure: wait-flag, act, and the discipline of never assuming a byte is there. When echo works on real hardware, the serial console in module 17 (logs over UART) becomes available for debugging everything else.\n\n### The overrun clock is always ticking\n\nAt 115200 baud a byte arrives every 86.8 us. If RXNE interrupts are enabled but the ISR is delayed 200 us by a higher-priority handler, the *next* byte still arrives on time and the overrun flag sets — data is lost whether or not you notice. This is the quantitative argument for the ring buffer: draining one byte per interrupt is fine while the loop is responsive, but bursts (a paste into a terminal, a sensor dump) arrive faster than any ISR-per-byte scheme can guarantee. Buffer depth converts "must respond within 87 us, always" into "must drain the buffer within N*87 us, on average".\n\n### Line discipline and what your console really does\n\nA terminal sends \r for Enter, \n for newline, and often \b for backspace — raw bytes your firmware must interpret (the "line discipline" layer). Echo implementations that print \n without \r produce the staircase effect on terminals. These details are trivial but they are exactly the kind of protocol knowledge that makes embedded logs readable, and they are pure C string handling — testable on host with the mock.',
    examples: [
      {
        title: 'Polled echo on a mock UART, fully traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Educational mock of a UART. Real firmware uses the vendor\'s USART\n * registers (STM32 USART_SR/DR, ATmega UCSR0A/UDR0, ESP32 FIFO regs);\n * flag positions and clear-on-read behaviour come from each manual. */\nstatic volatile uint8_t MOCK_UART_SR = 0x01u; /* bit0 TXE=1: TX ready  */\nstatic volatile uint8_t MOCK_UART_DR = 0x00u; /* bit1 RXNE (in SR)     */\n#define UART_SR_TXE  (1u << 0)\n#define UART_SR_RXNE (1u << 1)\n\n/* The "wire": a one-byte receive queue the world fills. */\nstatic uint8_t rx_wire[4] = { 0x48u, 0x69u, 0x21u, 0x00u }; /* H, i, ! */\nstatic uint32_t rx_wire_pos = 0u;\n\nstatic void mock_world_tick(void) {\n    /* Deliver the next byte if the DR is empty (real hw does this). */\n    if (((MOCK_UART_SR & UART_SR_RXNE) == 0u) &&\n        (rx_wire[rx_wire_pos] != 0u)) {\n        MOCK_UART_DR = rx_wire[rx_wire_pos];\n        rx_wire_pos++;\n        MOCK_UART_SR |= UART_SR_RXNE;\n    }\n}\n\nstatic uint8_t uart_putc_polled(uint8_t c) {\n    uint32_t guard = 100000u;\n    while (((MOCK_UART_SR & UART_SR_TXE) == 0u) && (guard != 0u)) {\n        guard--;                     /* bounded wait: never hang forever */\n    }\n    if (guard == 0u) {\n        return 0u;                   /* TX stuck: report failure */\n    }\n    MOCK_UART_DR = c;                /* write clears TXE on real hardware */\n    MOCK_UART_SR &= (uint8_t)~UART_SR_TXE;\n    MOCK_UART_SR |= UART_SR_TXE;     /* mock: transmission completes at once */\n    return 1u;\n}\n\nint main(void) {\n    uint32_t sent = 0u;\n\n    for (uint32_t step = 0u; step < 50u; step++) {\n        mock_world_tick();\n        if ((MOCK_UART_SR & UART_SR_RXNE) != 0u) {\n            uint8_t c = MOCK_UART_DR;          /* read clears RXNE (mock) */\n            MOCK_UART_SR &= (uint8_t)~UART_SR_RXNE;\n\n            if (uart_putc_polled(c) != 0u) {   /* echo through TX path    */\n                sent++;\n                printf("echoed 0x%02X (\'%c\')\\n", (unsigned)c, (char)c);\n            }\n        }\n    }\n    printf("total echoed: %u\\n", (unsigned)sent);\n    return 0;\n}',
        explanation: [
          'The world delivers H (0x48), i (0x69), ! (0x21) into DR one at a time; each delivery sets RXNE.',
          'The loop polls RXNE, reads DR (receiving), and echoes through uart_putc_polled: bounded wait for TXE, write DR, and the mock completes the transmission instantly (real hardware clears TXE on write and sets it when the byte moves to the shifter).',
          'Exact output: `echoed 0x48 (\'H\')` / `echoed 0x69 (\'i\')` / `echoed 0x21 (\'!\')` / `total echoed: 3`.',
          'This loop is polling: zero configuration, but it only works while the loop spins — the overrun risk of lesson 1 is one printf away.',
        ],
      },
      {
        title: 'Bounded receive with timeout',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nstatic volatile uint8_t MOCK_UART_SR = 0x01u;\nstatic volatile uint8_t MOCK_UART_DR = 0x00u;\n#define UART_SR_RXNE (1u << 1)\n\n/* Bounded wait: poll up to `tries` times; 1 = got byte, 0 = timeout. */\nstatic uint8_t uart_getc_timeout(uint8_t *out, uint32_t tries) {\n    while (tries != 0u) {\n        if ((MOCK_UART_SR & UART_SR_RXNE) != 0u) {\n            *out = MOCK_UART_DR;\n            MOCK_UART_SR &= (uint8_t)~UART_SR_RXNE;  /* mock clear-on-read */\n            return 1u;\n        }\n        tries--;\n        /* real code would also do other work or sleep here */\n    }\n    return 0u;\n}\n\nint main(void) {\n    uint8_t c = 0u;\n\n    /* Case 1: a byte arrives in time. */\n    MOCK_UART_DR = 0x51u;                 /* \'Q\' */\n    MOCK_UART_SR |= UART_SR_RXNE;\n    if (uart_getc_timeout(&c, 100u) != 0u) {\n        printf("got \'%c\'\\n", (char)c);\n    }\n\n    /* Case 2: the line is silent - timeout path. */\n    MOCK_UART_SR &= (uint8_t)~UART_SR_RXNE;\n    if (uart_getc_timeout(&c, 100u) != 0u) {\n        printf("got \'%c\'\\n", (char)c);\n    } else {\n        printf("timeout: no byte within 100 polls\\n");\n    }\n    return 0;\n}',
        explanation: [
          'Case 1: RXNE is set before the call, so the first poll succeeds: `got \'Q\'`.',
          'Case 2: RXNE stays clear; the counter expires and the function returns 0: `timeout: no byte within 100 polls`.',
          'Exact output: `got \'Q\'` then `timeout: no byte within 100 polls`.',
          'The timeout converts "hang forever if the cable falls out" into a return code the caller routes to recovery logic — mandatory in any real receive path.',
          'In production the poll counter is replaced by the tick-based difference idiom from module 05-l3 (elapsed ticks >= timeout), giving real-time bounds rather than loop counts.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'block',
        title: 'Interrupt-driven UART receive with ring buffer',
        content:
          '  WIRE          UART HARDWARE            ISR                 MAIN LOOP\n  ----          -------------            ---                 ---------\n  byte --->  shift reg -> DR\n             RXNE = 1 ----------------> read DR\n                                        (RXNE clears)\n                                        rb_put(buf, byte) --> rb_get() ...\n                                        return              process/log\n\n  Bursts of bytes fill the ring buffer; the loop drains it at its own\n  pace. Overrun only if (loop drain rate) < (wire arrival rate) for\n  longer than the buffer depth allows.',
        caption:
          'The interrupt path decouples wire timing from loop timing. Module 07-l3 supplies the ring buffer; module 18 uses this exact architecture.',
      },
    ],
    tables: [
      {
        caption: 'Mock UART register map (educational)',
        headers: ['Register', 'Bits', 'Meaning', 'Behaviour'],
        rows: [
          ['SR', 'bit 0', 'TXE: TX ready for a new byte', 'Cleared by DR write; set when TX drains (mock: immediately)'],
          ['SR', 'bit 1', 'RXNE: received byte waiting in DR', 'Set by wire delivery; cleared by DR read'],
          ['DR', 'all 8 bits', 'Transmit/receive data', 'Write = queue TX byte; read = pop RX byte'],
        ],
      },
      {
        caption: 'Polling vs interrupt-driven UART service',
        headers: ['Aspect', 'Polled', 'Interrupt + ring buffer'],
        rows: [
          ['Setup effort', 'Minimal', 'Vector, ISR, buffer'],
          ['CPU cost while idle', 'Loop iterations', 'Zero'],
          ['Burst tolerance', 'Poor (overrun)', 'Buffer-depth bytes'],
          ['Latency', 'One loop iteration', 'ISR latency + drain'],
          ['Typical use', 'Init, test code, low rates', 'Production consoles, data links'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Unbounded receive wait: `while (!RXNE) {}`.',
        fix:
          'Bound every wait (counter or tick-based) and return an error code. A disconnected cable must produce a timeout, not a hung system.',
      },
      {
        mistake: 'Assuming the DR write means the wire is idle.',
        fix:
          'TXE means the *holding* register is free; the shift register may still be sending. If another function needs the pin (or a sleep is next), wait for the transmission-complete (TC-style) flag.',
      },
      {
        mistake: 'Ignoring framing/overrun flags — reading DR "when it works".',
        fix:
          'Check error flags when RXNE is set, and always drain DR even on error (most families clear the error conditions on the status+DR read sequence). Silent error flags make links flaky in ways logs never show.',
      },
    ],
    guidedPractice: {
      title: 'Add a TX queue depth guard',
      brief:
        'Modify the polled TX path: before writing DR, require TXE AND a free slot in a 4-byte software TX queue (head/tail counts you design). Write the enqueue logic and state what the caller sees when the wire is slower than the producer for 5 consecutive bytes.',
      expectedBehavior:
        'Producer enqueues into the 4-slot ring; DR is fed from the queue when TXE is set. The 5th consecutive byte finds the queue full: the caller sees a "queue full" return code (0) and must retry later, drop, or block by policy — the point is the failure becomes explicit instead of an unbounded wait.',
      hints: [
        'Reuse the module 06-l3 split-ownership queue shape.',
        'Full detection: (head + 1) % SIZE == tail.',
      ],
    },
    practiceExercises: [
      {
        title: 'Trace the world-tick delivery',
        brief:
          'In the echo example, change rx_wire to {0x0Du, 0x0Au, 0x00u} (CR, LF). Predict the exact output and explain what a terminal displays when the firmware echoes both bytes but prints only \\n for a newline.',
        expectedBehavior:
          'Output: `echoed 0x0D (\'\\r\')`... in the printf format: `echoed 0x0D (\'\r\')` / `echoed 0x0A (\'\n\')` / `total echoed: 2` (the %c of \\r and \\n shows as control actions in a real terminal). A terminal that receives \\n without \\r moves down a line without returning to column 0 — the staircase effect; hence line discipline converts \\n to \\r\\n on output.',
        hints: [
          'The loop stops when the wire holds 0x00 (the terminator).',
          'Terminals do not auto-return on \\n.',
        ],
      },
      {
        title: 'Overrun arithmetic',
        brief:
          'A polled loop iterates every 5 ms; the link runs at 19200 baud. How many bytes arrive per iteration and what happens to flags if the loop blocks for 200 ms once? Compute with 10-bit frames.',
        expectedBehavior:
          '19200/10 = 1920 bytes/s → 9.6 bytes per 5 ms iteration — the loop MUST read DR more than once per iteration or overrun at steady state. A 200 ms stall admits ~384 bytes: far beyond a single DR, so overrun sets and every byte except the last received is lost.',
        hints: [
          'Bytes per second = baud/10.',
          'A UART without FIFO holds exactly one received byte.',
        ],
      },
    ],
    assessment: {
      title: 'UART driver checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Before writing DR to transmit, correct polled code waits for:',
          options: ['TXE set', 'RXNE set', 'TXE clear', 'framing error'],
          answer: 'TXE set',
          explanation:
            'TXE says the transmit holding register is empty and will accept a new byte.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Why does every production receive function use a timeout?',
          options: [
            'A missing peer or dead link would otherwise hang the caller forever',
            'Timeouts make the UART faster',
            'Flags require it',
            'To save power',
          ],
          answer: 'A missing peer or dead link would otherwise hang the caller forever',
          explanation:
            'Bounded waits turn link failures into return codes that recovery logic can handle.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After a DR write returns, the wire is guaranteed idle.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'The byte may still be in the shift register; a separate transmission-complete flag reports actual wire idle.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'In the echo trace, what is printed for the third byte delivered?',
          code: '/* rx_wire = {\'H\', \'i\', \'!\'}; loop polls RXNE and echoes */',
          options: ["echoed 0x21 ('!')", "echoed 0x69 ('i')", "echoed 0x48 ('H')", 'total echoed: 3'],
          answer: "echoed 0x21 ('!')",
          explanation:
            "The third byte is 0x21, ASCII '!', printed as echoed 0x21 ('!').",
          hint: 'H, i, then which character?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Which single architectural change converts the polled UART from "must respond within one byte time" to "must keep up on average"?',
          answer: 'an interrupt-driven receive path feeding a ring buffer',
          explanation:
            'The ISR stores each byte in the buffer; the loop drains at its own pace. Burst tolerance becomes the buffer depth.',
          hint: 'It involves interrupts and a data structure.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'DR (data register)', definition: 'The UART register written to transmit and read to receive bytes.' },
      { term: 'TXE / RXNE', definition: 'Status flags: transmit register empty; received data ready.' },
      { term: 'Timeout receive', definition: 'A bounded wait that returns an error code instead of hanging on a dead link.' },
      { term: 'Line discipline', definition: 'The software layer interpreting control characters (CR/LF/backspace) in a serial console stream.' },
    ],
    revisionSummary: [
      'TX: wait TXE, write DR. RX: wait RXNE (bounded!), read DR.',
      'TXE = holding register free; TC = wire idle.',
      'Timeouts are mandatory; errors are checked and drained.',
      'Interrupt + ring buffer decouples wire bursts from loop timing.',
      'Echo is the bring-up milestone; \r\n line endings keep terminals readable.',
    ],
    furtherReading: [
      { label: 'Wikipedia — UART operation details', url: 'https://en.wikipedia.org/wiki/Universal_asynchronous_receiver-transmitter', kind: 'article' },
      { label: 'docs.espressif.com — ESP-IDF UART driver (real-world reference)', url: 'https://docs.espressif.com/projects/esp-idf/en/latest/esp32/api-reference/peripherals/uart.html', kind: 'docs' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'embc-m07-l3',
    title: 'The Ring Buffer Module',
    summary:
      'Build the workhorse data structure of embedded I/O: a fixed-size, zero-allocation ring buffer with wrap-safe indices, full/empty handling and a host-testable API.',
    objectives: [
      'Implement a ring buffer with head/tail indices and modulo masking.',
      'Distinguish full from empty with the one-reserved-slot rule.',
      'Explain single-producer/single-consumer lock-freedom and when a critical section is still needed.',
      'Unit-test the buffer on a host, including wraparound.',
    ],
    whyItMatters:
      'The ring buffer is the single most reused data structure in firmware: UART drivers, logging, ADC streaming, command parsers, DMA handoff. It is also the perfect first module to test on a host — the testing module builds directly on this code.',
    prerequisites: ['embc-m07-l2', 'embc-m06-l2'],
    explanation:
      'A **ring buffer** (circular buffer) is a fixed array plus two indices: **head**, where the producer writes, and **tail**, where the consumer reads. Both advance forward and wrap to zero at the end — the array becomes a ring. No allocation, no shifting of data, O(1) put and get forever.\n\n### The indices and the wrap\n\nIndices are unsigned and advanced with masking: `i = (i + 1) & (SIZE - 1)` — which requires SIZE to be a power of two (8, 16, 32...). Masking is both faster than division and, crucially, keeps the wrap *defined* (module 02: unsigned arithmetic is modular by design). Counting the stored bytes uses the same modular trick: `count = (head - tail) & (SIZE - 1)` — the difference is correct across the wrap.\n\n### Full versus empty\n\nBoth full and empty naturally look like `head == tail`, so one convention must break the tie. The standard rule: **reserve one slot** — accept a write only if `(head + 1) & MASK != tail`, which makes "full" mean one free slot remains. Cost: capacity is SIZE−1. Alternative schemes (a separate count variable, or monotonic wrap-counting indices) avoid the lost slot but add either a third shared variable or wider indices — the reserved-slot rule is the smallest and most common.\n\n### Concurrency: the split-ownership contract\n\nWith one producer (an ISR) and one consumer (the main loop), head has exactly one writer and tail has exactly one writer — neither side modifies the other\'s index, so put and get need no critical section on a single-core MCU (volatile and byte-wide updates do the rest; module 06-l3 showed the mechanics). All bets change with two producers or two consumers: then the indices themselves are shared and must be protected. State the contract in the header — it is part of the module\'s interface, not an implementation detail.',
    deepDive:
      '### Why not just use an array with memmove?\n\nA naive "shift everything down on read" queue costs O(n) per operation and produces exactly the kind of unbounded worst-case time that firmware cannot tolerate in an interrupt path. The ring buffer\'s O(1) worst case is what makes it safe to call rb_put from an ISR: the interrupt\'s duration no longer depends on how much data is queued. Predictability beats micro-efficiency in embedded design — the same principle that banned malloc in module 01.\n\n### Sizing a ring buffer honestly\n\nCapacity is a *latency budget*, not a guess: depth × drain rate ≥ burst size. A console link at 115200 baud bursts 64 bytes from a paste; if the loop drains every 10 ms, it removes ~115 bytes per drain — a 32-deep buffer suffices. A sensor streaming 1 kB/s with a loop that stalls 2 s needs ≥ 2 kB. Size from worst-case stall, add margin, and instrument drops (a "dropped bytes" counter turns silent data loss into a visible, loggable event — module 17 exploits this for debugging).\n\n### Variations you will meet\n\nSame skeleton, different trade-offs: byte buffers for streams; element buffers (structs) for event queues (module 18 uses uint32_t events); *zero-copy* ring buffers that hand out direct pointers into the array for DMA (module 14) — those need extra care because the consumer reads a *view* while the producer may wrap; and watermark callbacks (interrupt at half-full/full) that let a DMA-connected UART pipeline large transfers. All of them are the head/tail contract plus problem-specific policy.',
    examples: [
      {
        title: 'The ring buffer module, complete and traced',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n#define RB_SIZE 8u   /* must be a power of two; capacity is RB_SIZE-1 */\n#define RB_MASK (RB_SIZE - 1u)\n\ntypedef struct {\n    uint8_t         buf[RB_SIZE];\n    volatile uint8_t head;   /* producer-owned */\n    volatile uint8_t tail;   /* consumer-owned */\n} ringbuf_t;\n\nstatic uint8_t rb_put(ringbuf_t *rb, uint8_t b) {\n    uint8_t next = (uint8_t)((rb->head + 1u) & RB_MASK);\n    if (next == rb->tail) {\n        return 0u;                        /* full (one slot reserved) */\n    }\n    rb->buf[rb->head] = b;\n    rb->head = next;                      /* publish the byte last */\n    return 1u;\n}\n\nstatic uint8_t rb_get(ringbuf_t *rb, uint8_t *out) {\n    if (rb->tail == rb->head) {\n        return 0u;                        /* empty */\n    }\n    *out = rb->buf[rb->tail];\n    rb->tail = (uint8_t)((rb->tail + 1u) & RB_MASK);\n    return 1u;\n}\n\nstatic uint8_t rb_count(const ringbuf_t *rb) {\n    return (uint8_t)((rb->head - rb->tail) & RB_MASK);\n}\n\nint main(void) {\n    static ringbuf_t rb;                  /* zero-init: empty */\n    uint8_t b;\n\n    /* Three separate puts: never pack side-effecting calls into one\n     * printf argument list - argument evaluation order is unspecified. */\n    uint8_t r1 = rb_put(&rb, \'a\');\n    uint8_t r2 = rb_put(&rb, \'b\');\n    uint8_t r3 = rb_put(&rb, \'c\');\n    printf("put a,b,c: %u%u%u count=%u\\n",\n           (unsigned)r1, (unsigned)r2, (unsigned)r3, (unsigned)rb_count(&rb));\n\n    while (rb_get(&rb, &b) != 0u) {\n        printf("got \'%c\'\\n", (char)b);\n    }\n\n    /* Fill to capacity: 7 bytes fit in an 8-slot buffer. */\n    uint32_t accepted = 0u;\n    for (uint8_t i = 0u; i < 9u; i++) {\n        accepted += rb_put(&rb, (uint8_t)(\'0\' + i));\n    }\n    printf("accepted %u of 9, count=%u\\n",\n           (unsigned)accepted, (unsigned)rb_count(&rb));\n\n    while (rb_get(&rb, &b) != 0u) {\n        printf("%c", (char)b);\n    }\n    printf("\\nempty again: count=%u\\n", (unsigned)rb_count(&rb));\n    return 0;\n}',
        explanation: [
          'put a,b,c returns 1,1,1 and count reports 3 — the modular difference (head 3 − tail 0).',
          'The drain loop prints `got \'a\'` / `got \'b\'` / `got \'c\'`, leaving head = tail = 3 (empty).',
          'Filling from head 3: puts succeed at heads 3,4,5,6,7,0,1 — seven bytes; the 8th put computes next = (2+1)&7 = 3 == tail 3 → full, rejected. accepted = 7 of 9, count = 7.',
          'Draining prints `0123456`, and the final line reads `empty again: count=0` — head and tail met again at 2.',
          'Exact full output: `put a,b,c: 111 count=3` / `got \'a\'` / `got \'b\'` / `got \'c\'` / `accepted 7 of 9, count=7` / `0123456` / `empty again: count=0`.',
        ],
      },
      {
        title: 'ISR-to-loop handoff with the buffer (the real pattern)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\n/* Reusing the same ring buffer API as the previous example. */\n#define RB_SIZE 8u\n#define RB_MASK (RB_SIZE - 1u)\ntypedef struct {\n    uint8_t          buf[RB_SIZE];\n    volatile uint8_t head;\n    volatile uint8_t tail;\n} ringbuf_t;\n\nstatic ringbuf_t uart_rx;              /* producer: simulated RX ISR */\nstatic volatile uint32_t drop_count = 0u;\n\nstatic uint8_t rb_put(ringbuf_t *rb, uint8_t b) {\n    uint8_t next = (uint8_t)((rb->head + 1u) & RB_MASK);\n    if (next == rb->tail) { drop_count++; return 0u; }\n    rb->buf[rb->head] = b;\n    rb->head = next;\n    return 1u;\n}\n\nstatic uint8_t rb_get(ringbuf_t *rb, uint8_t *out) {\n    if (rb->tail == rb->head) { return 0u; }\n    *out = rb->buf[rb->tail];\n    rb->tail = (uint8_t)((rb->tail + 1u) & RB_MASK);\n    return 1u;\n}\n\n/* Simulated ISR: one byte per call, as the real RX ISR would do. */\nstatic void uart_rx_isr(uint8_t byte) { (void)rb_put(&uart_rx, byte); }\n\nint main(void) {\n    /* A burst of 5 bytes arrives faster than the loop drains: */\n    uart_rx_isr(0x31u); uart_rx_isr(0x32u); uart_rx_isr(0x33u);\n    uart_rx_isr(0x34u); uart_rx_isr(0x35u);\n\n    uint8_t b;\n    while (rb_get(&uart_rx, &b) != 0u) {\n        printf("process 0x%02X\\n", (unsigned)b);\n    }\n    printf("drops=%u\\n", (unsigned)drop_count);\n    return 0;\n}',
        explanation: [
          'The ISR-side put is three lines and O(1) — a bounded, predictable interrupt cost regardless of buffer state.',
          'The burst of 5 bytes fits (capacity 7), so the loop processes 0x31..0x35 in order and drop_count stays 0.',
          'Exact output: `process 0x31` / `process 0x32` / `process 0x33` / `process 0x34` / `process 0x35` / `drops=0`.',
          'Had 9 bytes arrived, 2 would have been counted in drop_count — visible instead of silent. Sizing the buffer (deep dive) is what sets how often that happens.',
          'This is the production RX path from lesson 2\'s block diagram, complete: ISR pushes, loop pops, drops counted.',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'Ring buffer indices and the reserved slot',
        content:
          '  index:   0    1    2    3    4    5    6    7\n         +----+----+----+----+----+----+----+----+\n         | D  | E  | F  |    | A  | B  | C  |    |\n         +----+----+----+----+----+----+----+----+\n                   ^tail            ^head\n\n  data flows:  written at head -> read at tail -> both wrap at 8\n  stored bytes: head - tail (mod 8) = 5 - 2 = ... shown: A..F = 6\n  full:  (head+1) & 7 == tail      (one slot always kept empty)\n  empty: head == tail',
        caption:
          'Six bytes (A-F) wrapped around an 8-slot buffer. The gap between head and tail is the data; the reserved slot is what makes "full" detectable.',
      },
    ],
    tables: [
      {
        caption: 'Ring buffer design choices',
        headers: ['Scheme', 'Capacity', 'Shared state', 'Notes'],
        rows: [
          ['Reserved slot (this lesson)', 'SIZE−1', 'head, tail only', 'Simplest; lock-free SPSC'],
          ['Count variable', 'SIZE', 'head, tail, count', 'count needs critical section'],
          ['Monotonic indices (never mask)', 'SIZE', 'two wide counters', 'count = head−tail; wrap at 2^N'],
        ],
      },
      {
        caption: 'Sizing example: worst-case stall × arrival rate + margin',
        headers: ['Scenario', 'Arrival rate', 'Worst stall', 'Minimum depth'],
        rows: [
          ['Console link 115200', '11.5 kB/s', '50 ms', '≥ 576 bytes → 1024'],
          ['Sensor stream', '1 kB/s', '2 s', '≥ 2048 bytes'],
          ['Command interface', '10 B/s', '1 s', '≥ 10 bytes → 16'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using a non-power-of-two size with mask arithmetic.',
        fix:
          '`& (SIZE-1)` only wraps correctly for powers of two. With arbitrary sizes use `% SIZE` (slower but correct) or pick the next power of two.',
      },
      {
        mistake: 'Writing data after advancing head (or advancing tail before reading).',
        fix:
          'Order the operations: write the byte, then publish the new head; read the byte, then advance tail. Reversed order lets the consumer see a half-written slot.',
      },
      {
        mistake: 'Calling put from two different ISRs without protection.',
        fix:
          'The lock-free property holds for exactly one producer and one consumer. Two producers racing on head is a classic RMW lost-update — wrap puts in a critical section or give each producer its own buffer.',
      },
    ],
    guidedPractice: {
      title: 'Hand-simulate a wraparound',
      brief:
        'An 8-slot ring starts empty. Perform: put 1,2,3,4,5,6,7 (7 puts), get 5, put 8,9,10, get 3. After each group, write head, tail and count. Verify the final three gets return 8, 9, 10 in order.',
      expectedBehavior:
        'After 7 puts: head 7, tail 0, count 7. After 5 gets: tail 5, count 2. Put 8,9,10: heads 0,1,2... check full condition: put 8 → next(7+1)&7=0 != tail 5 OK, head 0; put 9 → head 1; put 10 → next(2)=2 != 5 OK head 2, count 5. Get 3: tail 0, count 2 — remaining bytes are 9? Trace contents: after puts, slots hold 8@0,9@1,10@2 with tail 5→ data 6,7 were at 5,6? Recompute: initial puts wrote 1..7 at slots 0..6. After 5 gets tail=5 (consumed slots 0..4 = bytes 1..5). Remaining: slots 5,6 = 6,7. Put 8@7? next after head 7 is 0: but slot 0 is free now (tail passed it) — put 8 → head 0, put 9 → head 1, put 10 → head 2 (next(1+1)... head 1 → next 2 != tail 5 OK). Final gets in order: 6,7,8,9,10 (slots 5,6,7,0,1,2). After getting 3 (6,7,8): tail 0, count 2 → next gets return 9,10.',
      hints: [
        'Mask every index advance: (i+1) & 7.',
        'Count is (head - tail) & 7 — verify after each group.',
      ],
    },
    practiceExercises: [
      {
        title: 'Add peek and flush',
        brief:
          'Extend the module: `rb_peek` returns the oldest byte WITHOUT removing it, and `rb_flush` empties the buffer in one statement. State which single statement flush performs and why peek must not modify any index.',
        expectedBehavior:
          'rb_flush: `rb->tail = rb->head;` — the consumer index jumps to the producer index, making count 0. rb_peek: `*out = rb->buf[rb->tail]; return 1` — no index changes, so repeated peeks see the same byte; only rb_get consumes.',
        hints: [
          'Empty means tail == head — force that condition.',
          'Peek is a read of the slot at tail only.',
        ],
      },
      {
        title: 'Choose a size, justify it',
        brief:
          'A diagnostic logger receives up to 40 bytes per second and the main loop can stall up to 3 seconds during flash writes. Choose RB_SIZE from the power-of-two sizes and compute the margin. State what happens to excess bytes in your design.',
        expectedBehavior:
          'Need ≥ 40*3 = 120 bytes → RB_SIZE 128 (capacity 127). Margin: 7 bytes plus any stall shorter than ~3.17 s. Excess bytes are dropped and counted in drop_count — visible in logs rather than corrupting the stream.',
        hints: [
          'Capacity = SIZE − 1.',
          'Powers of two: 64, 128, 256.',
        ],
      },
    ],
    assessment: {
      title: 'Ring buffer checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'multiple-choice',
          prompt: 'Why keep one slot reserved in a head/tail ring buffer?',
          options: [
            'So full (head+1 == tail) and empty (head == tail) are distinguishable',
            'To make it faster',
            'Because arrays start at index 1',
            'To allow two producers',
          ],
          answer: 'So full (head+1 == tail) and empty (head == tail) are distinguishable',
          explanation:
            'Without the reserved slot, full and empty would both look like head == tail and the consumer could not tell them apart.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'An 8-slot buffer has head = 6, tail = 5. rb_count (modular difference) returns:',
          options: ['1', '7', '3', '0'],
          answer: '1',
          explanation: '(6 − 5) & 7 = 1 — one byte stored.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'The lock-free ring buffer works unchanged when two different ISRs both call rb_put.',
          options: ['true', 'false'],
          answer: 'false',
          explanation:
            'Two producers race on head — a lost-update RMW race. The contract is exactly one producer and one consumer.',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'output-prediction',
          prompt: 'An 8-slot ring (mask 7) has head = 7. What head value results after one successful put?',
          code: 'uint8_t next = (uint8_t)((rb->head + 1u) & RB_MASK);\n/* head = 7, RB_MASK = 7 */',
          options: ['0', '8', '7', '1'],
          answer: '0',
          explanation: '(7 + 1) & 7 = 8 & 7 = 0 — the wrap that makes the array a ring.',
          hint: '8 & 7 in binary: 1000 & 0111.',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'In what order must rb_put perform its two actions on data and index, and why?',
          answer: 'write the byte into the slot first, then advance (publish) head',
          explanation:
            'Publishing head last guarantees the consumer never sees a slot marked as containing data before the data is actually written.',
          hint: 'Think about which index the consumer watches.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Ring buffer', definition: 'Fixed array with wrapping head/tail indices; O(1), allocation-free FIFO.' },
      { term: 'Reserved slot', definition: 'The one-slot gap that distinguishes full from empty.' },
      { term: 'SPSC', definition: 'Single-producer/single-consumer — the sharing contract under which the buffer is lock-free.' },
      { term: 'Watermark', definition: 'A buffer fill level that raises an interrupt/callback (half-full, full) to pipeline draining.' },
    ],
    revisionSummary: [
      'head = producer index, tail = consumer index, both masked to wrap.',
      'count = (head − tail) & MASK — correct across the wrap.',
      'Full: (head+1)&MASK == tail; capacity SIZE−1.',
      'Write data, then publish index; read data, then advance tail.',
      'Lock-free only for exactly one producer and one consumer.',
    ],
    furtherReading: [
      { label: 'Wikipedia — Circular buffer', url: 'https://en.wikipedia.org/wiki/Circular_buffer', kind: 'article' },
      { label: 'Wikipedia — Producer–consumer problem', url: 'https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem', kind: 'article' },
    ],
    estimatedMinutes: 50,
  },
];
