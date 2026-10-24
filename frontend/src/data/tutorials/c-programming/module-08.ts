import type { TutorialLesson } from '../types';

export const module08Lessons: TutorialLesson[] = [
  {
    id: 'cpg-m08-l1',
    title: 'Addresses, Pointers and NULL',
    summary:
      'Learn what an address is, declare and dereference pointers, and adopt the NULL discipline that keeps firmware from acting on invalid locations.',
    objectives: [
      'Explain memory as numbered bytes and pointers as variables holding addresses.',
      'Use & and * correctly and predict a program that writes through a pointer.',
      'Initialize pointers to NULL and test before every use.',
      'Read pointer declarations out loud (pointer to X) without hesitation.',
    ],
    whyItMatters:
      'Pointers are the reason C can touch hardware: a register is just an address you read and write. They are also the reason C programs crash interestingly. Firmware engineers use addresses constantly - memory-mapped I/O, DMA descriptors, callback tables - so the & and * reflexes built here are daily tools, not exam trivia.',
    prerequisites: ['cpg-m07-l1', 'cpg-m06-l1'],
    explanation:
      'Memory is a long row of numbered bytes. The number of a byte is its **address**. A **pointer** is a variable whose value is such a number - an address of something else.\n\n### The two operators\n\n- `&x` - the **address-of** operator: yields the address of variable x.\n- `*p` - the **dereference** operator: accesses the object at the address stored in p. Reading `*p` fetches the value; assigning `*p = v` writes through the pointer.\n\n```\nint adc = 512;\nint *p = &adc;    /* p holds the address of adc */\n*p = 1023;        /* writes 1023 INTO adc */\n```\n\nThe declaration `int *p` reads "p is a pointer to int" - the type of `*p` is int, so the pointer knows both the address and how to interpret the bytes there. That type knowledge is why `p++` (next lesson) advances by sizeof(int) bytes.\n\n### NULL: the pointer that points nowhere, on purpose\n\nAn uninitialized pointer holds garbage - dereferencing it is undefined behavior with unpredictable consequences. The convention: a pointer that currently has no target holds **NULL** (defined in <stddef.h> and several headers), and every use checks first:\n\n```\nint *p = NULL;\nif (p != NULL) {\n    printf("%d\\n", *p);   /* only when there is a target */\n}\n```\n\nDereferencing NULL is still undefined behavior - but it is a *diagnosable* one: on hosted systems it reliably faults, which turns a silent corruption into a precise crash report. NULL-as-no-target is the single most important pointer convention in C APIs.',
    deepDive:
      '### What a pointer physically is\n\nOn a 32-bit target a pointer is four bytes storing a 32-bit address; on 64-bit hosts, eight bytes. The pointer\'s size depends on the machine\'s address space, not on what it points to - `int *`, `char *` and `double *` are all the same size, differing only in interpretation. This is the fact behind hardware work: firmware declares `uint32_t *const GPIO_OUT = (uint32_t *)0x48000414;` - a constant pointer whose value is a *physical address from the datasheet* - and then `*GPIO_OUT = mask;` writes the hardware register. Every memory-mapped peripheral is exactly this lesson\'s & and * with a datasheet-supplied address. (Course simulations never claim such addresses; on a host, dereferencing an invented address is undefined behavior.)\n\n### Reading declarations out loud\n\nThe spiral rule, simplified: start at the name, read right then left. `int *p` - "p is a pointer to int". `const int *p` - "p is a pointer to a const int" (the pointee is protected). `int *const p` - "p is a const pointer to int" (the pointer itself cannot be reseated). `const int *const p` - neither may change. Practice the out-loud reading now; lesson 3 drills the const matrix, and real codebases assume you can read all four forms at speed.\n\n### Why & and * are inverse operations\n\n`*&x` is x - take the address, then fetch what is stored there. `&*p` is p - follow the pointer, then ask for the address you were at. The duality is worth internalizing because it explains the syntax: in a declaration, `int *p` uses * as a *type marker* ("pointer to int"), while in expressions * is the *operation* "follow". Same symbol, two roles - and the declaration reading ("p is a pointer to int") always disambiguates.',
    examples: [
      {
        title: 'Write through a pointer',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int adc = 512;\n    int *p = &adc;\n\n    printf("adc value: %d\\n", adc);\n    printf("via p    : %d\\n", *p);\n\n    *p = 1023;\n\n    printf("adc value: %d\\n", adc);\n    printf("via p    : %d\\n", *p);\n    return 0;\n}',
        explanation: [
          '`&adc` takes the address of the variable; p stores it. The declaration type `int *` says the pointee is an int.',
          'Reading `*p` follows the address and fetches 512 - the same byte as adc, two names for one object.',
          'The assignment `*p = 1023` writes through the pointer: it modifies adc itself, as the second printout proves.',
          'A pointer to int pointing at adc does not copy the value - it is an alias with an address, which is precisely why pointers enable in-place modification (lesson 3) and hardware access (deep dive).',
          'Output:\n```\nadc value: 512\nvia p    : 512\nadc value: 1023\nvia p    : 1023\n```',
        ],
      },
      {
        title: 'The NULL discipline',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int *p = NULL;          /* no target yet - say so */\n\n    if (p != NULL) {\n        printf("value=%d\\n", *p);   /* would never run */\n    } else {\n        printf("p has no target\\n");\n    }\n\n    int reading = 42;\n    p = &reading;           /* now it has one */\n\n    if (p != NULL) {\n        printf("value=%d\\n", *p);\n    }\n    return 0;\n}',
        explanation: [
          'p starts as NULL: "no target", a defined, testable state instead of garbage.',
          'The first check fails, so the guarded dereference never runs and the else branch reports the state.',
          'After `p = &reading`, the same guard passes and the dereference is safe: value=42.',
          'The pattern - NULL default, check, then use - is the contract behind every pointer API in C.',
          'Output:\n```\np has no target\nvalue=42\n```',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'A pointer pointing at a variable',
        content:
          '   memory (schematic)              variable table\n   ---------------                 ---------------\n   address 1000: [ 512 ]  <- adc    adc  at 1000, value 512\n   address 1004: [ 1000 ] <- p      p    at 1004, value = 1000\n\n   p\'s VALUE is the ADDRESS of adc.\n\n   &adc      -> 1000      (address-of: where is adc?)\n   p         -> 1000      (the pointer itself)\n   *p        -> 512       (dereference: what is at that address?)\n   *p = 1023 -> writes 1023 into the bytes at address 1000',
        caption:
          'The pointer is an ordinary variable whose value happens to be an address. Dereferencing follows it; address-of goes the other way.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Using an uninitialized pointer: `int *p; *p = 5;`.',
        fix:
          'p holds garbage; the write goes to an arbitrary address - undefined behavior that may corrupt anything. Initialize at declaration: either `int *p = &target;` or `int *p = NULL;` plus a check.',
      },
      {
        mistake: 'Declaring two variables with one star: `int* a, b;`.',
        fix:
          'The * binds to the name, not the type: a is a pointer to int, b is a plain int. Declare pointers one per line, star attached to the name: `int *a; int *b;`.',
      },
      {
        mistake: 'Printing an address with %d or assuming a specific address value in output.',
        fix:
          'Addresses use %p with the argument cast to (void *), and the printed value is platform-specific - never assert it. Course examples avoid printing addresses because the claim would not be portable.',
      },
      {
        mistake: 'Dereferencing after the target is gone (a local of another function) or NULL without checking.',
        fix:
          'A pointer is a promise that the target still exists. Keep targets alive as long as pointers do, set pointers back to NULL when the target dies, and test before every dereference.',
      },
    ],
    guidedPractice: {
      title: 'Two pointers, one variable',
      brief:
        'Declare `int sample = 100;`, then two pointers p and q both pointing at it. Print sample, *p and *q. Then `*p = 250;` and print all three again. Then `*q = *q + 50;` and print once more. Predict every line before running.',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int sample = 100;\n    int *p = &sample;\n    int *q = &sample;\n\n    printf("s=%d p=%d q=%d\\n", sample, *p, *q);\n    *p = 250;\n    printf("s=%d p=%d q=%d\\n", sample, *p, *q);\n    *q = *q + 50;\n    printf("s=%d p=%d q=%d\\n", sample, *p, *q);\n    return 0;\n}',
      expectedBehavior:
        'All three names are one object: first line 100/100/100; after *p = 250 every view reads 250; after *q = *q + 50 all read 300. Two pointers aliasing one variable is exactly how firmware shares a register view across driver functions.',
      hints: [
        'p and q both hold the same address - there is one int in memory, not three.',
        'Write through either pointer and both views change.',
        'This aliasing is powerful and dangerous: which is why const (lesson 3) exists.',
      ],
    },
    practiceExercises: [
      {
        title: 'Read declarations out loud',
        brief:
          'Write one sentence describing each declaration: (a) `int *p;` (b) `const int *p;` (c) `int *const p;` (d) `const int *const p;`. Then, for each, state which operation the compiler rejects: writing through p, or reassigning p.',
        expectedBehavior:
          '(a) pointer to int - nothing rejected. (b) pointer to const int - *p = ... rejected; p = ... fine. (c) const pointer to int - p = ... rejected; *p = ... fine. (d) const pointer to const int - both rejected.',
        hints: [
          'Read the declaration from the name outward: what is const, the pointee or the pointer?',
          'The * before the name makes it a pointer; const BEFORE the pointed-to type protects the pointee.',
          'Try compiling each rejection case and read the error text - it names the exact rule.',
        ],
      },
      {
        title: 'Swap through a temporary alias',
        brief:
          'Using only pointer assignments (no extra int variable beyond two int variables a and b holding 10 and 20), exchange the values via a third pointer that temporarily aliases one of them. Print before and after.',
        expectedBehavior:
          'Sequence: `int *tmp = p; p = q; q = tmp;` re-points the pointers - but that swaps the POINTERS, not the values. To swap values you must write through a dereference: `int *tmp = p;` is not enough - the correct value swap is `int t = *p; *p = *q; *q = t;` which needs one int temporary. The lesson: aliasing pointers moves the view; moving values needs a read-write through them.',
        hints: [
          'Pointer reassignment changes where p looks; it never touches the bytes at the old address.',
          'The value transfer must go through dereferences: read *p, write *q.',
          'Module 8 lesson 3 turns this into the reusable swap(int *a, int *b) function.',
        ],
      },
    ],
    assessment: {
      title: 'Pointer basics checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int adc = 512;\n    int *p = &adc;\n    *p = 1023;\n    printf("adc=%d\\n", adc);\n    return 0;\n}',
          options: ['adc=512', 'adc=1023', 'adc=0', 'undefined behavior'],
          answer: 'adc=1023',
          explanation:
            'p holds the address of adc; writing *p = 1023 stores through that address, changing adc itself. The print reads the new value.',
          hint: 'Through which object does the assignment write?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What does the declaration `int *p;` mean?',
          options: [
            'p is an int named with a star',
            'p is a pointer to int',
            'p is the dereference of an int',
            'p is a pointer to a pointer',
          ],
          answer: 'p is a pointer to int',
          explanation:
            'The declaration reads "p is a pointer to int": p stores an address, and *p accesses the int at that address. The type of *p is int.',
          hint: 'The star is part of the TYPE of p, not an operation here.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'Dereferencing a NULL pointer is safe because NULL means "no target".',
          answer: 'false',
          explanation:
            'NULL is a defined, testable no-target value, but dereferencing it is still undefined behavior - it reliably faults on hosted systems, which is what makes the crash diagnosable. The check `p != NULL` exists precisely because you must not dereference it.',
          hint: 'NULL makes the error clean, not the dereference legal.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'After `int* a, b;` the code does `b = &count;` and fails to compile. Explain.',
          answer: 'Only a is a pointer - the star binds to the name a, so b is a plain int and cannot receive an address - fix by declaring separately: int *a; int *b;',
          explanation:
            'The * is part of the declarator (the name), not shared across the list. One pointer per declaration line avoids the trap entirely.',
          hint: 'Which name does the star attach to?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Why do firmware drivers declare hardware registers as pointers such as `volatile uint32_t *const STATUS = (volatile uint32_t *)0x40000000;`? One or two sentences, noting what the const does.',
          answer: 'A memory-mapped register IS an address, so a pointer whose value is the datasheet address lets code read and write the register through *STATUS; the const makes the pointer itself unchangeable (it always refers to that fixed address) while writes through it remain legal',
          explanation:
            'const placement matters: const pointer (write-through allowed, re-pointing forbidden) is exactly the register access pattern. The volatile (module 5) stops the compiler from caching reads.',
          hint: 'Separate the two questions: what is const protecting, and what does dereferencing do?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Address', definition: 'The number of a byte in memory; where a variable lives.' },
      { term: 'Pointer', definition: 'A variable holding an address, typed by what it points to.' },
      { term: 'Dereference', definition: 'The * operator following a pointer to read or write the object at its address.' },
      { term: 'Address-of (&)', definition: 'The operator yielding a variable\'s address; the inverse of dereference.' },
      { term: 'NULL', definition: 'The defined no-target pointer value; every use is preceded by a check.' },
      { term: 'Aliasing', definition: 'Two pointers (or a pointer and a variable) referring to the same object - writes through either are visible to both.' },
    ],
    revisionSummary: [
      'Memory is numbered bytes; a pointer is a variable holding such a number.',
      '& takes an address; * follows one - they are inverses: *&x is x.',
      'The declaration int *p reads "p is a pointer to int"; the star binds to the name.',
      'Writing through *p modifies the pointed-to object - aliasing in action.',
      'Initialize pointers to a real target or NULL, and check before every use.',
      'Hardware registers are accessed exactly this way, with datasheet addresses and volatile.',
    ],
    furtherReading: [
      { label: 'cppreference - pointer declaration', url: 'https://en.cppreference.com/w/c/language/pointer', kind: 'docs' },
      { label: 'Wikipedia - Pointer (computer programming)', url: 'https://en.wikipedia.org/wiki/Pointer_(computer_programming)', kind: 'article' },
      { label: 'Wikipedia - Memory-mapped I/O', url: 'https://en.wikipedia.org/wiki/Memory-mapped_I/O', kind: 'article' },
    ],
    estimatedMinutes: 40,
  },
  {
    id: 'cpg-m08-l2',
    title: 'Pointers, Arrays and Pointer Arithmetic',
    summary:
      'Connect arrays to addresses, prove a[i] equals *(a + i), walk buffers with pointers, and learn exactly when an array stops being an array.',
    objectives: [
      'State and demonstrate the decay rule: an array name becomes a pointer to its first element.',
      'Show that a[i] and *(a + i) are the same access.',
      'Walk an array with a pointer and the one-past-the-end idiom.',
      'Predict pointer arithmetic results, knowing the step is sizeof(pointee).',
    ],
    whyItMatters:
      'Array indexing IS pointer arithmetic - the compiler rewrites a[i] into address math. Firmware code walks buffers, ring buffers and packet payloads with pointers because the idiom is compact and maps onto hardware FIFOs. Understanding decay also explains the classic sizeof-in-a-function bug from module 7.',
    prerequisites: ['cpg-m08-l1', 'cpg-m07-l1'],
    explanation:
      '### Decay: when an array becomes a pointer\n\nIn most expressions, an array name converts to a pointer to its first element. `int a[4]; int *p = a;` is legal - a decayed to &a[0]. The two exceptions to memorize: `sizeof a` (the whole array\'s bytes) and `&a` (pointer to the whole array) - there the array stays an array. Decay explains module 7\'s rule: pass the length alongside, because inside a function the parameter is a pointer and sizeof knows nothing of the original.\n\n### The identity a[i] == *(a + i)\n\nIndexing is defined in terms of pointers: `a[i]` means `*(a + i)` - start at the array\'s base and follow the address i elements further. The addition is in **element units**: `a + 1` advances sizeof(element) bytes (4 for int, 1 for char). This is why pointer arithmetic is type-aware and why a char* view of the same memory moves in single bytes.\n\n### Walking with pointers\n\nThe idiomatic scan uses two pointers: a cursor and an end marker:\n\n```\nint *p    = readings;\nint *end  = readings + 4;      /* one PAST the last element */\nwhile (p < end) {\n    total += *p;\n    p++;\n}\n```\n\nThe end pointer points one past the last element - a legal place to *point at* (the standard guarantees the address is computable) but not to dereference. The `p < end` comparison then reads as "is there anything left?", which is why this form survives refactors that change element counts.',
    deepDive:
      '### Pointer arithmetic\'s legal range\n\nThe standard permits comparing and subtracting pointers **only within the same array object** (plus the one-past-the-end position). p - q gives the element count between them (ptrdiff_t, printed with %td); comparisons order them. Forming a pointer outside the array - and especially dereferencing one - is undefined behavior; hardware does not check. This is the formal backing for the loop idiom above: end = base + n is defined, end - 1 is the last element, dereferencing end is a bug. When you meet code computing pointer differences across different buffers, you are looking at a latent bug, not cleverness.\n\n### Why &arr is not &arr[0]\n\n`arr` decays to &arr[0] (pointer to element, type int*). `&arr` takes the address of the WHOLE array - same numeric address, different type: int(*)[4], a pointer to array-of-4. The difference appears in arithmetic: (int*)&arr + 1 advances 4 bytes (one element); (int(*)[4])&arr + 1 advances 16 bytes (one whole array). Firmware meets this in 2D arrays and in EEPROM page addressing, where the "step one row" pointer is exactly the array-pointer type. For daily work, remember only: &arr[0] steps in elements, &arr steps in arrays.\n\n### The three walks compared\n\nThe same buffer traversal has three spellings, and recognizing all three is a reading skill: index form `for (i = 0; i < n; i++) ... a[i]`; offset form `*(a + i)`; cursor form `while (p < end) ... *p++`. They compile to essentially the same machine code on modern compilers. Choose by readability: index form when the position itself matters; cursor form when scanning to a delimiter; offset form mostly when explaining what the compiler does. Firmware review culture accepts all three but expects the bounds discipline (one-past-the-end, no dereference of end) in every one.',
    examples: [
      {
        title: 'Cursor walk of a buffer',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int readings[4] = {10, 20, 30, 40};\n    int *p = readings;          /* decays to &readings[0] */\n    int *end = readings + 4;    /* one past the last      */\n    int total = 0;\n\n    while (p < end) {\n        total += *p;\n        p++;\n    }\n\n    printf("total = %d\\n", total);\n    printf("readings[2] = %d, *(readings+2) = %d\\n",\n           readings[2], *(readings + 2));\n    return 0;\n}',
        explanation: [
          '`readings` decays to a pointer to element 0; p starts at the base, end sits one past element 3 - a computable, non-dereferenceable address.',
          'Each pass adds *p (the element at the cursor) and advances p by one int (4 bytes). Four passes: 10 + 20 + 30 + 40 = 100.',
          'The second printf proves the identity: readings[2] and *(readings + 2) are the same access - both 30.',
          'Output:\n```\ntotal = 100\nreadings[2] = 30, *(readings+2) = 30\n```',
        ],
      },
      {
        title: 'Pointer steps scale by the pointee size',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdint.h>\n\nint main(void) {\n    uint8_t  bytes[4] = {0x11, 0x22, 0x33, 0x44};\n    uint32_t words[2] = {0xAABBCCDDu, 0x11223344u};\n\n    uint8_t  *pb = bytes;\n    uint32_t *pw = words;\n\n    pb++;   /* advances ONE byte  */\n    pw++;   /* advances FOUR bytes */\n\n    printf("after pb++: 0x%02X\\n", (unsigned)*pb);\n    printf("after pw++: 0x%08X\\n", (unsigned)*pw);\n    return 0;\n}',
        explanation: [
          'Both pointers incremented with the same ++, but the compiler scales by sizeof(pointee): 1 for uint8_t, 4 for uint32_t.',
          'pb now points at bytes[1] (0x22); pw now points at words[1] (0x11223344). The type drives the step - pointer arithmetic is element-wise, never byte-wise.',
          'This is why a char* walk over the same memory inspects every byte: cast the base to uint8_t * and the step becomes 1 - the standard memory-inspection idiom.',
          'Output:\n```\nafter pb++: 0x22\nafter pw++: 0x11223344\n```',
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dereferencing the one-past-the-end pointer: `*end` after `end = a + n;`.',
        fix:
          'The address may be computed and compared but never dereferenced - there is no element there. The idiom works because the loop test `p < end` happens before the body.',
      },
      {
        mistake: 'Using sizeof(arr) inside a function to find the element count.',
        fix:
          'The parameter is a pointer after decay; sizeof gives 8 (pointer size on 64-bit). Pass the count as a separate parameter - the universal C convention.',
      },
      {
        mistake: 'Assuming p++ advances one byte regardless of type.',
        fix:
          'It advances one ELEMENT: sizeof(pointee) bytes. A uint32_t* steps 4; stepping bytes requires a uint8_t* (or char*) view.',
      },
      {
        mistake: 'Comparing pointers into different arrays (p from one buffer, q from another).',
        fix:
          'Pointer comparison and subtraction are defined only within the same array (plus one past its end). Cross-array comparisons are undefined - restructure to index arithmetic on lengths instead.',
      },
    ],
    guidedPractice: {
      title: 'Find with a cursor',
      brief:
        'Walk `int data[6] = {31, 30, 0, 29, 30, 28};` with a cursor pointer and an end pointer, finding the address-position of the first zero. Report its INDEX by subtracting the base pointer from the cursor. Print the index, and predict it before running (module 5 found index 2 with a for loop).',
      starterCode:
          '#include <stdio.h>\n\nint main(void) {\n    int data[6] = {31, 30, 0, 29, 30, 28};\n    int *p = data;\n    int *end = data + 6;\n    int *base = data;\n    int found_index = -1;\n\n    while (p < end) {\n        if (*p == 0) {\n            found_index = (int)(p - base);\n            break;\n        }\n        p++;\n    }\n\n    printf("found_index=%d\\n", found_index);\n    return 0;\n}',
      expectedBehavior:
        'The cursor meets 0 at the third element; p - base is 2 (pointer subtraction yields the element count between them). Output: `found_index=2`. The cast to int is for printing - the native type of the difference is ptrdiff_t.',
      hints: [
        'The while test runs before the dereference - end is never followed.',
        'Pointer subtraction already divides by the element size: p - base counts ELEMENTS.',
        'The break leaves p pointing at the found element - that is how the index is recovered.',
      ],
    },
    practiceExercises: [
      {
        title: 'Reverse walk with pointers',
        brief:
          'Walk `int a[5] = {1, 2, 3, 4, 5};` backwards using only pointers (start at a + 4, continue while p >= a) printing each value, then state why this walk has no one-past-the-end problem.',
        expectedBehavior:
          'Prints 5 4 3 2 1. The start pointer a + 4 is the LAST element (not one past) and the loop can legitimately reach a itself - the walk stays inside the array at every dereference, so no end-idiom subtlety arises.',
        hints: [
          'Backwards walks start at the last element, which is a + n - 1.',
          'The comparison p >= a keeps the cursor inside; dereferencing happens only within bounds.',
          'The one-past-the-end rule matters for forward walks; this direction starts inside.',
        ],
      },
      {
        title: 'Byte view of a uint32_t',
        brief:
          'Given `uint32_t value = 0x11223344u;`, cast its address to `uint8_t *` and print all four bytes in order (indexes 0..3). Note which byte lands at index 0 on your machine and name the endianness it demonstrates (little-endian: 44 first).',
        expectedBehavior:
          'On a little-endian machine (x86, most ARM): index 0 = 0x44, 1 = 0x33, 2 = 0x22, 3 = 0x11 - the least significant byte sits at the lowest address. On big-endian targets the order reverses. The uint8_t* view is the standard way memory inspectors and dump routines read any object.',
        hints: [
          'Cast: `uint8_t *pb = (uint8_t *)&value;` - the object stays, the interpretation changes.',
          'Endianness decides byte ORDER in memory; the value itself is unchanged.',
          'Print each byte with %02X and a (unsigned) cast.',
        ],
      },
    ],
    assessment: {
      title: 'Pointers and arrays checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nint main(void) {\n    int a[4] = {10, 20, 30, 40};\n    int *p = a;\n    p++;\n    printf("%d\\n", *p);\n    return 0;\n}',
          options: ['10', '20', '11', '40'],
          answer: '20',
          explanation:
            'p starts at element 0; p++ advances one ELEMENT (one int, 4 bytes) to element 1. *p reads 20.',
          hint: 'Pointer arithmetic steps in elements, not bytes.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'Which expression does NOT make the array decay to a pointer?',
          options: ['a[2]', 'a + 1', 'sizeof(a)', 'passing a to a function'],
          answer: 'sizeof(a)',
          explanation:
            'sizeof and &a are the two contexts where the array stays an array: sizeof yields the whole byte size (not pointer size), &a yields a pointer to the whole array type.',
          hint: 'One operator needs the true array size to answer.',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After `int a[4]; int *end = a + 4;`, dereferencing *end is legal.',
          answer: 'false',
          explanation:
            'end points one past the last element: the address is well-defined and comparable, but there is no element there, so *end is undefined behavior. The idiom uses end only in comparisons.',
          hint: 'Computable address, nonexistent element.',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'A function declares `void walk(char buf[])` and computes `int n = sizeof(buf) / sizeof(buf[0]);` to bound its loop. Called with a 32-byte buffer on a 64-bit host, the loop touches far less data. Explain and fix.',
          answer: 'buf decays to a pointer inside the function, so sizeof(buf) is 8 and the computed n is 8 (8 / 1 for char) - the fix is passing the real length as a parameter and using it for the bound',
          explanation:
            'Decay strips the array length; sizeof inside the function sees a pointer. Every array-taking C function carries its length explicitly.',
          hint: 'What is the type of the parameter inside the function?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Given `p` pointing at a[3] of an int array, what is the value and meaning of p - a, and what type does that difference have?',
          answer: 'It is 3 - the number of ELEMENTS between the two pointers (the compiler divides the byte difference by sizeof(int)); the type is ptrdiff_t, a signed integer type',
          explanation:
            'Pointer subtraction is element-wise by definition, which is why it converts cleanly to an index. Cross-array subtraction would be undefined - the guarantee holds only within one array.',
          hint: 'The compiler scales the subtraction - by what?',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Decay', definition: 'The automatic conversion of an array name to a pointer to its first element - except under sizeof and &.' },
      { term: 'Pointer arithmetic', definition: 'Adding/subtracting integers to pointers in ELEMENT units: p + 1 advances sizeof(pointee) bytes.' },
      { term: 'One past the end', definition: 'The address just past the last element - computable and comparable, never dereferenceable.' },
      { term: 'ptrdiff_t', definition: 'The signed type of a pointer difference (p - q), in elements.' },
      { term: 'Cursor idiom', definition: 'Walking with p and end pointers: while (p < end) { use *p; p++; }.' },
      { term: 'Byte view', definition: 'Casting an object\'s address to uint8_t* to inspect its bytes individually - steps of one.' },
    ],
    revisionSummary: [
      'Arrays decay to &arr[0] in most expressions; sizeof(a) and &a keep the array identity.',
      'a[i] is defined as *(a + i); pointer addition is element-wise.',
      'The walk idiom: cursor and one-past-the-end end pointer, tested before every dereference.',
      'Pointer subtraction yields the element count (ptrdiff_t) within a single array.',
      'p++ advances sizeof(pointee) bytes - char* for byte views, wider types for element views.',
      'Cross-array pointer comparison is undefined; bounds live in lengths passed alongside.',
    ],
    furtherReading: [
      { label: 'cppreference - pointer arithmetic', url: 'https://en.cppreference.com/w/c/language/operator_arithmetic', kind: 'docs' },
      { label: 'cppreference - array decay', url: 'https://en.cppreference.com/w/c/language/array', kind: 'docs' },
      { label: 'Wikipedia - Pointer arithmetic', url: 'https://en.wikipedia.org/wiki/Pointer_(computer_programming)#C_arrays', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m08-l3',
    title: 'Pointers as Parameters (and const)',
    summary:
      'Give functions real output channels - swap, min/max through pointer parameters - and master the four const-pointer spellings that document who may change what.',
    objectives: [
      'Pass addresses so a function can modify caller variables (output parameters).',
      'Write and use functions with multiple outputs (find_min_max).',
      'Distinguish pointer-to-const, const-pointer and both, and read each declaration aloud.',
      'Choose between returning a value and an output parameter by interface logic.',
    ],
    whyItMatters:
      'C functions return one value - but drivers need many: a read function returns the data AND an error code; a parser returns the value AND the end position. Output parameters are the mechanism, and const is the annotation that makes interfaces self-documenting: every `const` in a prototype is a promise the compiler enforces.',
    prerequisites: ['cpg-m08-l1', 'cpg-m06-l1'],
    explanation:
      '### Output parameters: pass the address\n\nPass-by-value copies arguments; passing an **address** copies the address - and dereferencing it reaches the original. A function that must modify the caller\'s variable takes a pointer:\n\n```\nvoid swap(int *a, int *b) {\n    int t = *a;\n    *a = *b;\n    *b = t;\n}\n/* call: */ swap(&x, &y);\n```\n\nThe convention divides parameters into **inputs** (plain values or pointers the function only reads) and **outputs** (pointers the function writes results into). Callers show the direction at the call site: `&lo` visibly says "this variable receives something".\n\n### Multiple outputs\n\nA function that must report two results takes two output pointers:\n\n```\nvoid find_min_max(const int *data, int n, int *min_out, int *max_out);\n```\n\nNote the `const int *data` - the input array is promised read-only (writing through it is a compile error), while the two outputs are non-const because writing is their job. Reading the prototype tells the whole story: one input (protected), two outputs (written).\n\n### The four const spellings\n\n- `const int *p` (or `int const *p`) - pointer to const: the POINT cannot change through p; p may be reseated. The read-only handle.\n- `int *const p` - const pointer: p always points at the same object; the object may change through p. The fixed connection (hardware register style).\n- `const int *const p` - neither may change. The fully frozen view.\n- `int *p` - both possible. The default, used only when writing is intended.',
    deepDive:
      '### Designing the interface: return value or output parameter?\n\nRules that scale: the *primary* result returns (it flows through expressions and reads naturally); *status/error codes* return (0 for success is the C convention); *additional results* go through output parameters, always with the _out suffix and always checked for NULL when the function is an API. A function returning an error AND a value does both: `int parse(const char *s, int *value_out)` - returns 0/-1 status, writes the parsed number through value_out. Callers see the contract in the signature: return decides whether to trust, the output carries the payload. This pattern is the backbone of POSIX and every embedded SDK you will meet.\n\n### const as documentation the compiler checks\n\nEvery const in a prototype is a machine-enforced comment. `const int *data` tells reviewers the function cannot sort, overwrite or otherwise damage the input - and any accidental write fails compilation instead of surviving to runtime. The discipline costs nothing and pays on every refactor: change the function body, and the compiler re-verifies the promise. The mirrored rule: never lie - taking a `const` parameter and casting it away to write is undefined behavior, not cleverness. (The one-place-cast exception is calling legacy APIs that lack const; the write still must not happen.)\n\n### Output parameters and NULL\n\nAn output parameter is a pointer like any other: an API-quality function that writes through one must check it first. The defensive form:\n\n```\nif (min_out != NULL) { *min_out = lo; }\n```\n\n- useful when the caller legitimately wants only one of two outputs (pass NULL for the other). Internal helpers may skip the check when the contract guarantees valid pointers - but then the contract must be documented. The general firmware rule: a pointer parameter that is dereferenced is either NULL-checked or provably non-NULL by construction; nothing in between.',
    examples: [
      {
        title: 'swap and find_min_max: the output-parameter toolkit',
        language: 'c',
        code:
          '#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int t = *a;\n    *a = *b;\n    *b = t;\n}\n\nvoid find_min_max(const int *data, int n, int *min_out, int *max_out) {\n    *min_out = data[0];\n    *max_out = data[0];\n    for (int i = 1; i < n; i++) {\n        if (data[i] < *min_out) {\n            *min_out = data[i];\n        }\n        if (data[i] > *max_out) {\n            *max_out = data[i];\n        }\n    }\n}\n\nint main(void) {\n    int x = 10;\n    int y = 20;\n    swap(&x, &y);\n    printf("x=%d y=%d\\n", x, y);\n\n    int samples[5] = {42, 7, 99, 15, 63};\n    int lo = 0;\n    int hi = 0;\n    find_min_max(samples, 5, &lo, &hi);\n    printf("min=%d max=%d\\n", lo, hi);\n    return 0;\n}',
        explanation: [
          'swap receives ADDRESSES: *a and *b are the caller\'s x and y, so the exchange through the dereferences survives the return.',
          'find_min_max shows all three parameter roles in one signature: a protected input (const int *data), a length, and two outputs written through dereferences.',
          'The caller hands &lo and &hi - the ampersands mark the variables that receive results, visible at the call site.',
          'Output:\n```\nx=20 y=10\nmin=7 max=99\n```',
        ],
      },
      {
        title: 'The four const spellings, compiled and tested',
        language: 'c',
        code:
          '#include <stdio.h>\n\nint main(void) {\n    int a = 1;\n    int b = 2;\n\n    /* 1. pointer to const: pointee protected */\n    const int *p1 = &a;\n    p1 = &b;              /* reseating is fine        */\n    printf("*p1=%d\\n", *p1);\n    /* *p1 = 5;            <- compile error: read-only */\n\n    /* 2. const pointer: reseating protected */\n    int *const p2 = &a;\n    *p2 = 7;              /* writing is fine          */\n    printf("a=%d\\n", a);\n    /* p2 = &b;            <- compile error: fixed    */\n\n    /* 3. both const */\n    const int *const p3 = &b;\n    printf("*p3=%d\\n", *p3);\n    /* neither *p3 = ... nor p3 = ... compiles */\n\n    return 0;\n}',
        explanation: [
          'p1 may move (p1 = &b is legal) but may not write; the commented *p1 = 5 would be a "read-only variable" error.',
          'p2 is welded to a (p2 = &b is the illegal line) but the pointee is writable: a becomes 7.',
          'p3 freezes both directions - the fully read-only, fixed view.',
          'Read each declaration aloud: const BEFORE the pointee type protects the pointee; const AFTER the star protects the pointer.',
          'Output:\n```\n*p1=2\na=7\n*p3=2\n```',
        ],
      },
    ],
    tables: [
      {
        caption: 'The four const-pointer spellings',
        headers: ['Declaration', 'Reads as', 'Write *p?', 'Reassign p?'],
        rows: [
          ['int *p', 'pointer to int', 'yes', 'yes'],
          ['const int *p', 'pointer to const int', 'no', 'yes'],
          ['int *const p', 'const pointer to int', 'yes', 'no'],
          ['const int *const p', 'const pointer to const int', 'no', 'no'],
        ],
      },
    ],
    commonMistakes: [
      {
        mistake: 'Passing the value where the address is needed: `swap(x, y)` on an int-taking-swap signature.',
        fix:
          'The compiler rejects it (int into int*) - a helpful error. The call must hand addresses: swap(&x, &y). Read the prototype as the call recipe.',
      },
      {
        mistake: 'Dereferencing an output parameter without a NULL check in an API function.',
        fix:
          'APIs check: `if (out != NULL) { *out = value; }` or document loudly that NULL is forbidden. The lesson-1 rule applies inside functions too.',
      },
      {
        mistake: 'Writing through a pointer-to-const by casting: `*(int *)p = 5;` on a const int *p.',
        fix:
          'Casting away const to write an object defined const is undefined behavior - the compiler may have placed it in read-only memory. If the function must write, take a non-const parameter; const is a contract, not an obstacle.',
      },
      {
        mistake: 'Returning a pointer to a local variable: `int *f(void) { int x = 5; return &x; }`.',
        fix:
          'The local dies when the function returns; the pointer dangles (next lesson dissects it). Return by value, write through an output parameter, or use static/heap storage deliberately.',
      },
    ],
    guidedPractice: {
      title: 'A function with a status return and a value output',
      brief:
        'Write `int divide(int a, int b, int *result_out)` that returns 0 on success (writing a / b through result_out) and -1 on a zero divisor (leaving result_out untouched). Call it three times from main: (12, 4), (7, 0) and (9, 2), printing the returned status and, when successful, the result. Predict all output lines.',
      starterCode:
          '#include <stdio.h>\n\nint divide(int a, int b, int *result_out) {\n    if (b == 0) {\n        return -1;\n    }\n    *result_out = a / b;\n    return 0;\n}\n\nint main(void) {\n    int q = 0;\n    int status;\n\n    status = divide(12, 4, &q);\n    printf("s1=%d q=%d\\n", status, q);\n\n    status = divide(7, 0, &q);\n    printf("s2=%d q=%d\\n", status, q);\n\n    status = divide(9, 2, &q);\n    printf("s3=%d q=%d\\n", status, q);\n    return 0;\n}',
      expectedBehavior:
        'Call 1: success, q = 3 -> s1=0 q=3. Call 2: zero divisor, returns -1 and q keeps its previous value 3 -> s2=-1 q=3 (documenting that untouched outputs retain old values is the point of the trace). Call 3: success, q = 4 (9 / 2 truncates) -> s3=0 q=4.',
      hints: [
        'The status decides whether the caller may trust q - that is the return-plus-output pattern.',
        'On the error path the function writes nothing, so q holds whatever it had before.',
        '9 / 2 is integer division: 4.',
      ],
    },
    practiceExercises: [
      {
        title: 'Min and max positions, not values',
        brief:
          'Write `void find_extremes(const int *data, int n, int *min_pos, int *max_pos)` that outputs the INDICES of the smallest and largest elements. Test on {42, 7, 99, 7, 63} - expect min_pos=1, max_pos=2 (first occurrence wins on ties).',
        expectedBehavior:
          'Scan comparing values but storing indices: on a strict < for min and strict > for max, ties keep the earlier index. Output: min_pos=1 (value 7 first at index 1), max_pos=2 (99).',
        hints: [
          'Track positions; read values through data[i] and data[*min_pos] style comparisons.',
          'Strict comparisons give first-occurrence semantics - document that in a comment.',
          'Return positions, not values: the caller can then look up either.',
        ],
      },
      {
        title: 'Const-ify an existing interface',
        brief:
          'Start from `void print_all(int *data, int n)` that only reads. Add const in the right place, then try (in comments) what the compiler would now reject: data[0] = 0. State the rule for when a pointer parameter should be const.',
        expectedBehavior:
          'The signature becomes `void print_all(const int *data, int n)`. The commented write is now a compile error (assignment of read-only location). Rule: any pointer parameter the function only reads is const - the annotation is free documentation the compiler enforces.',
        hints: [
          'const goes before the pointee type: const int *data.',
          'Try the write for real (then remove it) and read the error message.',
          'Every prototype in your future code gets this audit - inputs const, outputs non-const.',
        ],
      },
    ],
    assessment: {
      title: 'Output parameters and const checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print?',
          code: '#include <stdio.h>\n\nvoid swap(int *a, int *b) {\n    int t = *a;\n    *a = *b;\n    *b = t;\n}\n\nint main(void) {\n    int x = 10;\n    int y = 20;\n    swap(&x, &y);\n    printf("x=%d y=%d\\n", x, y);\n    return 0;\n}',
          options: ['x=10 y=20', 'x=20 y=10', 'x=20 y=20', 'x=10 y=10'],
          answer: 'x=20 y=10',
          explanation:
            'The function receives addresses, so *a and *b are x and y themselves; the three-step exchange through the dereferences changes the caller\'s variables.',
          hint: 'Which objects do the dereferences reach?',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'In `void f(const int *data, int *out)`, which operation may f legally perform?',
          options: [
            'Write data[0] = 1 and write *out = 2',
            'Read data[0] and write *out',
            'Read data[0] and read *out only',
            'Reassign data to point elsewhere is forbidden',
          ],
          answer: 'Read data[0] and write *out',
          explanation:
            'data is a pointer to const - readable, not writable. out has no const - writable (that is its job). Reassigning data (pointing it elsewhere) is also legal; only writing THROUGH it is forbidden.',
          hint: 'Where does each const sit relative to the pointee?',
          difficulty: 'medium',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'In `int *const p = &a;`, the pointer p can be reseated to point at b later.',
          answer: 'false',
          explanation:
            'const after the star protects the POINTER: p is welded to a for its whole life. Writing through p (*p = ...) remains legal - that is the fixed-connection spelling used for hardware register views.',
          hint: 'Which half of the declaration does this const guard?',
          difficulty: 'easy',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This function compiles but the caller sees garbage. Find the defect.\n\n```\nvoid get_reading(int value_out) {\n    value_out = 42;\n}\n/* caller: */\nint r = 0;\nget_reading(r);\n```',
          answer: 'value_out is a plain int - pass-by-value copies r into it, so the assignment dies with the copy - fix by taking int *value_out and calling get_reading(&r), writing *value_out = 42',
          explanation:
            'Output channels require addresses. The int parameter is a copy; only a pointer parameter reaches back to the caller\'s variable.',
          hint: 'Which type does an output parameter need?',
          difficulty: 'easy',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'State the two roles in the pattern `int parse(const char *s, int *value_out)` and why each role chose its return/pass mechanism.',
          answer: 'The return carries the STATUS (success/failure) because C conventions use 0 for success and callers branch on it; value_out is an output parameter carrying the parsed VALUE because a function returns only one value and the secondary result travels through a pointer',
          explanation:
            'Status by return, payload by output: the caller checks the status before trusting the output, and the signature documents the entire contract.',
          hint: 'One value returns; the other needs a channel back.',
          difficulty: 'medium',
        },
      ],
    },
    keyTerms: [
      { term: 'Output parameter', definition: 'A pointer parameter a function writes results into, marked _out by convention.' },
      { term: 'Input parameter', definition: 'Data a function only reads - values, or pointers qualified const.' },
      { term: 'Pointer to const', definition: 'const int *p - the pointee cannot change through p; p may be reseated.' },
      { term: 'Const pointer', definition: 'int *const p - the pointer cannot be reseated; the pointee can change through it.' },
      { term: 'Status return', definition: 'The C convention of returning 0 on success and nonzero error codes, with results in output parameters.' },
      { term: 'Dangling pointer', definition: 'A pointer to storage whose lifetime has ended - the subject of the next lesson.' },
    ],
    revisionSummary: [
      'Functions reach caller variables only through addresses: swap(&x, &y) with int * parameters.',
      'Signature grammar: const int *data (protected input), int *out (writable output) - the prototype is the contract.',
      'The four const spellings differ in which of pointer/pointee is protected; read them aloud.',
      'Status returns 0/nonzero; payloads travel through _out parameters checked against NULL in APIs.',
      'Never cast away const to write - objects defined const may live in read-only memory.',
      'Never return pointers to locals - the frame dies at return.',
    ],
    furtherReading: [
      { label: 'cppreference - const qualification', url: 'https://en.cppreference.com/w/c/language/const', kind: 'docs' },
      { label: 'Wikipedia - Const-correctness', url: 'https://en.wikipedia.org/wiki/Const-correctness', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
  {
    id: 'cpg-m08-l4',
    title: 'Stack, Heap and the Classic Pointer Bugs',
    summary:
      'Map automatic and dynamic memory, use malloc/free with the NULL check and the reset-to-NULL habit, and learn to recognize dangling pointers, leaks and double frees on sight.',
    objectives: [
      'Explain the stack (automatic, fast, per-call) versus the heap (requested, explicit lifetime).',
      'Use malloc/free correctly: check for NULL, size with sizeof, free exactly once.',
      'Define and recognize memory leaks, dangling pointers and double frees.',
      'Argue when embedded firmware prefers static allocation over malloc.',
    ],
    whyItMatters:
      'Every crash report in a C program eventually points here: use-after-free, leak, or wild pointer. Firmware doubles the stakes - heaps fragment over months of runtime, and an MCU with 64 KB of RAM cannot survive a leaky loop. Even firmware that never calls malloc must understand the stack, because stack overflow on small targets corrupts memory silently.',
    prerequisites: ['cpg-m08-l3', 'cpg-m06-l2'],
    explanation:
      '### Three kinds of storage\n\n- **Static** storage: globals and static locals - one copy, alive for the whole run, sized at compile time.\n- **The stack**: automatic locals and call frames - created on entry, destroyed at exit, extremely fast, but limited (kilobytes on MCUs) and dying with its function.\n- **The heap**: memory you request with `malloc(n)` and release with `free(p)` - lifetime chosen by you, at the cost of explicit management.\n\n### malloc and free, correctly\n\n```\nint *samples = malloc((size_t)n * sizeof(int));\nif (samples == NULL) {\n    /* allocation failed - handle it, never dereference */\n}\n/* ... use samples[0..n-1] ... */\nfree(samples);\nsamples = NULL;\n```\n\nFour rules carry the whole practice: (1) size in bytes with `n * sizeof(type)`; (2) **check the return against NULL** - allocation can fail, and the check is the only guard; (3) free exactly once, when the lifetime ends; (4) set the pointer to NULL afterwards so no stale copy can be used or freed again.\n\n### The three classic bugs\n\n- **Memory leak**: losing the last pointer to allocated memory without freeing - the block stays reserved forever. Leaks in loops accumulate until the system starves.\n- **Dangling pointer**: a pointer to memory that was freed (or to a dead local) - dereferencing it is undefined behavior reading whatever lives there now.\n- **Double free**: freeing the same block twice corrupts the allocator\'s bookkeeping - often a delayed, mysterious crash. The NULL-after-free rule prevents it mechanically.',
    deepDive:
      '### Why embedded firmware often bans malloc\n\nThe heap\'s costs are unpredictability: allocation time varies, and repeated allocate/free cycles of different sizes **fragment** free memory until a request fails despite enough total bytes. A device that must run for a year cannot afford a slow leak or growing fragmentation; safety standards (and MISRA-influenced style guides) therefore prefer **static allocation**: every buffer sized at compile time, every lifetime obvious, zero allocator state. The pattern that replaces malloc: size the worst case into a static or stack array, and refuse (with an error) inputs that exceed it. Dynamic allocation survives in embedded systems at *initialization time only* - allocate once during startup, never free, never allocate again - which sidesteps fragmentation entirely. Knowing when NOT to call malloc is a senior skill this course starts early.\n\n### Stack budget: the other overflow\n\nThe stack has a fixed size (a few kilobytes on small MCUs, set by a linker file - module 10). Every call frame consumes it; deep call chains or large local arrays can exhaust it. Stack overflow on a desktop raises an exception; on bare metal it silently writes into other memory - the worst kind of bug. The practices: avoid huge locals (a 4 KB local array on a 2 KB stack is a design error - make it static), watch recursion depth (module 6), and check the linker map\'s stack assignment during bring-up. Host development hides all of this - which is exactly why you should know it before the first target.\n\n### Valgrind and the sanitizer safety net\n\nOn the host, two tools catch the classic bugs automatically and are worth knowing by name. **Valgrind** (Linux) runs the program in a simulated memory and reports every leak, use-after-free and out-of-bounds access with a stack trace. **Sanitizers** are compiler modes: compile with `gcc -fsanitize=address,undefined` and the binary itself checks each access, aborting with a report on the first violation. Neither runs on a small MCU, but both make host-side course exercises (including this one) close to self-reviewing: run your pointer exercises under a sanitizer and read every report. The embedded course extends the idea with MPU-guarded regions on capable targets.',
    examples: [
      {
        title: 'A correct malloc/free cycle',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int n = 4;\n    int *samples = malloc((size_t)n * sizeof(int));\n\n    if (samples == NULL) {\n        printf("allocation failed\\n");\n        return 1;\n    }\n\n    for (int i = 0; i < n; i++) {\n        samples[i] = (i + 1) * 100;\n    }\n\n    int total = 0;\n    for (int i = 0; i < n; i++) {\n        total += samples[i];\n    }\n    printf("total = %d\\n", total);\n\n    free(samples);\n    samples = NULL;     /* no stale pointer can be reused */\n    return 0;\n}',
        explanation: [
          'malloc requests 4 * sizeof(int) = 16 bytes; the (size_t) cast makes the multiplication unsigned-safe for the size computation.',
          'The NULL check handles the (rare on hosts, real on MCUs) allocation failure - dereferencing a failed malloc is the bug the check prevents.',
          'The block behaves exactly like an array: samples[i] indexes it (module 7 decay applies to pointers as well). Total: 100 + 200 + 300 + 400 = 1000.',
          'free returns the block; the NULL assignment closes the door on reuse-after-free and double-free.',
          'Output: `total = 1000`',
        ],
      },
      {
        title: 'Bug gallery: three ways to corrupt (read, do not run the broken forms)',
        language: 'c',
        code:
          '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    /* BUG 1: dangling pointer - the target is freed.  */\n    int *p = malloc(sizeof(int));\n    if (p == NULL) {\n        return 1;\n    }\n    *p = 42;\n    free(p);\n    /* *p = 7;   <- USE AFTER FREE: undefined behavior.\n       May print 42, garbage, or crash - the standard\n       promises nothing. Correct: set p = NULL above.  */\n    p = NULL;\n\n    /* BUG 2: double free - if p were freed twice, the\n       allocator\'s internal lists corrupt; the crash\n       surfaces LATER, in unrelated code.               */\n\n    /* BUG 3: leak - losing the only pointer.          */\n    int *leak = malloc(sizeof(int) * 100);\n    if (leak == NULL) {\n        return 1;\n    }\n    /* If this function returned here, the 400 bytes\n       would stay reserved until the process exits:\n       nobody holds a pointer, so nobody can free.     */\n    free(leak);\n    leak = NULL;\n\n    printf("bug gallery done\\n");\n    return 0;\n}',
        explanation: [
          'Bug 1 is annotated, not executed: after free, p still holds the old address (a dangling pointer); the commented write would be undefined behavior - possibly harmless-looking, possibly corrupting new allocations that reuse the block.',
          'The fix shown - p = NULL immediately after free - makes any later use fail loudly instead of silently.',
          'Bug 2 (double free) corrupts allocator metadata; the crash typically appears far from the cause, which is why the rule "free exactly once, then NULL" is mechanical.',
          'Bug 3 (leak) is shown as a returned-too-early scenario: without free, the block is unreachable. In a loop, leaks accumulate; on an MCU, they are fatal.',
          'Output: `bug gallery done`',
        ],
      },
    ],
    diagrams: [
      {
        kind: 'ascii',
        title: 'A typical process memory map',
        content:
          '  high addresses\n  +------------------+\n  |  stack           |  grows downward\n  |    locals,       |  per-call frames; limited size\n  |    call frames   |  (KBs on MCUs - overflow is silent)\n  |        |         |\n  |        v         |\n  |   ~ free gap ~   |\n  |        ^         |\n  |        |         |\n  |  heap            |  grows upward\n  |    malloc blocks |  explicit lifetime (you free)\n  +------------------+\n  |  .bss  zeros     |  uninitialized globals\n  |  .data globals   |  initialized globals\n  |  .text code      |  (often in flash on MCUs)\n  +------------------+\n  low addresses',
        caption:
          'Stack frames come and go automatically; heap blocks live until freed. Static data (.data/.bss) is fixed at build time - the regions firmware maps onto RAM and flash.',
      },
    ],
    commonMistakes: [
      {
        mistake: 'Dereferencing malloc\'s result without the NULL check.',
        fix:
          'malloc returns NULL on failure; writing through it corrupts address zero region or crashes obscurely. Check immediately: `if (p == NULL) { handle; }`.',
      },
      {
        mistake: 'Freeing and continuing to use the pointer (use-after-free), or freeing it twice.',
        fix:
          'After free, set the pointer to NULL in the same statement block; a freed pointer must never be read, written or freed again. The NULL assignment makes accidental reuse a testable condition instead of silent corruption.',
      },
      {
        mistake: 'Losing the only pointer (leak): reassigning p before freeing the old block.',
        fix:
          'Every malloc must pair with exactly one free on every path. Before reassigning or returning, free what you hold - or store the pointer where the owner will free it. Run host code under valgrind/ASan to verify.',
      },
      {
        mistake: 'Computing the allocation size as `malloc(n * 4)` for ints.',
        fix:
          'Hard-coded widths break when the type changes. Write `malloc(n * sizeof *p)` (or sizeof(int)) - the size then follows the type automatically, and mismatches become compiler-visible.',
      },
    ],
    guidedPractice: {
      title: 'Grow a buffer safely across iterations',
      brief:
        'Simulate three measurement rounds: for each round allocate a 3-int block, fill it with round*10 + (i+1), sum it, print the sum, and free it before the next allocation. Verify no block leaks between rounds. Predict the three printed sums.',
      starterCode:
          '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    const int ROUNDS = 3;\n    const int PER_ROUND = 3;\n\n    for (int round = 1; round <= ROUNDS; round++) {\n        int *block = malloc((size_t)PER_ROUND * sizeof(int));\n        if (block == NULL) {\n            printf("allocation failed\\n");\n            return 1;\n        }\n\n        int total = 0;\n        for (int i = 0; i < PER_ROUND; i++) {\n            block[i] = round * 10 + (i + 1);\n            total += block[i];\n        }\n        printf("round %d total=%d\\n", round, total);\n\n        free(block);\n        block = NULL;\n    }\n    return 0;\n}',
      expectedBehavior:
        'Round 1 values 11, 12, 13 -> total 36. Round 2: 21, 22, 23 -> 66. Round 3: 31, 32, 33 -> 96. Each round allocates fresh, frees before the next malloc, and NULLs the pointer - a leak-free cycle you can verify with valgrind or -fsanitize=address on a host.',
      hints: [
        'Allocate, use, free - one full cycle per round; the pointer variable is reused only after being reset.',
        'Fill formula: round*10 + (i+1) gives 11..13, then 21..23, then 31..33.',
        'On a Linux host, `gcc -fsanitize=address ex.c && ./a.out` should report zero leaks.',
      ],
    },
    practiceExercises: [
      {
        title: 'Spot the leak in a review',
        brief:
          'Review this fragment and name every defect:\n\n```\nchar *buf = malloc(64);\nif (len > 64) {\n    buf = malloc(len);\n}\nstrcpy(buf, src);\nfree(buf);\n```',
        expectedBehavior:
          'Three defects: (1) if len > 64, the first 64-byte block is overwritten by the second pointer - leaked forever. (2) the size check uses 64 hard-coded instead of sizeof / the allocation size, and strcpy is unbounded. (3) if either malloc returns NULL, strcpy dereferences NULL. Correct version: check both allocations, use snprintf with an explicit size, free before reassigning.',
        hints: [
          'Reassigning a pointer without freeing the old target is the leak signature.',
          'Which API from module 7 replaces strcpy here?',
          'Both malloc calls can fail - how many NULL checks does the fragment have?',
        ],
      },
      {
        title: 'Static alternative',
        brief:
          'Rewrite the guided-practice program without malloc: a single static buffer reused each round. Compare the two versions in comments: which has a fixed memory cost? Which could fail at runtime? Which suits an MCU with 8 KB of RAM?',
        expectedBehavior:
          'The static version declares `static int block[3];` (or just a local array) and reuses it across rounds - identical printed sums (36, 66, 96). Comments should conclude: static allocation has fixed, provable cost and cannot fail at runtime; dynamic allocation trades that for flexibility. For 8 KB MCU with known worst case, static wins.',
        hints: [
          'The lifetime here is per-round - a local array re-initialized each iteration does the same job.',
          'Dynamic allocation earns its cost only when the size is genuinely unknowable at build time.',
          'Both versions must print the same sums - behavior parity is the check.',
        ],
      },
    ],
    assessment: {
      title: 'Stack, heap and pointer bugs checkpoint',
      passScore: 75,
      questions: [
        {
          id: 'q1',
          kind: 'output-prediction',
          prompt: 'What does this program print (assuming allocation succeeds)?',
          code: '#include <stdio.h>\n#include <stdlib.h>\n\nint main(void) {\n    int *p = malloc(2 * sizeof(int));\n    if (p == NULL) {\n        return 1;\n    }\n    p[0] = 7;\n    p[1] = 9;\n    printf("%d\\n", p[0] + p[1]);\n    free(p);\n    p = NULL;\n    return 0;\n}',
          options: ['7', '9', '16', 'undefined behavior'],
          answer: '16',
          explanation:
            'The heap block indexes like an array: p[0] + p[1] = 7 + 9 = 16. The free and NULL assignment close the lifecycle correctly.',
          hint: 'A malloc\'d block is used exactly like an array.',
          difficulty: 'easy',
        },
        {
          id: 'q2',
          kind: 'multiple-choice',
          prompt: 'What is a memory leak?',
          options: [
            'Freeing the same block twice',
            'Allocated memory that is no longer reachable and never freed',
            'A stack frame that never unwinds',
            'Reading memory outside an array',
          ],
          answer: 'Allocated memory that is no longer reachable and never freed',
          explanation:
            'When the last pointer to a block is lost (overwritten, scope-exited) without free, the block stays reserved for the process lifetime. Repeated in a loop, leaks grow until allocation fails.',
          hint: 'The block exists but nobody can ever free it again.',
          difficulty: 'easy',
        },
        {
          id: 'q3',
          kind: 'true-false',
          prompt: 'After `free(p); p = NULL;`, an accidental later `free(p);` is harmless.',
          answer: 'true',
          explanation:
            'free(NULL) is defined to do nothing - which is exactly why the NULL-after-free habit works: any stray double free becomes a no-op instead of allocator corruption.',
          hint: 'What does the standard say free(NULL) does?',
          difficulty: 'medium',
        },
        {
          id: 'q4',
          kind: 'bug-identification',
          prompt: 'This function returns a pointer its caller immediately dereferences. Name the bug class and the two standard fixes.\n\n```\nint *make_pair(void) {\n    int pair[2] = {1, 2};\n    return pair;\n}\n```',
          answer: 'Dangling pointer - pair is a local array destroyed when the function returns - fixes: fill a caller-provided output buffer (void make_pair(int *out)), or use static/heap storage with a documented ownership rule',
          explanation:
            'The returned address points into an expired stack frame; reading it is undefined behavior. Output parameters (module 8 lesson 3) are the idiomatic fix; heap/static storage shifts the lifetime deliberately.',
          hint: 'What happens to automatic storage at function exit?',
          difficulty: 'medium',
        },
        {
          id: 'q5',
          kind: 'short-answer',
          prompt: 'Give two reasons a long-running embedded product avoids runtime malloc, and the allocation pattern that makes malloc acceptable when it is used.',
          answer: 'Fragmentation (varying allocation/free cycles leave unusable gaps) and unpredictability (timing varies, leaks/failures accumulate over months) - malloc is acceptable when used only during initialization: allocate once at startup, never free, never allocate again',
          explanation:
            'Static allocation gives fixed, provable memory cost - the requirement for systems that must run unattended. Init-time-only allocation gets the flexibility without the fragmentation risk.',
          hint: 'What happens to a heap after thousands of different-sized allocate/free cycles?',
          difficulty: 'hard',
        },
      ],
    },
    keyTerms: [
      { term: 'Stack', definition: 'Per-call automatic storage: locals and frames, created on entry, destroyed on exit, strictly size-limited.' },
      { term: 'Heap', definition: 'Memory requested with malloc and released with free; lifetime managed by the programmer.' },
      { term: 'Memory leak', definition: 'Allocated memory that becomes unreachable without being freed.' },
      { term: 'Dangling pointer', definition: 'A pointer to storage that has been freed or has gone out of scope; any use is undefined behavior.' },
      { term: 'Double free', definition: 'Freeing one block twice - corrupts allocator bookkeeping with delayed, unrelated crashes.' },
      { term: 'Static allocation', definition: 'Sizing all buffers at build time; the embedded default where worst cases are known.' },
    ],
    revisionSummary: [
      'Three storages: static (whole run), stack (per call), heap (explicit request).',
      'malloc pattern: size with n * sizeof(type), check NULL, free exactly once, then NULL the pointer.',
      'free(NULL) is a no-op - the NULL-after-free habit defuses double frees.',
      'Leaks: every malloc needs exactly one free on every path; verify with valgrind/ASan on hosts.',
      'Dangling pointers come from freed blocks and expired locals; output parameters avoid the latter.',
      'Embedded default is static allocation; init-time-only malloc is the acceptable compromise.',
    ],
    furtherReading: [
      { label: 'cppreference - malloc', url: 'https://en.cppreference.com/w/c/memory/malloc', kind: 'docs' },
      { label: 'Wikipedia - Memory leak', url: 'https://en.wikipedia.org/wiki/Memory_leak', kind: 'article' },
      { label: 'Wikipedia - Dangling pointer', url: 'https://en.wikipedia.org/wiki/Dangling_pointer', kind: 'article' },
      { label: 'Wikipedia - C dynamic memory allocation', url: 'https://en.wikipedia.org/wiki/C_dynamic_memory_allocation', kind: 'article' },
    ],
    estimatedMinutes: 45,
  },
];
