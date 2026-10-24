import { describe, expect, it } from 'vitest';
import { createGateCircuit, createHalfAdderCircuit, evaluateCircuit, exportVerilog, truthTable, type LogicCircuit } from './gateSimulator';

describe('logic gate simulator', () => {
  it('evaluates the AND truth table from the circuit model', () => {
    const rows = truthTable(createGateCircuit('AND'));
    expect(rows.map((row) => row.output)).toEqual([0, 0, 0, 1]);
    expect(rows.every((row) => row.errors.length === 0)).toBe(true);
  });

  it('evaluates NOT and XOR/AND half-adder outputs', () => {
    const notRows = truthTable(createGateCircuit('NOT'));
    expect(notRows.map((row) => row.output)).toEqual([1, 0]);

    const halfAdder = createHalfAdderCircuit();
    const rows = truthTable(halfAdder);
    expect(rows.map((row) => [row.outputs.sumOutput, row.outputs.carryOutput])).toEqual([
      [0, 0],
      [1, 0],
      [1, 0],
      [0, 1],
    ]);
  });

  it('reports disconnected inputs and dependency cycles instead of inventing a result', () => {
    const disconnected: LogicCircuit = {
      ...createGateCircuit('AND'),
      nodes: createGateCircuit('AND').nodes.map((node) => node.id === 'gate' ? { ...node, inputs: ['inputA', 'missing'] } : node),
    };
    expect(evaluateCircuit(disconnected).errors).toContain('Missing node: missing');

    const cyclic: LogicCircuit = {
      ...createGateCircuit('BUF'),
      nodes: createGateCircuit('BUF').nodes.map((node) => node.id === 'gate' ? { ...node, inputs: ['output'] } : node),
    };
    expect(evaluateCircuit(cyclic).errors.some((error) => /cycle/i.test(error))).toBe(true);
  });

  it('exports the modeled half adder as readable Verilog', () => {
    const source = exportVerilog(createHalfAdderCircuit());
    expect(source).toContain('module circuit_export');
    expect(source).toContain('xor (sum');
    expect(source).toContain('and (carry');
    expect(source).toContain('assign sum = sum;');
    expect(source).toContain('assign carry = carry;');
  });

  it('keeps a selected gate output as a primitive in exported Verilog', () => {
    const circuit = createGateCircuit('AND');
    const source = exportVerilog({ ...circuit, outputNodeId: 'gate', outputNodeIds: ['gate'] });
    expect(source).toContain('and (gate, inputA, inputB);');
    expect(source).toContain('assign y = gate;');
  });
});
