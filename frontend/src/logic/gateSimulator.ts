export type LogicValue = 0 | 1;

export type GateType = 'INPUT' | 'NOT' | 'AND' | 'OR' | 'NAND' | 'NOR' | 'XOR' | 'XNOR' | 'BUF';

export interface LogicNode {
  id: string;
  type: GateType;
  label: string;
  x: number;
  y: number;
  inputs: string[];
  value?: LogicValue;
}

export interface LogicCircuit {
  id: string;
  title: string;
  nodes: LogicNode[];
  outputNodeId: string;
  outputNodeIds?: string[];
}

export interface LogicEvaluation {
  values: Record<string, LogicValue>;
  output: LogicValue;
  outputs: Record<string, LogicValue>;
  errors: string[];
}

const DEFAULT_POSITIONS: Record<string, { x: number; y: number }> = {
  inputA: { x: 24, y: 56 },
  inputB: { x: 24, y: 152 },
  gate: { x: 190, y: 104 },
  output: { x: 372, y: 104 },
};

export function createGateCircuit(type: Exclude<GateType, 'INPUT'> = 'AND'): LogicCircuit {
  const inputCount = type === 'NOT' || type === 'BUF' ? 1 : 2;
  const nodes: LogicNode[] = [
    { id: 'inputA', type: 'INPUT', label: 'A', ...DEFAULT_POSITIONS.inputA, inputs: [], value: 0 },
  ];
  if (inputCount === 2) nodes.push({ id: 'inputB', type: 'INPUT', label: 'B', ...DEFAULT_POSITIONS.inputB, inputs: [], value: 0 });
  nodes.push({ id: 'gate', type, label: type, ...DEFAULT_POSITIONS.gate, inputs: inputCount === 2 ? ['inputA', 'inputB'] : ['inputA'] });
  nodes.push({ id: 'output', type: 'BUF', label: 'Y', ...DEFAULT_POSITIONS.output, inputs: ['gate'] });
  return { id: `starter-${type.toLowerCase()}`, title: `${type} gate starter`, nodes, outputNodeId: 'output' };
}

export function createHalfAdderCircuit(): LogicCircuit {
  return {
    id: 'starter-half-adder',
    title: 'Half adder starter',
    nodes: [
      { id: 'inputA', type: 'INPUT', label: 'A', x: 24, y: 48, inputs: [], value: 0 },
      { id: 'inputB', type: 'INPUT', label: 'B', x: 24, y: 180, inputs: [], value: 0 },
      { id: 'sum', type: 'XOR', label: 'SUM', x: 205, y: 72, inputs: ['inputA', 'inputB'] },
      { id: 'carry', type: 'AND', label: 'CARRY', x: 205, y: 200, inputs: ['inputA', 'inputB'] },
      { id: 'sumOutput', type: 'BUF', label: 'SUM', x: 405, y: 72, inputs: ['sum'] },
      { id: 'carryOutput', type: 'BUF', label: 'CARRY', x: 405, y: 200, inputs: ['carry'] },
    ],
    outputNodeId: 'sumOutput',
    outputNodeIds: ['sumOutput', 'carryOutput'],
  };
}

export function gateInputCount(type: GateType): number {
  return type === 'INPUT' || type === 'NOT' || type === 'BUF' ? (type === 'INPUT' ? 0 : 1) : 2;
}

export function evaluateGate(type: GateType, inputs: LogicValue[]): LogicValue {
  if (type === 'INPUT') return inputs[0] === 1 ? 1 : 0;
  if (type === 'NOT') return inputs[0] === 1 ? 0 : 1;
  if (type === 'BUF') return inputs[0] === 1 ? 1 : 0;
  const a: LogicValue = inputs[0] === 1 ? 1 : 0;
  const b: LogicValue = inputs[1] === 1 ? 1 : 0;
  switch (type) {
    case 'AND': return (a === 1 && b === 1) ? 1 : 0;
    case 'OR': return (a === 1 || b === 1) ? 1 : 0;
    case 'NAND': return evaluateGate('AND', [a, b]) === 1 ? 0 : 1;
    case 'NOR': return evaluateGate('OR', [a, b]) === 1 ? 0 : 1;
    case 'XOR': return a === b ? 0 : 1;
    case 'XNOR': return a === b ? 1 : 0;
    default: return 0;
  }
}

