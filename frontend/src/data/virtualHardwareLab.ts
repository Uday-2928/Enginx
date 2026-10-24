/**
 * Connection-first virtual hardware data model.
 *
 * The renderer, keyboard controls, validator and simulator all consume this
 * graph.  The 3D scene is intentionally not the source of truth, which keeps
 * saved projects and non-pointer interaction deterministic.
 */

export type BoardId = 'arduino-uno-r3' | 'esp32-devkit-v1' | 'raspberry-pi-4b' | 'raspberry-pi-pico';
export type ComponentType = 'breadboard' | 'led' | 'resistor' | 'button' | 'potentiometer' | 'servo' | 'buzzer' | 'ldr' | 'dht11' | 'lcd1602';
export type EndpointOwner = 'board' | string;
export type EndpointKind = 'board-pin' | 'component-pin' | 'breadboard-hole';
export type WireColor = 'signal' | 'power' | 'ground' | 'custom';
export type PinDirection = 'input' | 'output' | 'bidirectional' | 'power';

export interface BoardPin {
  id: string;
  label: string;
  kind: 'digital' | 'analog' | 'power' | 'ground' | 'communication' | 'reset';
  voltage?: number;
  capabilities: string[];
  position: [number, number];
  physicalNumber?: number;
  direction?: PinDirection;
  supportedModes?: string[];
}

export interface BoardProfile {
  id: BoardId;
  name: string;
  variant: string;
  family: string;
  logicVoltage: number;
  language: 'cpp' | 'python' | 'c';
  pins: BoardPin[];
  notes: string[];
  limitations: string[];
  supportedSimulationFeatures: string[];
}

export interface ComponentPin {
  id: string;
  label: string;
  kind: 'signal' | 'power' | 'ground' | 'passive' | 'analog';
  position: [number, number];
}

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  description: string;
  pins: ComponentPin[];
  defaultProperties: Record<string, string | number | boolean>;
  safety: string;
}

export interface PlacedComponent {
  id: string;
  type: ComponentType;
  position: [number, number];
  rotation: number;
  properties: Record<string, string | number | boolean>;
}

export interface CircuitEndpoint {
  ownerId: EndpointOwner;
  pinId: string;
  kind: EndpointKind;
}

export interface CircuitWire {
  id: string;
  from: CircuitEndpoint;
  to: CircuitEndpoint;
  color: WireColor;
  waypoints: Array<[number, number]>;
}

export interface BreadboardNode {
  id: string;
  label: string;
  group: string;
  kind: 'terminal-strip' | 'power-rail';
  position: [number, number];
  connectedHoleIds: string[];
}

export interface BreadboardTopology {
  id: string;
  rows: number;
  columns: number;
  nodes: BreadboardNode[];
  connectionRule: string;
}

export interface CircuitGraph {
  boardId: BoardId;
  components: PlacedComponent[];
  wires: CircuitWire[];
  selectedId: string | null;
  breadboardTopology?: BreadboardTopology;
  version?: number;
}

export interface RequiredConnection {
  id: string;
  label: string;
  from: CircuitEndpoint;
  to: CircuitEndpoint;
  explanation: string;
}

export interface GuidedProject {
  id: string;
  title: string;
  subtitle: string;
  boardId: BoardId;
  objectives: string[];
  requiredComponents: ComponentType[];
  requiredConnections: RequiredConnection[];
  starterCode: string;
  runtimeNote: string;
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  endpoint?: CircuitEndpoint;
}

export interface CircuitValidation {
  valid: boolean;
  issues: ValidationIssue[];
  passedChecks: string[];
  boardId?: BoardId;
  configuredOutputPin?: string;
}

export interface SimulationState {
  status: 'idle' | 'blocked' | 'running' | 'stopped' | 'error';
  ledOn: boolean;
  ledBrightness: number;
  serialOutput: string[];
  message: string;
  pinStates?: Record<string, number>;
  inputStates?: Record<string, number>;
  ledStates?: Record<string, number>;
  servoAngles?: Record<string, number>;
  durationMs?: number;
  runtime?: string;
}

export const VIRTUAL_HARDWARE_STORAGE_KEY = 'enginx.virtual-hardware.project';
export const VIRTUAL_HARDWARE_SCHEMA_VERSION = 2;

export interface SavedVirtualHardwareProject {
  graph: CircuitGraph;
  code: string;
  savedAt: string;
  schemaVersion?: number;
  title?: string;
  description?: string;
  guidedStep?: string;
  completedSteps?: string[];
  simulationConfig?: Record<string, unknown>;
}

export interface SupportedFirmwareResult {
  status: 'running' | 'error';
  pinModes: Record<string, string>;
  pinStates: Record<string, number>;
  servoAngles: Record<string, number>;
  serialOutput: string[];
  durationMs: number;
  error?: string;
  supportedStatements: string[];
}

export interface FirmwareExecutionOptions {
  initialPinStates?: Record<string, number>;
}

const ARDUINO_PINS: BoardPin[] = [
  ...Array.from({ length: 14 }, (_, index) => ({
    id: `D${index}`,
    label: `D${index}`,
    kind: 'digital' as const,
    voltage: 5,
    capabilities: index === 3 || index === 5 || index === 6 || index === 9 || index === 10 || index === 11 ? ['digital', 'pwm'] : ['digital'],
    position: [-3.55 + (index % 7) * 1.18, index < 7 ? 1.1 : -1.1] as [number, number],
    physicalNumber: index + 1,
  })),
  { id: 'A0', label: 'A0', kind: 'analog', voltage: 5, capabilities: ['analog-input', 'digital'], position: [-3.55, -1.95] },
  { id: 'A1', label: 'A1', kind: 'analog', voltage: 5, capabilities: ['analog-input', 'digital'], position: [-2.35, -1.95] },
  { id: 'A2', label: 'A2', kind: 'analog', voltage: 5, capabilities: ['analog-input', 'digital'], position: [-1.15, -1.95] },
  { id: 'A3', label: 'A3', kind: 'analog', voltage: 5, capabilities: ['analog-input', 'digital'], position: [0.05, -1.95] },
  { id: '5V', label: '5V', kind: 'power', voltage: 5, capabilities: ['power'], position: [1.4, -1.95] },
  { id: '3V3', label: '3V3', kind: 'power', voltage: 3.3, capabilities: ['power'], position: [2.55, -1.95] },
  { id: 'GND', label: 'GND', kind: 'ground', voltage: 0, capabilities: ['ground'], position: [3.7, -1.95] },
];

