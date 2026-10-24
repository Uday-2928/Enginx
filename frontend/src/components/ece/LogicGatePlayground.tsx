import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpen, CheckCircle2, Code2, Download, Link2, Plus, RotateCcw, Save, Trash2, Upload } from 'lucide-react';
import type { Challenge } from '../../types';
import {
  STARTER_CIRCUITS,
  createGateCircuit,
  evaluateCircuit,
  exportVerilog,
  gateInputCount,
  type GateType,
  type LogicCircuit,
  type LogicNode,
  toggleInput,
  truthTable,
} from '../../logic/gateSimulator';

interface LogicGatePlaygroundProps {
  onOpenLesson?: (lessonId: string) => void;
  onOpenChallenge?: (challenge: Challenge) => void;
  halfAdderChallenge?: Challenge;
}

const SAVE_KEY = 'enginx.ece.logic-playground';
const EDITABLE_GATES: Exclude<GateType, 'INPUT'>[] = ['NOT', 'AND', 'OR', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF'];

function cloneCircuit(circuit: LogicCircuit): LogicCircuit {
  return { ...circuit, nodes: circuit.nodes.map((node) => ({ ...node, inputs: [...node.inputs] })) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function nodePortY(node: LogicNode, index: number): number {
  const count = Math.max(1, gateInputCount(node.type));
  return node.y + ((index + 1) / (count + 1)) * 44;
}

export const LogicGatePlayground: React.FC<LogicGatePlaygroundProps> = ({ onOpenLesson, onOpenChallenge, halfAdderChallenge }) => {
  const [circuit, setCircuit] = useState<LogicCircuit>(() => STARTER_CIRCUITS.find((starter) => starter.id === 'and')?.create() || createGateCircuit('AND'));
  const [starterId, setStarterId] = useState('and');
  const [newGateType, setNewGateType] = useState<Exclude<GateType, 'INPUT'>>('AND');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [showVerilog, setShowVerilog] = useState(false);
  const evaluation = useMemo(() => evaluateCircuit(circuit), [circuit]);
  const rows = useMemo(() => truthTable(circuit), [circuit]);
  const verilog = useMemo(() => exportVerilog(circuit), [circuit]);
  const outputNodeIds = circuit.outputNodeIds?.length ? circuit.outputNodeIds : [circuit.outputNodeId];
  const outputNodes = outputNodeIds.map((id) => circuit.nodes.find((node) => node.id === id)).filter((node): node is LogicNode => Boolean(node));
  const inputNodes = circuit.nodes.filter((node) => node.type === 'INPUT');

  const loadStarter = (id: string) => {
    const starter = STARTER_CIRCUITS.find((candidate) => candidate.id === id);
    if (!starter) return;
    setCircuit(starter.create());
    setStarterId(id);
    setSavedMessage(null);
  };

  const updateNode = (nodeId: string, update: (node: LogicNode) => LogicNode) => {
    setCircuit((current) => ({ ...current, nodes: current.nodes.map((node) => node.id === nodeId ? update(node) : node) }));
    setSavedMessage(null);
  };

  const connectInput = (nodeId: string, inputIndex: number, sourceId: string) => {
    updateNode(nodeId, (node) => {
      const inputs = [...node.inputs];
      inputs[inputIndex] = sourceId;
      return { ...node, inputs };
    });
  };

  const addGate = () => {
    const id = `${newGateType.toLowerCase()}-${Date.now().toString(36)}`;
    const index = circuit.nodes.filter((node) => node.type !== 'INPUT').length;
    const node: LogicNode = {
      id,
      type: newGateType,
      label: newGateType,
      x: 120 + (index % 3) * 160,
      y: 30 + (index % 4) * 64,
      inputs: Array.from({ length: gateInputCount(newGateType) }, () => ''),
    };
    setCircuit((current) => ({ ...current, nodes: [...current.nodes, node], outputNodeId: node.id, outputNodeIds: [node.id] }));
    setSavedMessage(null);
  };

  const deleteNode = (nodeId: string) => {
    if (circuit.nodes.find((node) => node.id === nodeId)?.type === 'INPUT') return;
    const remaining = circuit.nodes.filter((node) => node.id !== nodeId).map((node) => ({
      ...node,
      inputs: node.inputs.map((input) => input === nodeId ? '' : input),
    }));
    const fallback = remaining.find((node) => node.type !== 'INPUT')?.id || remaining[0]?.id || '';
    const outputNodeIds = (circuit.outputNodeIds || [circuit.outputNodeId]).filter((id) => id !== nodeId);
    setCircuit({ ...circuit, nodes: remaining, outputNodeId: outputNodeIds[0] || fallback, outputNodeIds: outputNodeIds.length ? outputNodeIds : [fallback] });
    setSavedMessage(null);
  };

  const moveNode = (nodeId: string, dx: number, dy: number) => {
    updateNode(nodeId, (node) => ({ ...node, x: clamp(node.x + dx, 8, 520), y: clamp(node.y + dy, 8, 250) }));
  };

  const saveCircuit = () => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(circuit));
      setSavedMessage('Circuit saved in this browser.');
    } catch {
      setSavedMessage('This browser did not allow a local save.');
    }
  };

  const loadCircuit = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) {
        setSavedMessage('No saved circuit found in this browser.');
        return;
      }
      const parsed = JSON.parse(raw) as LogicCircuit;
      if (!parsed || !Array.isArray(parsed.nodes) || typeof parsed.outputNodeId !== 'string') throw new Error('invalid');
      setCircuit(cloneCircuit(parsed));
      setSavedMessage('Saved circuit loaded.');
    } catch {
      setSavedMessage('The saved circuit could not be loaded.');
    }
  };

  const resetCircuit = () => loadStarter(starterId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div>
          <p className="eyebrow">Functional digital logic lab</p>
          <h2 className="mt-1 text-xl font-extrabold text-slate-900">Logic-gate playground</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Toggle modeled inputs, connect supported gates, inspect the generated truth table and export the same logical structure as Verilog. This is a two-state logic model; it does not claim voltage, delay or electrical simulation.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenLesson && <button type="button" onClick={() => onOpenLesson('fundamentals-logic-gates')} className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><BookOpen className="h-4 w-4 text-teal-700" aria-hidden="true" />Related lesson</button>}
          {onOpenChallenge && halfAdderChallenge && <button type="button" onClick={() => onOpenChallenge(halfAdderChallenge)} className="focus-ring inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-enginx-primary px-3 text-xs font-bold text-white hover:bg-teal-700"><Code2 className="h-4 w-4" aria-hidden="true" />Open half-adder challenge</button>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Logic playground controls">
          <div>
            <label className="text-xs font-bold text-slate-700" htmlFor="starter-circuit">Starter circuit</label>
            <select id="starter-circuit" value={starterId} onChange={(event) => loadStarter(event.target.value)} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">
              {STARTER_CIRCUITS.map((starter) => <option key={starter.id} value={starter.id}>{starter.label}</option>)}
            </select>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-700">Add a gate</p>
            <div className="mt-1.5 flex gap-2">
              <select aria-label="Gate type to add" value={newGateType} onChange={(event) => setNewGateType(event.target.value as Exclude<GateType, 'INPUT'>)} className="focus-ring min-h-[42px] min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900">
                {EDITABLE_GATES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <button type="button" onClick={addGate} className="focus-ring inline-flex min-h-[42px] min-w-[42px] items-center justify-center rounded-lg border border-teal-300 bg-teal-50 text-teal-900 hover:bg-teal-100" aria-label="Add gate"><Plus className="h-4 w-4" aria-hidden="true" /></button>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-700">Input switches</p>
            <div className="mt-2 space-y-2">
              {inputNodes.map((node) => <button key={node.id} type="button" onClick={() => setCircuit(toggleInput(circuit, node.id))} aria-label={`Toggle input ${node.label}`} aria-pressed={node.value === 1} className={`focus-ring flex min-h-[42px] w-full items-center justify-between rounded-lg border px-3 text-left text-xs font-bold ${node.value === 1 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-slate-50 text-slate-700'}`}><span>{node.label}</span><span className="rounded-full bg-white px-2 py-1 font-mono">{node.value ?? 0}</span></button>)}
            </div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-bold text-slate-700">Observed output</p>
            <select aria-label="Observed output" value={circuit.outputNodeId} onChange={(event) => setCircuit((current) => ({ ...current, outputNodeId: event.target.value, outputNodeIds: [event.target.value] }))} className="focus-ring mt-1.5 min-h-[42px] w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900">
              {circuit.nodes.filter((node) => node.type !== 'INPUT').map((node) => <option key={node.id} value={node.id}>{node.label} · {node.id}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={saveCircuit} className="focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-teal-300 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100"><Save className="h-3.5 w-3.5" aria-hidden="true" />Save</button>
            <button type="button" onClick={loadCircuit} className="focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><Upload className="h-3.5 w-3.5" aria-hidden="true" />Load</button>
            <button type="button" onClick={resetCircuit} className="focus-ring inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Reset</button>
          </div>
          {savedMessage && <p className="text-xs font-semibold text-teal-800" role="status">{savedMessage}</p>}
        </aside>

        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-900 p-3 shadow-sm">
            <svg viewBox="0 0 620 330" className="min-h-[300px] min-w-[580px] w-full" role="img" aria-label="Interactive logic circuit diagram">
              <rect x="0" y="0" width="620" height="330" rx="14" fill="#0f172a" />
              {circuit.nodes.flatMap((node) => node.inputs.map((sourceId, index) => {
                const source = circuit.nodes.find((candidate) => candidate.id === sourceId);
                if (!source) return [];
                return <line key={`${source.id}-${node.id}-${index}`} x1={source.x + 88} y1={source.y + 22} x2={node.x} y2={nodePortY(node, index)} stroke={evaluation.values[source.id] === 1 ? '#2dd4bf' : '#64748b'} strokeWidth="3" />;
              }))}
              {circuit.nodes.map((node) => {
                const active = evaluation.values[node.id] === 1;
                const output = outputNodeIds.includes(node.id);
                return <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  <rect width="88" height="44" rx="9" fill={active ? '#134e4a' : '#1e293b'} stroke={output ? '#fbbf24' : active ? '#2dd4bf' : '#475569'} strokeWidth="2" />
                  <text x="44" y="19" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">{node.label}</text>
                  <text x="44" y="34" textAnchor="middle" fill={active ? '#99f6e4' : '#94a3b8'} fontSize="10">{active ? '1' : '0'} · {node.type}</text>
                </g>;
              })}
            </svg>
            <p className="px-2 pb-1 pt-2 text-[11px] text-slate-400">Wires are modeled by the source selectors below. Amber outlines mark observed output nodes.</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="eyebrow">Circuit model</p><h3 className="mt-1 text-base font-extrabold text-slate-900">{circuit.title}</h3></div>
              <div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${evaluation.errors.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>{evaluation.errors.length ? 'Needs connection' : 'Valid two-state model'}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">Output {evaluation.output}</span></div>
            </div>
            {evaluation.errors.length > 0 && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900" role="alert"><p className="font-bold">Connection checks</p><ul className="mt-1 list-disc space-y-1 pl-4">{evaluation.errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}
            <div className="mt-4 space-y-2">
              {circuit.nodes.filter((node) => node.type !== 'INPUT').map((node) => <div key={node.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-900">{node.label}</span><span className="rounded-full bg-white px-2 py-1 text-[10px] font-mono text-slate-500">{node.type}</span></div><div className="flex items-center gap-1"><button type="button" onClick={() => moveNode(node.id, -12, 0)} className="focus-ring rounded p-1 text-slate-500 hover:bg-white" aria-label={`Move ${node.label} left`}><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /></button><button type="button" onClick={() => moveNode(node.id, 12, 0)} className="focus-ring rounded p-1 text-slate-500 hover:bg-white" aria-label={`Move ${node.label} right`}><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button><button type="button" onClick={() => moveNode(node.id, 0, -12)} className="focus-ring rounded p-1 text-slate-500 hover:bg-white" aria-label={`Move ${node.label} up`}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button><button type="button" onClick={() => moveNode(node.id, 0, 12)} className="focus-ring rounded p-1 text-slate-500 hover:bg-white" aria-label={`Move ${node.label} down`}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button><button type="button" onClick={() => deleteNode(node.id)} className="focus-ring rounded p-1 text-rose-600 hover:bg-white" aria-label={`Delete ${node.label}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button></div></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{Array.from({ length: gateInputCount(node.type) }, (_, index) => <label key={index} className="text-[11px] font-bold text-slate-600">Input {index + 1}<select value={node.inputs[index] || ''} onChange={(event) => connectInput(node.id, index, event.target.value)} className="focus-ring mt-1 min-h-[36px] w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-800"><option value="">Disconnected</option>{circuit.nodes.filter((candidate) => candidate.id !== node.id).map((source) => <option key={source.id} value={source.id}>{source.label} · {source.id}</option>)}</select></label>)}</div></div>)}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Generated evidence</p><h3 className="mt-1 text-base font-extrabold text-slate-900">Truth table</h3></div><Link2 className="h-4 w-4 text-teal-700" aria-hidden="true" /></div>
              <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[260px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500">{inputNodes.map((node) => <th key={node.id} className="px-2 py-2">{node.label}</th>)}{outputNodes.map((node) => <th key={node.id} className="px-2 py-2">{node.label}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-slate-100 last:border-0">{inputNodes.map((node) => <td key={node.id} className="px-2 py-2 font-mono">{row.inputs[node.id]}</td>)}{outputNodes.map((node) => <td key={node.id} className={`px-2 py-2 font-mono font-bold ${row.outputs[node.id] === 1 ? 'text-emerald-700' : 'text-slate-500'}`}>{row.outputs[node.id] ?? 0}</td>)}</tr>)}</tbody></table></div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3"><div><p className="eyebrow">RTL bridge</p><h3 className="mt-1 text-base font-extrabold text-slate-900">Export corresponding Verilog</h3></div><button type="button" onClick={() => setShowVerilog((visible) => !visible)} className="focus-ring inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><Download className="h-3.5 w-3.5" aria-hidden="true" />{showVerilog ? 'Hide' : 'Show'}</button></div>
              {showVerilog ? <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] leading-5 text-slate-100">{verilog}</pre> : <p className="mt-3 text-xs leading-5 text-slate-600">The export is generated from the same nodes and connections shown above. Use the existing Verilog challenge workspace for actual backend evaluation when the evaluator is reachable.</p>}
            </div>
          </div>
          {outputNodes.length > 1 && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900" role="status"><CheckCircle2 className="mr-1 inline h-4 w-4" aria-hidden="true" />Outputs: {outputNodes.map((node) => `${node.label}=${evaluation.outputs[node.id] ?? 0}`).join(' · ')}</div>}
        </div>
      </div>
    </div>
  );
};