export function evaluateCircuit(circuit: LogicCircuit): LogicEvaluation {
  const nodeMap = new Map(circuit.nodes.map((node) => [node.id, node]));
  const values: Record<string, LogicValue> = {};
  const errors: string[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): LogicValue => {
    if (visited.has(nodeId)) return values[nodeId] ?? 0;
    const node = nodeMap.get(nodeId);
    if (!node) {
      errors.push(`Missing node: ${nodeId}`);
      return 0;
    }
    if (visiting.has(nodeId)) {
      errors.push(`Dependency cycle detected at ${node.label}.`);
      return 0;
    }
    visiting.add(nodeId);
    let value: LogicValue;
    if (node.type === 'INPUT') {
      value = node.value === 1 ? 1 : 0;
    } else {
      const expectedInputs = gateInputCount(node.type);
      if (node.inputs.length !== expectedInputs || node.inputs.some((input) => !input)) {
        errors.push(`${node.label} needs ${expectedInputs} connected input${expectedInputs === 1 ? '' : 's'}.`);
      }
      value = evaluateGate(node.type, node.inputs.slice(0, expectedInputs).map(visit));
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    values[nodeId] = value;
    return value;
  };

  const outputNodeIds = circuit.outputNodeIds?.length ? circuit.outputNodeIds : [circuit.outputNodeId];
  const outputs: Record<string, LogicValue> = {};
  outputNodeIds.forEach((outputNodeId) => {
    outputs[outputNodeId] = visit(outputNodeId);
  });
  return { values, output: outputs[circuit.outputNodeId] ?? 0, outputs, errors: Array.from(new Set(errors)) };
}

export function truthTable(circuit: LogicCircuit): Array<{ inputs: Record<string, LogicValue>; output: LogicValue; outputs: Record<string, LogicValue>; errors: string[] }> {
  const inputs = circuit.nodes.filter((node) => node.type === 'INPUT');
  return Array.from({ length: 2 ** inputs.length }, (_, row) => {
    const inputValues: Record<string, LogicValue> = {};
    inputs.forEach((node, index) => {
      inputValues[node.id] = ((row >> (inputs.length - index - 1)) & 1) as LogicValue;
    });
    const rowCircuit = {
      ...circuit,
      nodes: circuit.nodes.map((node) => node.type === 'INPUT' ? { ...node, value: inputValues[node.id] } : node),
    };
    const result = evaluateCircuit(rowCircuit);
    return { inputs: inputValues, output: result.output, outputs: result.outputs, errors: result.errors };
  });
}

export function toggleInput(circuit: LogicCircuit, nodeId: string): LogicCircuit {
  return {
    ...circuit,
    nodes: circuit.nodes.map((node) => node.id === nodeId && node.type === 'INPUT' ? { ...node, value: node.value === 1 ? 0 : 1 } : node),
  };
}

export function exportVerilog(circuit: LogicCircuit): string {
  const inputs = circuit.nodes.filter((node) => node.type === 'INPUT');
  const outputNodeIds = circuit.outputNodeIds?.length ? circuit.outputNodeIds : [circuit.outputNodeId];
  const outputNodes = outputNodeIds.map((id) => circuit.nodes.find((node) => node.id === id)).filter((node): node is LogicNode => Boolean(node));
  const declarations = circuit.nodes.filter((node) => node.type !== 'INPUT' && !(outputNodeIds.includes(node.id) && node.type === 'BUF')).map((node) => `    wire ${node.id};`);
  const statements = circuit.nodes.filter((node) => node.type !== 'INPUT' && !(outputNodeIds.includes(node.id) && node.type === 'BUF')).map((node) => {
    const args = node.inputs.join(', ');
    const primitive = node.type.toLowerCase();
    return `    ${primitive} (${node.id}, ${args});`;
  });
  const outputs = outputNodes.length > 1
    ? outputNodes.map((node) => `output wire ${node.label.toLowerCase()}`).join(', ')
    : 'output wire y';
  const assignments = outputNodes.map((node) => {
    const source = node.type === 'BUF' ? (node.inputs[0] || node.id) : node.id;
    const outputName = outputNodes.length > 1 ? node.label.toLowerCase() : 'y';
    return `    assign ${outputName} = ${source};`;
  });
  return [
    `module circuit_export(${inputs.map((node) => `input wire ${node.label.toLowerCase()}`).concat(outputs).join(', ')});`,
    ...declarations,
    ...statements,
    ...assignments,
    'endmodule',
  ].join('\n');
}

export const STARTER_CIRCUITS: Array<{ id: string; label: string; create: () => LogicCircuit }> = [
  { id: 'not', label: 'NOT gate', create: () => createGateCircuit('NOT') },
  { id: 'and', label: 'AND gate', create: () => createGateCircuit('AND') },
  { id: 'or', label: 'OR gate', create: () => createGateCircuit('OR') },
  { id: 'nand', label: 'NAND gate', create: () => createGateCircuit('NAND') },
  { id: 'nor', label: 'NOR gate', create: () => createGateCircuit('NOR') },
  { id: 'xor', label: 'XOR gate', create: () => createGateCircuit('XOR') },
  { id: 'xnor', label: 'XNOR gate', create: () => createGateCircuit('XNOR') },
  { id: 'half-adder', label: 'Half adder', create: createHalfAdderCircuit },
];