const ESP32_PINS: BoardPin[] = [
  ...[2, 4, 5, 12, 13, 14, 15, 18, 19, 21, 22, 23, 25, 26, 27, 32, 33].map((gpio, index) => ({
    id: `GPIO${gpio}`,
    label: `GPIO${gpio}`,
    kind: 'digital' as const,
    voltage: 3.3,
    capabilities: ['digital', 'pwm', ...(gpio >= 32 ? ['adc'] : [])],
    position: [-3.55 + (index % 9) * 0.9, index < 9 ? 1.1 : -1.1] as [number, number],
  })),
  { id: '3V3', label: '3V3', kind: 'power', voltage: 3.3, capabilities: ['power'], position: [2.2, -1.95] },
  { id: 'GND', label: 'GND', kind: 'ground', voltage: 0, capabilities: ['ground'], position: [3.25, -1.95] },
  { id: 'VIN', label: 'VIN', kind: 'power', voltage: 5, capabilities: ['power-input'], position: [4.3, -1.95] },
];

const PI_PINS: BoardPin[] = [
  { id: 'GPIO17', label: 'GPIO17', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'spi'], position: [-3.55, 1.1], physicalNumber: 11 },
  { id: 'GPIO18', label: 'GPIO18', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'pwm', 'spi'], position: [-2.35, 1.1], physicalNumber: 12 },
  { id: 'GPIO27', label: 'GPIO27', kind: 'digital', voltage: 3.3, capabilities: ['digital'], position: [-1.15, 1.1], physicalNumber: 13 },
  { id: 'GPIO22', label: 'GPIO22', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'i2c'], position: [0.05, 1.1], physicalNumber: 15 },
  { id: 'GPIO23', label: 'GPIO23', kind: 'digital', voltage: 3.3, capabilities: ['digital'], position: [1.25, 1.1], physicalNumber: 16 },
  { id: 'GPIO24', label: 'GPIO24', kind: 'digital', voltage: 3.3, capabilities: ['digital'], position: [2.45, 1.1], physicalNumber: 18 },
  { id: '3V3', label: '3V3', kind: 'power', voltage: 3.3, capabilities: ['power'], position: [3.65, 1.1], physicalNumber: 17 },
  { id: 'GND', label: 'GND', kind: 'ground', voltage: 0, capabilities: ['ground'], position: [4.7, 1.1], physicalNumber: 14 },
];

function withPinModes(pins: BoardPin[]): BoardPin[] {
  return pins.map((pin) => ({
    ...pin,
    direction: pin.kind === 'power' || pin.kind === 'ground' ? 'power' : pin.kind === 'analog' ? 'input' : 'bidirectional',
    supportedModes: pin.kind === 'ground' || pin.kind === 'power'
      ? ['power']
      : pin.kind === 'analog'
        ? ['input', 'analog']
        : ['input', 'output', ...(pin.capabilities.includes('pwm') ? ['pwm'] : [])],
  }));
}

export const BOARD_PROFILES: Record<BoardId, BoardProfile> = {
  'arduino-uno-r3': {
    id: 'arduino-uno-r3', name: 'Arduino Uno R3', variant: 'ATmega328P reference profile', family: 'AVR 8-bit', logicVoltage: 5,
    language: 'cpp', pins: withPinModes(ARDUINO_PINS),
    notes: ['D3, D5, D6, D9, D10 and D11 are modeled as PWM-capable.', 'The beginner LED project uses D8 as a digital output.'],
    limitations: ['This browser slice uses a constrained Arduino sketch interpreter; it does not compile arbitrary AVR firmware.'],
    supportedSimulationFeatures: ['digital input/output', 'PWM output', 'serial text output', 'delay timing'],
  },
  'esp32-devkit-v1': {
    id: 'esp32-devkit-v1', name: 'ESP32 DevKit V1', variant: '30-pin Wi-Fi/BLE reference profile', family: 'ESP32', logicVoltage: 3.3,
    language: 'cpp', pins: withPinModes(ESP32_PINS),
    notes: ['Pin capabilities are specific to this named DevKit profile.', 'GPIO34–39 are input-only on common ESP32 variants; this slice does not expose them as outputs.'],
    limitations: ['Wi-Fi, BLE and arbitrary Arduino-ESP32 library execution are not enabled in this browser slice.'],
    supportedSimulationFeatures: ['digital input/output', 'PWM output', 'ADC metadata'],
  },
  'raspberry-pi-4b': {
    id: 'raspberry-pi-4b', name: 'Raspberry Pi 4 Model B', variant: '40-pin header reference profile', family: 'Broadcom BCM2711 Linux SBC', logicVoltage: 3.3,
    language: 'python', pins: withPinModes(PI_PINS),
    notes: ['Labels use BCM GPIO numbers; physical header numbers are shown separately.', 'GPIO is not 5 V tolerant.'],
    limitations: ['Linux GPIO libraries and physical hardware access are not available in the browser slice; the profile is educational.'],
    supportedSimulationFeatures: ['GPIO topology metadata only'],
  },
  'raspberry-pi-pico': {
    id: 'raspberry-pi-pico', name: 'Raspberry Pi Pico', variant: 'RP2040 reference profile', family: 'RP2040 microcontroller', logicVoltage: 3.3,
    language: 'cpp', pins: withPinModes([
      { id: 'GP0', label: 'GP0', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'uart'], position: [-3.5, 1.1] },
      { id: 'GP1', label: 'GP1', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'uart'], position: [-2.3, 1.1] },
      { id: 'GP2', label: 'GP2', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'pwm'], position: [-1.1, 1.1] },
      { id: 'GP3', label: 'GP3', kind: 'digital', voltage: 3.3, capabilities: ['digital', 'pwm'], position: [0.1, 1.1] },
      { id: '3V3', label: '3V3', kind: 'power', voltage: 3.3, capabilities: ['power'], position: [2.2, -1.95] },
      { id: 'GND', label: 'GND', kind: 'ground', voltage: 0, capabilities: ['ground'], position: [3.3, -1.95] },
    ]),
    notes: ['Pico is a microcontroller profile, not a Linux Raspberry Pi profile.'],
    limitations: ['Pico firmware execution is not enabled in this browser slice.'],
    supportedSimulationFeatures: ['GPIO topology metadata only'],
  },
};

export const COMPONENT_DEFINITIONS: Record<ComponentType, ComponentDefinition> = {
  breadboard: { type: 'breadboard', label: 'Breadboard', description: 'Solderless prototyping board with grouped rows and power rails.', pins: [], defaultProperties: { rows: 30 }, safety: 'The displayed topology is educational and does not model parasitic electrical effects.' },
  led: { type: 'led', label: 'LED', description: 'Light-emitting diode with polarity.', pins: [{ id: 'anode', label: 'Anode (+)', kind: 'signal', position: [-0.45, 0] }, { id: 'cathode', label: 'Cathode (-)', kind: 'ground', position: [0.45, 0] }], defaultProperties: { color: '#ef4444', brightness: 0 }, safety: 'Use a current-limiting resistor in the guided exercise.' },
  resistor: { type: 'resistor', label: 'Resistor', description: 'Passive two-terminal current-limiting component.', pins: [{ id: '1', label: 'Terminal 1', kind: 'passive', position: [-0.55, 0] }, { id: '2', label: 'Terminal 2', kind: 'passive', position: [0.55, 0] }], defaultProperties: { resistanceOhms: 220 }, safety: 'The browser model validates presence, not full analog power dissipation.' },
  button: { type: 'button', label: 'Push button', description: 'Momentary digital input.', pins: [{ id: '1', label: 'Input side', kind: 'signal', position: [-0.45, 0] }, { id: '2', label: 'Return side', kind: 'ground', position: [0.45, 0] }], defaultProperties: { pressed: false }, safety: 'Pull-up and pull-down behavior must be configured by the project.' },
  potentiometer: { type: 'potentiometer', label: 'Potentiometer', description: 'Adjustable analog source.', pins: [{ id: 'VCC', label: 'VCC', kind: 'power', position: [-0.55, 0] }, { id: 'SIG', label: 'Wiper', kind: 'analog', position: [0, 0.45] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.55, 0] }], defaultProperties: { value: 0.5 }, safety: 'The value is a software-controlled educational input.' },
  servo: { type: 'servo', label: 'SG90-style servo', description: 'Three-wire actuator model.', pins: [{ id: 'VCC', label: 'VCC', kind: 'power', position: [-0.55, 0] }, { id: 'SIG', label: 'Signal', kind: 'signal', position: [0, 0.45] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.55, 0] }], defaultProperties: { angle: 0 }, safety: 'Do not power a physical servo from an unsuitable GPIO pin.' },
  buzzer: { type: 'buzzer', label: 'Passive buzzer', description: 'Tone output model.', pins: [{ id: 'SIG', label: 'Signal', kind: 'signal', position: [-0.45, 0] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.45, 0] }], defaultProperties: { frequencyHz: 440 }, safety: 'Browser audio is not enabled by the first slice.' },
  ldr: { type: 'ldr', label: 'LDR light sensor', description: 'Interactive analog light-level source.', pins: [{ id: 'VCC', label: 'VCC', kind: 'power', position: [-0.45, 0] }, { id: 'SIG', label: 'Analog signal', kind: 'analog', position: [0, 0.45] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.45, 0] }], defaultProperties: { lightLevel: 0.5 }, safety: 'Reading is a simplified model, not a calibrated sensor measurement.' },
  dht11: { type: 'dht11', label: 'DHT11-style sensor', description: 'Temperature and humidity concept model.', pins: [{ id: 'VCC', label: 'VCC', kind: 'power', position: [-0.55, 0] }, { id: 'DATA', label: 'Data', kind: 'signal', position: [0, 0.45] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.55, 0] }], defaultProperties: { temperatureC: 24, humidity: 45 }, safety: 'Values are user-controlled educational inputs.' },
  lcd1602: { type: 'lcd1602', label: '16×2 LCD', description: 'Display endpoint for supported guided projects.', pins: [{ id: 'VCC', label: 'VCC', kind: 'power', position: [-0.55, 0] }, { id: 'SDA', label: 'SDA', kind: 'signal', position: [0, 0.45] }, { id: 'GND', label: 'GND', kind: 'ground', position: [0.55, 0] }], defaultProperties: { text: '' }, safety: 'I2C behavior is not simulated by the first slice.' },
};

export const LIGHT_LED_PROJECT: GuidedProject = {
  id: 'arduino-light-an-led',
  title: 'Light an LED',
  subtitle: 'Build the circuit before you write the sketch.',
  boardId: 'arduino-uno-r3',
  objectives: ['Identify LED polarity.', 'Add a current-limiting resistor.', 'Connect a digital output and ground.', 'Run a supported sketch only after the circuit validates.'],
  requiredComponents: ['breadboard', 'led', 'resistor'],
  requiredConnections: [
    { id: 'led-resistor', label: 'LED anode → resistor terminal 1', from: { ownerId: 'led-1', pinId: 'anode', kind: 'component-pin' }, to: { ownerId: 'resistor-1', pinId: '1', kind: 'component-pin' }, explanation: 'The resistor must be in series with the LED anode.' },
    { id: 'resistor-output', label: 'Resistor terminal 2 → Arduino D8', from: { ownerId: 'resistor-1', pinId: '2', kind: 'component-pin' }, to: { ownerId: 'board', pinId: 'D8', kind: 'board-pin' }, explanation: 'The starter sketch controls D8.' },
    { id: 'led-ground', label: 'LED cathode → Arduino GND', from: { ownerId: 'led-1', pinId: 'cathode', kind: 'component-pin' }, to: { ownerId: 'board', pinId: 'GND', kind: 'board-pin' }, explanation: 'The LED return path must reach ground.' },
  ],
  starterCode: `const int ledPin = 8;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);\n}`,
  runtimeNote: 'This first slice uses a constrained Arduino sketch interpreter for digitalWrite/pinMode. It does not claim arbitrary AVR compilation or physical board execution.',
};

export function boardProfile(boardId: BoardId): BoardProfile {
  return BOARD_PROFILES[boardId];
}

export function componentDefinition(type: ComponentType): ComponentDefinition {
  return COMPONENT_DEFINITIONS[type];
}

export function createDefaultBreadboardTopology(): BreadboardTopology {
  const nodes: BreadboardNode[] = [];
  for (let row = 1; row <= 30; row += 1) {
    nodes.push({
      id: `left-row-${row}`,
      label: `Row ${row} left`,
      group: `row-${row}-left`,
      kind: 'terminal-strip',
      position: [-2.65 + ((row - 1) % 12) * 0.48, -3.55 + Math.floor((row - 1) / 12) * 0.38],
      connectedHoleIds: ['a', 'b', 'c', 'd', 'e'].map((column) => `${column}${row}`),
    });
    nodes.push({
      id: `right-row-${row}`,
      label: `Row ${row} right`,
      group: `row-${row}-right`,
      kind: 'terminal-strip',
      position: [-2.65 + ((row - 1) % 12) * 0.48, -3.05 + Math.floor((row - 1) / 12) * 0.38],
      connectedHoleIds: ['f', 'g', 'h', 'i', 'j'].map((column) => `${column}${row}`),
    });
  }
  nodes.push({ id: 'positive-rail', label: 'Positive rail', group: 'positive-rail', kind: 'power-rail', position: [0, -4.05], connectedHoleIds: Array.from({ length: 30 }, (_, index) => `+${index + 1}`) });
  nodes.push({ id: 'ground-rail', label: 'Ground rail', group: 'ground-rail', kind: 'power-rail', position: [0, -4.35], connectedHoleIds: Array.from({ length: 30 }, (_, index) => `-${index + 1}`) });
  return {
    id: 'solderless-30-row',
    rows: 30,
    columns: 10,
    nodes,
    connectionRule: 'a-e are connected per row, f-j are connected per row, and each power rail is connected end-to-end; the center channel separates the strips.',
  };
}

export function breadboardEndpoint(holeId: string): CircuitEndpoint {
  return { ownerId: 'breadboard-1', pinId: holeId, kind: 'breadboard-hole' };
}

export function breadboardNodeForHole(graph: CircuitGraph, holeId: string): BreadboardNode | undefined {
  return (graph.breadboardTopology || createDefaultBreadboardTopology()).nodes.find((node) => node.connectedHoleIds.includes(holeId));
}

export function createStarterCircuit(boardId: BoardId = LIGHT_LED_PROJECT.boardId): CircuitGraph {
  return {
    boardId,
    components: [
      { id: 'breadboard-1', type: 'breadboard', position: [0, -0.45], rotation: 0, properties: { ...COMPONENT_DEFINITIONS.breadboard.defaultProperties } },
      { id: 'led-1', type: 'led', position: [-1.8, 0.2], rotation: 0, properties: { ...COMPONENT_DEFINITIONS.led.defaultProperties } },
      { id: 'resistor-1', type: 'resistor', position: [-0.2, 0.2], rotation: 0, properties: { ...COMPONENT_DEFINITIONS.resistor.defaultProperties } },
    ],
    wires: [],
    selectedId: null,
    breadboardTopology: createDefaultBreadboardTopology(),
    version: VIRTUAL_HARDWARE_SCHEMA_VERSION,
  };
}

export function endpointKey(endpoint: CircuitEndpoint): string {
  return `${endpoint.ownerId}:${endpoint.pinId}:${endpoint.kind}`;
}

export function endpointEquals(left: CircuitEndpoint, right: CircuitEndpoint): boolean {
  return left.ownerId === right.ownerId && left.pinId === right.pinId && left.kind === right.kind;
}

export function boardPinSupportsMode(boardId: BoardId, pinId: string, mode: 'input' | 'output' | 'pwm' | 'analog'): boolean {
  const pin = BOARD_PROFILES[boardId].pins.find((candidate) => candidate.id === pinId);
  if (!pin) return false;
  if (mode === 'analog') return pin.kind === 'analog' || pin.capabilities.includes('adc') || pin.capabilities.includes('analog-input');
  if (mode === 'pwm') return pin.capabilities.includes('pwm');
  if (mode === 'output') return pin.kind === 'digital' || pin.kind === 'communication';
  return pin.kind === 'digital' || pin.kind === 'analog' || pin.kind === 'communication';
}

export function endpointExists(graph: CircuitGraph, endpoint: CircuitEndpoint): boolean {
  if (endpoint.ownerId === 'board') return Boolean(BOARD_PROFILES[graph.boardId].pins.find((pin) => pin.id === endpoint.pinId));
  if (endpoint.ownerId === 'breadboard-1' && endpoint.kind === 'breadboard-hole') return Boolean(breadboardNodeForHole(graph, endpoint.pinId));
  const component = graph.components.find((item) => item.id === endpoint.ownerId);
  return Boolean(component && COMPONENT_DEFINITIONS[component.type].pins.some((pin) => pin.id === endpoint.pinId));
}

export function connectionIssue(graph: CircuitGraph, from: CircuitEndpoint, to: CircuitEndpoint): string | null {
  if (!endpointExists(graph, from) || !endpointExists(graph, to)) return 'Both wire endpoints must exist in the current circuit.';
  if (endpointEquals(from, to)) return 'A wire needs two different endpoints.';
  if (from.ownerId === to.ownerId && from.ownerId !== 'breadboard-1') return 'A component pin cannot connect directly to another pin on the same component.';
  if (from.ownerId === 'board' && to.ownerId === 'board') return 'A board pin cannot be wired directly to another board pin.';
  const boardEndpoints = [from, to].filter((endpoint) => endpoint.ownerId === 'board');
  if (boardEndpoints.some((endpoint) => {
    const pin = BOARD_PROFILES[graph.boardId].pins.find((candidate) => candidate.id === endpoint.pinId);
    return pin?.kind === 'power' && boardEndpoints.length === 2;
  })) return 'Power pins must connect through a component or breadboard node, not directly to another board power pin.';
  const duplicate = graph.wires.some((wire) => (
    (endpointEquals(wire.from, from) && endpointEquals(wire.to, to))
    || (endpointEquals(wire.from, to) && endpointEquals(wire.to, from))
  ));
  if (duplicate) return 'That connection already exists.';
  const occupied = [from, to].filter((endpoint) => endpoint.kind !== 'breadboard-hole').some((endpoint) => graph.wires.some((wire) => endpointEquals(wire.from, endpoint) || endpointEquals(wire.to, endpoint)));
  if (occupied) return 'A board or component pin already has a wire. Use a breadboard node to fan out a connection.';
  return null;
}

interface CircuitUnionFind {
  parent: Map<string, string>;
  find(key: string): string;
  union(left: string, right: string): void;
}

function createUnionFind(): CircuitUnionFind {
  const parent = new Map<string, string>();
  const find = (key: string): string => {
    if (!parent.has(key)) parent.set(key, key);
    const current = parent.get(key) as string;
    if (current === key) return key;
    const root = find(current);
    parent.set(key, root);
    return root;
  };
  return { parent, find, union: (left, right) => { const leftRoot = find(left); const rightRoot = find(right); if (leftRoot !== rightRoot) parent.set(leftRoot, rightRoot); } };
}

function graphConnectivity(graph: CircuitGraph): CircuitUnionFind {
  const unionFind = createUnionFind();
  for (const wire of graph.wires) unionFind.union(endpointKey(wire.from), endpointKey(wire.to));
  const topology = graph.breadboardTopology || createDefaultBreadboardTopology();
  for (const node of topology.nodes) {
    const holes = node.connectedHoleIds.map((holeId) => endpointKey(breadboardEndpoint(holeId)));
    holes.slice(1).forEach((hole) => unionFind.union(holes[0], hole));
  }
  return unionFind;
}

export function endpointsShareCircuit(graph: CircuitGraph, left: CircuitEndpoint, right: CircuitEndpoint): boolean {
  if (!endpointExists(graph, left) || !endpointExists(graph, right)) return false;
  if (endpointEquals(left, right)) return true;
  const unionFind = graphConnectivity(graph);
  const leftKey = unionFind.find(endpointKey(left));
  const rightKey = unionFind.find(endpointKey(right));
  return leftKey === rightKey;
}

function connectedBoardPins(graph: CircuitGraph, endpoint: CircuitEndpoint): BoardPin[] {
  return BOARD_PROFILES[graph.boardId].pins.filter((pin) => endpointsShareCircuit(graph, endpoint, { ownerId: 'board', pinId: pin.id, kind: 'board-pin' }));
}

function hasDirectOrReverseWire(graph: CircuitGraph, expected: RequiredConnection): boolean {
  return endpointsShareCircuit(graph, expected.from, expected.to);
}

export function validateCircuit(graph: CircuitGraph, project: GuidedProject = LIGHT_LED_PROJECT): CircuitValidation {
  const issues: ValidationIssue[] = [];
  const passedChecks: string[] = [];
  const board = boardProfile(graph.boardId);
  const availableTypes = new Set(graph.components.map((component) => component.type));
  let configuredOutputPin: string | undefined;
  const seenWirePairs = new Set<string>();

  for (const wire of graph.wires) {
    const pair = [endpointKey(wire.from), endpointKey(wire.to)].sort().join('|');
    if (seenWirePairs.has(pair)) issues.push({ id: `duplicate-wire-${wire.id}`, severity: 'error', message: 'Duplicate wires between the same endpoints are not valid.' });
    seenWirePairs.add(pair);
    const issue = connectionIssue({ ...graph, wires: graph.wires.filter((candidate) => candidate.id !== wire.id) }, wire.from, wire.to);
    if (issue && issue !== 'That connection already exists.') {
      issues.push({ id: `invalid-wire-${wire.id}`, severity: 'error', message: issue });
    }
  }

  if (graph.boardId !== project.boardId) {
    issues.push({ id: 'wrong-board', severity: 'error', message: `This guided project requires ${boardProfile(project.boardId).name}.` });
  } else {
    passedChecks.push(`${board.name} selected`);
  }

  for (const type of project.requiredComponents) {
    if (!availableTypes.has(type)) {
      issues.push({ id: `missing-${type}`, severity: 'error', message: `Place a ${componentDefinition(type).label} before validating the circuit.` });
    } else {
      passedChecks.push(`${componentDefinition(type).label} placed`);
    }
  }

  for (const required of project.requiredConnections) {
    if (required.id === 'resistor-output') {
      const resistorTerminal = { ownerId: 'resistor-1', pinId: '2', kind: 'component-pin' as const };
      const boardPins = connectedBoardPins(graph, resistorTerminal).filter((pin) => boardPinSupportsMode(graph.boardId, pin.id, 'output'));
      if (boardPins.length > 0) {
        configuredOutputPin = boardPins[0].id;
        passedChecks.push(`Resistor terminal 2 → ${boardPins[0].label}`);
      } else {
        issues.push({ id: `missing-wire-${required.id}`, severity: 'error', message: 'Connect resistor terminal 2 to a digital output pin on the selected board.', endpoint: required.from });
      }
      continue;
    }
    if (hasDirectOrReverseWire(graph, required)) {
      passedChecks.push(required.label);
    } else {
      issues.push({ id: `missing-wire-${required.id}`, severity: 'error', message: required.explanation, endpoint: required.from });
    }
  }

  const hasGround = graph.wires.some((wire) => wire.from.pinId === 'GND' || wire.to.pinId === 'GND');
  if (!hasGround) issues.push({ id: 'missing-ground', severity: 'error', message: 'The circuit has no ground return path.' });
  else passedChecks.push('Ground return detected');

  if (board.logicVoltage !== 5) {
    issues.push({ id: 'board-voltage-note', severity: 'warning', message: `${board.name} uses ${board.logicVoltage} V logic; confirm component compatibility before using physical hardware.` });
  }

  return { valid: issues.every((issue) => issue.severity !== 'error'), issues, passedChecks, boardId: graph.boardId, configuredOutputPin };
}

export function wireColorForEndpoints(from: CircuitEndpoint, to: CircuitEndpoint): WireColor {
  if (from.pinId === 'GND' || to.pinId === 'GND' || from.pinId === 'GND' || to.pinId === 'GND') return 'ground';
  if (from.pinId === '5V' || from.pinId === '3V3' || to.pinId === '5V' || to.pinId === '3V3' || from.pinId === 'VIN' || to.pinId === 'VIN') return 'power';
  return 'signal';
}

export function addWire(graph: CircuitGraph, from: CircuitEndpoint, to: CircuitEndpoint): CircuitGraph {
  if (connectionIssue(graph, from, to)) return graph;
  return {
    ...graph,
    wires: [...graph.wires, { id: `wire-${Date.now()}-${graph.wires.length}`, from, to, color: wireColorForEndpoints(from, to), waypoints: [] }],
  };
}

export function reconnectWire(graph: CircuitGraph, wireId: string, from: CircuitEndpoint, to: CircuitEndpoint): CircuitGraph {
  const wire = graph.wires.find((candidate) => candidate.id === wireId);
  if (!wire) return graph;
  const withoutWire = removeWire(graph, wireId);
  const issue = connectionIssue(withoutWire, from, to);
  if (issue) return graph;
  return {
    ...withoutWire,
    wires: [...withoutWire.wires, { ...wire, from, to, color: wireColorForEndpoints(from, to) }],
  };
}

export function removeWire(graph: CircuitGraph, wireId: string): CircuitGraph {
  return { ...graph, wires: graph.wires.filter((wire) => wire.id !== wireId) };
}

export function addComponent(graph: CircuitGraph, type: ComponentType): CircuitGraph {
  const definition = componentDefinition(type);
  const existingIds = new Set(graph.components.map((component) => component.id));
  let count = graph.components.filter((component) => component.type === type).length + 1;
  while (existingIds.has(`${type}-${count}`)) count += 1;
  return {
    ...graph,
    components: [...graph.components, { id: `${type}-${count}`, type, position: [1.2 + (count % 3) * 1.4, 1.25 - Math.floor(count / 3) * 1.1], rotation: 0, properties: { ...definition.defaultProperties } }],
  };
}

export function removeComponent(graph: CircuitGraph, componentId: string): CircuitGraph {
  return {
    ...graph,
    components: graph.components.filter((component) => component.id !== componentId),
    wires: graph.wires.filter((wire) => wire.from.ownerId !== componentId && wire.to.ownerId !== componentId),
    selectedId: graph.selectedId === componentId ? null : graph.selectedId,
  };
}

export function nudgeComponent(graph: CircuitGraph, componentId: string, dx: number, dy: number): CircuitGraph {
  return {
    ...graph,
    components: graph.components.map((component) => component.id === componentId
      ? { ...component, position: [Math.max(-3.5, Math.min(3.5, component.position[0] + dx)), Math.max(-2, Math.min(2.2, component.position[1] + dy))] }
      : component),
  };
}

export function moveComponent(graph: CircuitGraph, componentId: string, position: [number, number]): CircuitGraph {
  return {
    ...graph,
    components: graph.components.map((component) => component.id === componentId
      ? { ...component, position: [Math.max(-3.5, Math.min(3.5, position[0])), Math.max(-2, Math.min(2.2, position[1]))] }
      : component),
  };
}

export function updateComponentProperties(graph: CircuitGraph, componentId: string, properties: Record<string, string | number | boolean>): CircuitGraph {
  return {
    ...graph,
    components: graph.components.map((component) => component.id === componentId
      ? { ...component, properties: { ...component.properties, ...properties } }
      : component),
  };
}

export function rotateComponent(graph: CircuitGraph, componentId: string, deltaRadians = Math.PI / 2): CircuitGraph {
  return {
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? { ...component, rotation: component.rotation + deltaRadians } : component),
  };
}

interface FirmwareEnvironment {
  variables: Record<string, number | boolean | string>;
  pinModes: Record<string, string>;
  pinStates: Record<string, number>;
  servoAngles: Record<string, number>;
  serialOutput: string[];
  durationMs: number;
  statements: string[];
  steps: number;
}

function stripFirmwareComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function matchingPair(source: string, openIndex: number, openChar: string, closeChar: string): number {
  let depth = 0;
  let quote = '';
  for (let index = openIndex; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (character === quote && source[index - 1] !== '\\') quote = '';
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === openChar) depth += 1;
    if (character === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function functionBody(source: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*\\(\\s*\\)\\s*\\{`, 'i').exec(source);
  if (!match || match.index === undefined) return null;
  const openIndex = source.indexOf('{', match.index);
  const closeIndex = matchingPair(source, openIndex, '{', '}');
  return closeIndex < 0 ? null : source.slice(openIndex + 1, closeIndex);
}

function skipWhitespace(source: string, start: number): number {
  let index = start;
  while (index < source.length && /\s/.test(source[index])) index += 1;
  return index;
}

function parseBlock(source: string, start: number): { body: string; next: number } {
  const index = skipWhitespace(source, start);
  if (source[index] === '{') {
    const closeIndex = matchingPair(source, index, '{', '}');
    return closeIndex < 0 ? { body: '', next: source.length } : { body: source.slice(index + 1, closeIndex), next: closeIndex + 1 };
  }
  const semicolon = source.indexOf(';', index);
  return semicolon < 0 ? { body: source.slice(index), next: source.length } : { body: source.slice(index, semicolon), next: semicolon + 1 };
}

function unwrapParentheses(expression: string): string {
  let value = expression.trim();
  while (value.startsWith('(') && matchingPair(value, 0, '(', ')') === value.length - 1) value = value.slice(1, -1).trim();
  return value;
}

function resolveFirmwareValue(expression: string, environment: FirmwareEnvironment): number | boolean | string {
  let value = unwrapParentheses(expression.replace(/\b(const|volatile|int|long|float|double|byte|bool)\b/g, '').trim());
  if (/^HIGH$/i.test(value)) return 1;
  if (/^LOW$/i.test(value)) return 0;
  if (/^true$/i.test(value)) return true;
  if (/^false$/i.test(value)) return false;
  const stringMatch = value.match(/^"([\s\S]*)"$/) || value.match(/^'([\s\S]*)'$/);
  if (stringMatch) return stringMatch[1];
  const readMatch = value.match(/^digitalRead\s*\((.*)\)$/i);
  if (readMatch) return environment.pinStates[pinName(resolveFirmwareValue(readMatch[1], environment))] || 0;
  const analogMatch = value.match(/^analogRead\s*\((.*)\)$/i);
  if (analogMatch) return environment.pinStates[pinName(resolveFirmwareValue(analogMatch[1], environment))] || 0;
  if (Object.prototype.hasOwnProperty.call(environment.variables, value)) return environment.variables[value];
  const arithmeticParts = value.split(/\s*(\+|-|\*|\/)\s*/);
  if (arithmeticParts.length === 3) {
    const left = Number(resolveFirmwareValue(arithmeticParts[0], environment));
    const right = Number(resolveFirmwareValue(arithmeticParts[2], environment));
    if (Number.isFinite(left) && Number.isFinite(right)) {
      if (arithmeticParts[1] === '+') return left + right;
      if (arithmeticParts[1] === '-') return left - right;
      if (arithmeticParts[1] === '*') return left * right;
      if (arithmeticParts[1] === '/' && right !== 0) return left / right;
    }
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : value;
}

function pinName(value: number | boolean | string): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `D${value}`;
  const text = String(value).trim();
  return /^D\d+$/i.test(text) ? text.toUpperCase() : text;
}

function conditionValue(expression: string, environment: FirmwareEnvironment): boolean {
  const orParts = expression.split(/\|\|/);
  if (orParts.length > 1) return orParts.some((part) => conditionValue(part, environment));
  const andParts = expression.split(/&&/);
  if (andParts.length > 1) return andParts.every((part) => conditionValue(part, environment));
  const value = expression.trim();
  if (value.startsWith('!')) return !conditionValue(value.slice(1), environment);
  const comparison = value.match(/^(.*?)\s*(===|==|!==|!=|<=|>=|<|>)\s*(.*?)$/);
  if (comparison) {
    const left = resolveFirmwareValue(comparison[1], environment);
    const right = resolveFirmwareValue(comparison[3], environment);
    switch (comparison[2]) {
      case '==': case '===': return String(left) === String(right);
      case '!=': case '!==': return String(left) !== String(right);
      case '<': return Number(left) < Number(right);
      case '>': return Number(left) > Number(right);
      case '<=': return Number(left) <= Number(right);
      case '>=': return Number(left) >= Number(right);
      default: return false;
    }
  }
  return Boolean(resolveFirmwareValue(value, environment));
}

function executeSimpleFirmwareStatement(statement: string, environment: FirmwareEnvironment): string | null {
  const source = statement.trim().replace(/;$/, '').trim();
  if (!source) return null;
  environment.steps += 1;
  if (environment.steps > 1000) return 'The supported runtime stopped after 1000 statements.';
  environment.statements.push(source);

  const declaration = source.match(/^(?:const\s+)?(?:int|long|float|double|byte|bool)\s+([A-Za-z_]\w*)\s*(?:=\s*(.*))?$/i);
  if (declaration) {
    environment.variables[declaration[1]] = declaration[2] ? resolveFirmwareValue(declaration[2], environment) : 0;
    return null;
  }
  const assignment = source.match(/^([A-Za-z_]\w*)\s*=\s*(.+)$/);
  if (assignment) {
    environment.variables[assignment[1]] = resolveFirmwareValue(assignment[2], environment);
    return null;
  }
  const pinMode = source.match(/^pinMode\s*\((.*?),(.*?)\)$/i);
  if (pinMode) {
    const mode = pinMode[2].trim().toUpperCase();
    if (!['INPUT', 'OUTPUT', 'INPUT_PULLUP'].includes(mode)) return `Unsupported pin mode: ${mode}`;
    environment.pinModes[pinName(resolveFirmwareValue(pinMode[1], environment))] = mode;
    return null;
  }
  const digitalWrite = source.match(/^digitalWrite\s*\((.*?),(.*?)\)$/i);
  if (digitalWrite) {
    const pin = pinName(resolveFirmwareValue(digitalWrite[1], environment));
    const value = Number(resolveFirmwareValue(digitalWrite[2], environment));
    environment.pinStates[pin] = value > 0 ? 1 : 0;
    return null;
  }
  const analogWrite = source.match(/^analogWrite\s*\((.*?),(.*?)\)$/i);
  if (analogWrite) {
    const pin = pinName(resolveFirmwareValue(analogWrite[1], environment));
    const value = Number(resolveFirmwareValue(analogWrite[2], environment));
    environment.pinModes[pin] = 'OUTPUT';
    environment.pinStates[pin] = Math.max(0, Math.min(255, Number.isFinite(value) ? value : 0));
    return null;
  }
  const delay = source.match(/^delay\s*\((.*?)\)$/i);
  if (delay) {
    const milliseconds = Number(resolveFirmwareValue(delay[1], environment));
    if (!Number.isFinite(milliseconds) || milliseconds < 0 || milliseconds > 10000) return 'delay() must be between 0 and 10000 ms.';
    environment.durationMs += milliseconds;
    return null;
  }
  const serial = source.match(/^Serial\.(?:println|print)\s*\((.*?)\)$/i);
  if (serial) {
    environment.serialOutput.push(String(resolveFirmwareValue(serial[1], environment)));
    return null;
  }
  const servo = source.match(/^servo\.(?:write|writeMicroseconds)\s*\((.*?)\)$/i);
  if (servo) {
    const angle = Number(resolveFirmwareValue(servo[1], environment));
    environment.servoAngles.servo = Math.max(0, Math.min(180, Number.isFinite(angle) ? angle : 0));
    return null;
  }
  if (/^(?:Serial\.begin|return|break|continue)\s*\(?.*\)?$/i.test(source)) return null;
  return `Unsupported statement: ${source}`;
}

function executeFirmwareBlock(source: string, environment: FirmwareEnvironment): string | null {
  let index = 0;
  while (index < source.length) {
    index = skipWhitespace(source, index);
    if (index >= source.length) break;
    const control = source.slice(index).match(/^(if|for)\s*\(/i);
    if (control) {
      const openParen = source.indexOf('(', index);
      const closeParen = matchingPair(source, openParen, '(', ')');
      if (closeParen < 0) return 'Unclosed control-flow condition.';
      const header = source.slice(openParen + 1, closeParen);
      const body = parseBlock(source, closeParen + 1);
      if (control[1].toLowerCase() === 'if') {
        let afterBody = skipWhitespace(source, body.next);
        let alternate: { body: string; next: number } | null = null;
        if (/^else\b/i.test(source.slice(afterBody))) alternate = parseBlock(source, afterBody + source.slice(afterBody).indexOf('else') + 4);
        const chosen = conditionValue(header, environment) ? body.body : alternate?.body;
        if (chosen !== undefined) {
          const error = executeFirmwareBlock(chosen, environment);
          if (error) return error;
        }
        index = alternate ? alternate.next : afterBody;
        continue;
      }
      const forParts = header.split(';').map((part) => part.trim());
      if (forParts.length !== 3) return 'Only bounded for(init; condition; increment) loops are supported.';
      const initError = executeSimpleFirmwareStatement(forParts[0], environment);
      if (initError) return initError;
      let guard = 0;
      while (conditionValue(forParts[1], environment) && guard < 100) {
        const bodyError = executeFirmwareBlock(body.body, environment);
        if (bodyError) return bodyError;
        const incrementError = executeSimpleFirmwareStatement(forParts[2].replace(/\+\+/, ` = ${forParts[2].replace(/\+\+/, '').trim()} + 1`).replace(/--/, ` = ${forParts[2].replace(/--/, '').trim()} - 1`), environment);
        if (incrementError) return incrementError;
        guard += 1;
      }
      if (guard >= 100) return 'for() loop exceeded the 100-iteration educational limit.';
      index = body.next;
      continue;
    }
    const semicolon = source.indexOf(';', index);
    const end = semicolon < 0 ? source.length : semicolon;
    const error = executeSimpleFirmwareStatement(source.slice(index, end), environment);
    if (error) return error;
    index = semicolon < 0 ? source.length : semicolon + 1;
  }
  return null;
}

export function executeSupportedFirmware(code: string, options: FirmwareExecutionOptions = {}): SupportedFirmwareResult {
  const environment: FirmwareEnvironment = { variables: {}, pinModes: {}, pinStates: { ...(options.initialPinStates || {}) }, servoAngles: {}, serialOutput: [], durationMs: 0, statements: [], steps: 0 };
  const source = stripFirmwareComments(code);
  const declarations = /\b(?:const\s+)?(?:int|long|float|double|byte|bool)\s+([A-Za-z_]\w*)\s*=\s*([^;]+)/gi;
  let declarationMatch: RegExpExecArray | null;
  while ((declarationMatch = declarations.exec(source)) !== null) {
    const rawValue = declarationMatch[2].trim();
    const numericValue = Number(rawValue);
    environment.variables[declarationMatch[1]] = Number.isFinite(numericValue) ? numericValue : rawValue;
  }
  const setup = functionBody(source, 'setup');
  const loop = functionBody(source, 'loop');
  if (setup === null || loop === null) return { status: 'error', pinModes: {}, pinStates: {}, servoAngles: {}, serialOutput: [], durationMs: 0, error: 'The supported runtime requires setup() and loop() functions.', supportedStatements: [] };
  const setupError = executeFirmwareBlock(setup, environment);
  const loopError = setupError || executeFirmwareBlock(loop, environment);
  return loopError
    ? { status: 'error', pinModes: environment.pinModes, pinStates: environment.pinStates, servoAngles: environment.servoAngles, serialOutput: environment.serialOutput, durationMs: environment.durationMs, error: loopError, supportedStatements: environment.statements }
    : { status: 'running', pinModes: environment.pinModes, pinStates: environment.pinStates, servoAngles: environment.servoAngles, serialOutput: environment.serialOutput, durationMs: environment.durationMs, supportedStatements: environment.statements };
}

function connectedOutputPinForComponent(graph: CircuitGraph, componentId: string, pinId: string): string | undefined {
  const endpoint = { ownerId: componentId, pinId, kind: 'component-pin' as const };
  return connectedBoardPins(graph, endpoint).find((pin) => boardPinSupportsMode(graph.boardId, pin.id, 'output'))?.id;
}

function connectedButtonInputs(graph: CircuitGraph): Record<string, number> {
  const inputStates: Record<string, number> = {};
  graph.components.filter((component) => component.type === 'button').forEach((button) => {
    const outputPin = connectedOutputPinForComponent(graph, button.id, '1');
    if (outputPin) inputStates[outputPin] = button.properties.pressed === true ? 1 : 0;
  });
  return inputStates;
}

function ledOutputsForGraph(graph: CircuitGraph): Array<{ componentId: string; pin: string }> {
  return graph.components.filter((component) => component.type === 'led').flatMap((led) => {
    const outputPin = connectedOutputPinForComponent(graph, led.id, 'anode');
    const cathode = { ownerId: led.id, pinId: 'cathode', kind: 'component-pin' as const };
    return outputPin && endpointsShareCircuit(graph, cathode, { ownerId: 'board', pinId: 'GND', kind: 'board-pin' })
      ? [{ componentId: led.id, pin: outputPin }]
      : [];
  });
}

export function simulateArduinoLed(code: string, validation: CircuitValidation, graph?: CircuitGraph): SimulationState {
  if (!validation.valid) return { status: 'blocked', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Check and correct the circuit before running the sketch.', runtime: 'restricted Arduino educational runtime' };
  const inputStates = graph ? connectedButtonInputs(graph) : {};
  const execution = executeSupportedFirmware(code, { initialPinStates: inputStates });
  const targetPin = validation.configuredOutputPin || 'D8';
  const baseState = { pinStates: execution.pinStates, inputStates, servoAngles: execution.servoAngles, durationMs: execution.durationMs, runtime: 'restricted Arduino educational runtime' };
  if (execution.status === 'error') return { status: 'error', ledOn: false, ledBrightness: 0, ledStates: {}, serialOutput: execution.serialOutput, message: execution.error || 'The supported firmware runtime reported an error.', ...baseState };
  if (execution.pinModes[targetPin] !== 'OUTPUT') return { status: 'error', ledOn: false, ledBrightness: 0, ledStates: {}, serialOutput: execution.serialOutput, message: `The program did not configure the wired output ${targetPin} with pinMode(..., OUTPUT).`, ...baseState };
  if (execution.pinStates[targetPin] === undefined) return { status: 'error', ledOn: false, ledBrightness: 0, ledStates: {}, serialOutput: execution.serialOutput, message: `The program did not write to the wired output ${targetPin}.`, ...baseState };
  const rawOutput = execution.pinStates[targetPin] || 0;
  const ledBrightness = Math.max(0, Math.min(1, rawOutput <= 1 ? rawOutput : rawOutput / 255));
  const ledOn = ledBrightness > 0;
  const ledOutputs = graph ? ledOutputsForGraph(graph) : [{ componentId: 'led-1', pin: targetPin }];
  if (graph && !ledOutputs.some((output) => output.componentId === 'led-1')) ledOutputs.unshift({ componentId: 'led-1', pin: targetPin });
  const ledStates = Object.fromEntries(ledOutputs.map(({ componentId, pin }) => {
    const value = execution.pinStates[pin] || 0;
    return [componentId, Math.max(0, Math.min(1, value <= 1 ? value : value / 255))];
  }));
  const serialOutput = ledOutputs.length > 0
    ? [...ledOutputs.map(({ componentId, pin }) => `${componentId} ${pin} = ${Math.max(0, Math.min(1, (execution.pinStates[pin] || 0) <= 1 ? (execution.pinStates[pin] || 0) : (execution.pinStates[pin] || 0) / 255)) > 0 ? 'ON' : 'OFF'}`), ...execution.serialOutput, 'Runtime: restricted Arduino educational subset']
    : [`${targetPin} = ${ledOn ? 'HIGH' : 'LOW'}`, ...execution.serialOutput, 'Runtime: restricted Arduino educational subset'];
  return { status: 'running', ledOn, ledBrightness, ledStates, serialOutput, message: 'Simulation followed the validated circuit and executed the supported firmware statements. Button inputs, multiple LEDs and PWM use the constrained educational semantics.', ...baseState };
}

export function loadVirtualHardwareProject(userId = 'anonymous'): SavedVirtualHardwareProject | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${VIRTUAL_HARDWARE_STORAGE_KEY}.${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedVirtualHardwareProject>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.code !== 'string' || !parsed.graph || typeof parsed.graph !== 'object') return null;
    const graph = parsed.graph as Partial<CircuitGraph>;
    if (typeof graph.boardId !== 'string' || !(graph.boardId in BOARD_PROFILES) || !Array.isArray(graph.components) || !Array.isArray(graph.wires)) return null;
    const components = graph.components.filter((component): component is PlacedComponent => Boolean(component && typeof component.id === 'string' && typeof component.type === 'string' && Array.isArray(component.position) && component.position.length === 2));
    const wires = graph.wires.filter((wire): wire is CircuitWire => Boolean(wire && typeof wire.id === 'string' && wire.from && typeof wire.from === 'object' && wire.to && typeof wire.to === 'object'));
    if (components.length !== graph.components.length || wires.length !== graph.wires.length) return null;
    if (new Set(components.map((component) => component.id)).size !== components.length || new Set(wires.map((wire) => wire.id)).size !== wires.length) return null;
    const rawTopology = graph.breadboardTopology;
    const validTopology = rawTopology && Array.isArray(rawTopology.nodes) && rawTopology.nodes.every((node) => Boolean(node && typeof node.id === 'string' && Array.isArray(node.connectedHoleIds) && node.connectedHoleIds.every((holeId) => typeof holeId === 'string')));
    const normalized: CircuitGraph = {
      boardId: graph.boardId as BoardId,
      components,
      wires,
      selectedId: typeof graph.selectedId === 'string' ? graph.selectedId : null,
      breadboardTopology: validTopology ? rawTopology : createDefaultBreadboardTopology(),
      version: typeof graph.version === 'number' ? graph.version : VIRTUAL_HARDWARE_SCHEMA_VERSION,
    };
    if (normalized.components.some((component) => !(component.type in COMPONENT_DEFINITIONS)) || normalized.wires.some((wire) => !endpointExists(normalized, wire.from) || !endpointExists(normalized, wire.to))) return null;
    const completedSteps = Array.isArray(parsed.completedSteps)
      ? parsed.completedSteps.filter((step): step is string => typeof step === 'string' && ['build', 'validate', 'program', 'simulate'].includes(step))
      : [];
    return { ...parsed, graph: normalized, completedSteps, schemaVersion: parsed.schemaVersion || 1 } as SavedVirtualHardwareProject;
  } catch {
    return null;
  }
}

export function saveVirtualHardwareProject(userId = 'anonymous', project: SavedVirtualHardwareProject): void {
  if (typeof window === 'undefined') return;
  try {
    const normalized: SavedVirtualHardwareProject = {
      ...project,
      schemaVersion: VIRTUAL_HARDWARE_SCHEMA_VERSION,
      graph: { ...project.graph, breadboardTopology: project.graph.breadboardTopology || createDefaultBreadboardTopology(), version: VIRTUAL_HARDWARE_SCHEMA_VERSION },
    };
    const serialized = JSON.stringify(normalized);
    if (serialized.length > 512 * 1024) return;
    window.localStorage.setItem(`${VIRTUAL_HARDWARE_STORAGE_KEY}.${userId}`, serialized);
  } catch {
    // Browser storage is a convenience; a blocked store must not stop lab work.
  }
}
