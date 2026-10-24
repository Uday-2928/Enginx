import React, { useEffect, useState } from 'react';
import { AlertTriangle, Box, CheckCircle2, ChevronLeft, CircleDot, Cpu, Keyboard, Play, RotateCcw, Save, Trash2, Zap } from 'lucide-react';
import type { BoardId, CircuitEndpoint, CircuitGraph, ComponentType, SimulationState } from '../../data/virtualHardwareLab';
import {
  BOARD_PROFILES,
  COMPONENT_DEFINITIONS,
  LIGHT_LED_PROJECT,
  addComponent,
  addWire,
  boardProfile,
  createStarterCircuit,
  loadVirtualHardwareProject,
  moveComponent,
  removeComponent,
  removeWire,
  reconnectWire,
  rotateComponent,
  saveVirtualHardwareProject,
  simulateArduinoLed,
  updateComponentProperties,
  validateCircuit,
} from '../../data/virtualHardwareLab';
import { VirtualHardwareScene } from './VirtualHardwareScene';
import {
  createVirtualHardwareProject,
  deleteVirtualHardwareProject,
  duplicateVirtualHardwareProject,
  fetchVirtualHardwareProject,
  fetchVirtualHardwareProjects,
  getAuthSession,
  updateVirtualHardwareProject,
} from '../../services/api';
import type { VirtualHardwareProjectSummary } from '../../types';

interface VirtualHardwareLabProps {
  userId?: string;
  onBack?: () => void;
}

type LabStage = 'build' | 'validate' | 'program' | 'simulate';
const LAB_STAGES: LabStage[] = ['build', 'validate', 'program', 'simulate'];

function isLabStage(value: unknown): value is LabStage {
  return typeof value === 'string' && LAB_STAGES.includes(value as LabStage);
}

function completedStepsFor(stage: LabStage): string[] {
  if (stage === 'simulate') return [...LAB_STAGES];
  const index = LAB_STAGES.indexOf(stage);
  return index <= 0 ? [] : LAB_STAGES.slice(0, index);
}

const BOARD_OPTIONS: BoardId[] = ['arduino-uno-r3', 'esp32-devkit-v1', 'raspberry-pi-4b', 'raspberry-pi-pico'];
const TOOLBOX: ComponentType[] = ['breadboard', 'led', 'resistor', 'button', 'potentiometer', 'servo', 'buzzer', 'ldr', 'dht11', 'lcd1602'];
const WIRE_COLORS: Record<string, string> = { signal: '#0f766e', power: '#dc2626', ground: '#111827', custom: '#7c3aed' };

export const VirtualHardwareLab: React.FC<VirtualHardwareLabProps> = ({ userId = 'anonymous', onBack }) => {
  const [boardId, setBoardId] = useState<BoardId>('arduino-uno-r3');
  const [graph, setGraph] = useState<CircuitGraph>(() => createStarterCircuit());
  const [code, setCode] = useState(LIGHT_LED_PROJECT.starterCode);
  const [stage, setStage] = useState<LabStage>('build');
  const [wireStart, setWireStart] = useState<CircuitEndpoint | null>(null);
  const [reconnectingWireId, setReconnectingWireId] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [validation, setValidation] = useState(() => validateCircuit(createStarterCircuit()));
  const [simulation, setSimulation] = useState<SimulationState>({ status: 'idle', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Build and validate the circuit before running code.' });
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('Start by selecting connection points in the workbench.');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectTitle, setProjectTitle] = useState('Light an LED bench');
  const [projectDescription, setProjectDescription] = useState('Virtual Hardware Lab circuit and supported firmware.');
  const [projects, setProjects] = useState<VirtualHardwareProjectSummary[]>([]);
  const [persistenceMode, setPersistenceMode] = useState<'server' | 'local' | 'offline'>('offline');
  const [persistenceBusy, setPersistenceBusy] = useState(false);

  useEffect(() => {
    const restored = loadVirtualHardwareProject(userId);
    if (restored) {
      setGraph(restored.graph);
      setBoardId(restored.graph.boardId);
      setCode(restored.code || LIGHT_LED_PROJECT.starterCode);
      setProjectTitle(restored.title || 'Light an LED bench');
      setProjectDescription(restored.description || 'Virtual Hardware Lab circuit and supported firmware.');
      setStage(isLabStage(restored.guidedStep) ? restored.guidedStep : 'build');
      setValidation(validateCircuit(restored.graph));
      setSimulation({ status: 'idle', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Restored project. Run the supported program to refresh outputs.' });
      setSaved(true);
      setMessage('Restored your saved virtual workbench.');
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    if (userId === 'anonymous' || !getAuthSession()) {
      setPersistenceMode('local');
      return () => { cancelled = true; };
    }
    setPersistenceBusy(true);
    fetchVirtualHardwareProjects().then((items) => {
      if (cancelled) return;
      setProjects(items);
      setPersistenceMode('server');
      setPersistenceBusy(false);
    }).catch(() => {
      if (cancelled) return;
      setPersistenceMode('local');
      setPersistenceBusy(false);
      setMessage('Server project list unavailable. Local device storage remains available.');
    });
    return () => { cancelled = true; };
  }, [userId]);

  const board = boardProfile(boardId);

  const selectBoard = (nextBoard: BoardId) => {
    setBoardId(nextBoard);
    setGraph((current) => ({ ...current, boardId: nextBoard, wires: [], selectedId: null }));
    setWireStart(null);
    setReconnectingWireId(null);
    setValidation(validateCircuit({ ...graph, boardId: nextBoard, wires: [] }));
    setSimulation({ status: 'idle', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Board changed. Re-check the circuit using the new pin profile.' });
    setStage('build');
    setMessage(`${BOARD_PROFILES[nextBoard].name} selected. Existing wires were cleared to prevent invalid pin mappings.`);
  };

  const updateGraph = (next: CircuitGraph) => {
    setGraph(next);
    setSaved(false);
    setValidation(validateCircuit(next));
  };

  const beginWire = (endpoint: CircuitEndpoint) => {
    if (wireStart && wireStart.ownerId === endpoint.ownerId && wireStart.pinId === endpoint.pinId) {
      setWireStart(null);
      setMessage('Wire cancelled. Select a different endpoint to start again.');
      return;
    }
    if (!wireStart) {
      setWireStart(endpoint);
      setMessage(`Wire started at ${endpoint.pinId}. Select a compatible destination.`);
      return;
    }
    const next = addWire(graph, wireStart, endpoint);
    if (next.wires.length === graph.wires.length) {
      setMessage('That connection already exists or uses the same endpoint.');
    } else {
      updateGraph(next);
      setMessage(`Connected ${wireStart.pinId} to ${endpoint.pinId}.`);
    }
    setWireStart(null);
  };

  const beginReconnect = (wireId: string) => {
    const wire = graph.wires.find((candidate) => candidate.id === wireId);
    if (!wire) return;
    setReconnectingWireId(wireId);
    setWireStart(wire.from);
    setSelectedPin(`${wire.from.ownerId}:${wire.from.pinId}`);
    setMessage(`Reconnect started from ${wire.from.pinId}. Select the new destination endpoint.`);
  };

  const handleSelectPin = (endpoint: CircuitEndpoint) => {
    if (endpoint.ownerId === '__cancel__') {
      setWireStart(null);
      setReconnectingWireId(null);
      setSelectedPin(null);
      return;
    }
    setSelectedPin(`${endpoint.ownerId}:${endpoint.pinId}`);
    if (reconnectingWireId && wireStart) {
      const next = reconnectWire(graph, reconnectingWireId, wireStart, endpoint);
      if (next === graph) {
        setMessage('That endpoint cannot replace the existing wire. Choose a free compatible destination.');
      } else {
        updateGraph(next);
        setMessage(`Reconnected ${wireStart.pinId} to ${endpoint.pinId}.`);
      }
      setWireStart(null);
      setReconnectingWireId(null);
      return;
    }
    beginWire(endpoint);
  };

  const handleDeleteWire = (wireId: string) => {
    updateGraph(removeWire(graph, wireId));
    if (reconnectingWireId === wireId) {
      setWireStart(null);
      setReconnectingWireId(null);
    }
  };

  const checkConnections = () => {
    const result = validateCircuit(graph);
    setValidation(result);
    setStage(result.valid ? 'program' : 'validate');
    setMessage(result.valid ? 'Circuit validated. Continue to the programming stage.' : 'Circuit still needs corrections. Follow the highlighted checks.');
  };

  const runSimulation = () => {
    const result = validateCircuit(graph);
    setValidation(result);
    if (!result.valid) {
      setStage('validate');
      setSimulation({ status: 'blocked', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Simulation blocked until required connections pass validation.' });
      setMessage('Simulation did not run because the circuit is not valid yet.');
      return;
    }
    setStage('simulate');
    setSimulation(simulateArduinoLed(code, result, graph));
    setMessage('Simulation used the validated graph and the supported digital I/O sketch subset.');
  };

  const toggleButton = (componentId: string) => {
    const component = graph.components.find((candidate) => candidate.id === componentId && candidate.type === 'button');
    if (!component) return;
    const pressed = component.properties.pressed === true;
    updateGraph(updateComponentProperties(graph, componentId, { pressed: !pressed }));
    setMessage(`${pressed ? 'Released' : 'Pressed'} ${componentId}. Run the supported sketch to sample the input.`);
  };

  const save = () => {
    const completedSteps = completedStepsFor(stage);
    const simulationConfig = { runtime: simulation.runtime || 'restricted Arduino educational runtime' };
    const localProject = { graph, code, savedAt: new Date().toISOString(), title: projectTitle, description: projectDescription, guidedStep: stage, completedSteps, simulationConfig };
    saveVirtualHardwareProject(userId, localProject);
    if (userId === 'anonymous' || !getAuthSession()) {
      setSaved(true);
      setPersistenceMode('local');
      setMessage('Saved locally on this device. Sign in to sync projects across sessions.');
      return;
    }
    setPersistenceBusy(true);
    const request = {
      title: projectTitle,
      description: projectDescription,
      board_profile: graph.boardId,
      project_version: graph.version || 2,
      graph: graph as unknown as Record<string, unknown>,
      code,
      guided_step: stage,
      completed_steps: completedSteps,
      simulation_config: simulationConfig,
    };
    const operation = projectId ? updateVirtualHardwareProject(projectId, request) : createVirtualHardwareProject(request);
    operation.then((project) => {
      setProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDescription(project.description);
      setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      setSaved(true);
      setPersistenceMode('server');
      setPersistenceBusy(false);
      setMessage('Project saved to your authenticated EnginX account. A local fallback was also updated.');
    }).catch(() => {
      setSaved(true);
      setPersistenceMode('local');
      setPersistenceBusy(false);
      setMessage('Server save unavailable; saved locally on this device instead.');
    });
  };

  const renameProject = () => {
    const title = projectTitle.trim();
    if (!projectId) return;
    if (!title) {
      setMessage('Project name cannot be empty.');
      return;
    }
    setPersistenceBusy(true);
    updateVirtualHardwareProject(projectId, { title }).then((project) => {
      setProjectTitle(project.title);
      setProjectDescription(project.description);
      setProjects((current) => current.map((item) => item.id === project.id ? project : item));
      setSaved(true);
      setPersistenceMode('server');
      setPersistenceBusy(false);
      setMessage(`Renamed project to ${project.title}.`);
    }).catch(() => {
      setPersistenceBusy(false);
      setMessage('Server rename unavailable; save the project again when the account is reachable.');
    });
  };

  const loadProject = (id: string) => {
    setPersistenceBusy(true);
    fetchVirtualHardwareProject(id).then((project) => {
      const restoredGraph = project.graph as unknown as CircuitGraph;
      setProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDescription(project.description);
      setGraph(restoredGraph);
      setBoardId(restoredGraph.boardId);
      setCode(project.code);
      setStage(isLabStage(project.guided_step) ? project.guided_step : 'build');
      setValidation(validateCircuit(restoredGraph));
      saveVirtualHardwareProject(userId, {
        graph: restoredGraph,
        code: project.code,
        savedAt: project.updated_at,
        title: project.title,
        description: project.description,
        guidedStep: isLabStage(project.guided_step) ? project.guided_step : 'build',
        completedSteps: project.completed_steps,
        simulationConfig: project.simulation_config,
      });
      setSimulation({ status: 'idle', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Project restored. Run the supported program to refresh outputs.' });
      setSaved(true);
      setPersistenceMode('server');
      setPersistenceBusy(false);
      setMessage(`Loaded ${project.title} from your account.`);
    }).catch(() => {
      setPersistenceBusy(false);
      setMessage('Project could not be loaded from the server.');
    });
  };

  const duplicateProject = () => {
    if (!projectId) return;
    setPersistenceBusy(true);
    duplicateVirtualHardwareProject(projectId).then((project) => {
      setProjectId(project.id);
      setProjectTitle(project.title);
      setProjectDescription(project.description);
      setProjects((current) => [project, ...current]);
      setPersistenceBusy(false);
      setMessage(`Duplicated as ${project.title}.`);
    }).catch(() => {
      setPersistenceBusy(false);
      setMessage('Project duplication failed.');
    });
  };

  const deleteProject = () => {
    if (!projectId) return;
    setPersistenceBusy(true);
    deleteVirtualHardwareProject(projectId).then(() => {
      setProjects((current) => current.filter((item) => item.id !== projectId));
      setProjectId(null);
      setPersistenceBusy(false);
      setMessage('Server project deleted. The local fallback remains until you reset it.');
    }).catch(() => {
      setPersistenceBusy(false);
      setMessage('Project deletion failed.');
    });
  };

  const reset = () => {
    const next = createStarterCircuit(boardId);
    setGraph(next);
    setCode(LIGHT_LED_PROJECT.starterCode);
    setValidation(validateCircuit(next));
    setSimulation({ status: 'idle', ledOn: false, ledBrightness: 0, serialOutput: [], message: 'Starter circuit restored.' });
    setStage('build');
    setWireStart(null);
    setReconnectingWireId(null);
    setSelectedPin(null);
    setSaved(false);
    setMessage('Starter circuit restored. No connection is assumed complete.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-start gap-3">
          {onBack && <button type="button" onClick={onBack} className="focus-ring mt-1 flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-teal-300" aria-label="Back to ECE Hub"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>}
          <div>
            <p className="eyebrow">ECE Engineering Hub · Virtual Hardware Lab</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Build circuits. Connect hardware. Write firmware. See it work.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">A connection-first desktop lab. The 3D workbench is derived from one circuit graph shared by pointer, touch-friendly click, keyboard and validation interactions.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
           <button type="button" onClick={save} disabled={persistenceBusy} className="focus-ring inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-900 hover:bg-teal-100 disabled:opacity-50"><Save className="h-4 w-4" aria-hidden="true" />{saved ? 'Saved' : persistenceBusy ? 'Saving…' : 'Save project'}</button>
          <button type="button" onClick={reset} className="focus-ring inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 hover:border-teal-300"><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset starter</button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Virtual Hardware Lab project persistence">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[220px] flex-1 text-xs font-bold text-slate-700">Project name<input value={projectTitle} onChange={(event) => { setProjectTitle(event.target.value); setSaved(false); }} maxLength={255} className="focus-ring mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 px-3 text-sm font-normal text-slate-900" /></label>
          <label className="min-w-[280px] flex-[2] text-xs font-bold text-slate-700">Description<textarea value={projectDescription} onChange={(event) => { setProjectDescription(event.target.value); setSaved(false); }} maxLength={2000} rows={1} className="focus-ring mt-1 min-h-[40px] w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900" /></label>
          <span className={`rounded-full px-2.5 py-2 text-[10px] font-bold uppercase tracking-wide ${persistenceMode === 'server' ? 'bg-emerald-100 text-emerald-800' : persistenceMode === 'local' ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{persistenceMode === 'server' ? 'Account synced' : persistenceMode === 'local' ? 'Local fallback' : 'Offline'}</span>
           {projectId && <><button type="button" onClick={renameProject} disabled={persistenceBusy} className="focus-ring min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">Rename</button><button type="button" onClick={duplicateProject} disabled={persistenceBusy} className="focus-ring min-h-[40px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 disabled:opacity-50">Duplicate</button><button type="button" onClick={deleteProject} disabled={persistenceBusy} className="focus-ring min-h-[40px] rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 disabled:opacity-50">Delete server copy</button></>}
        </div>
        {projects.length > 0 && <label className="mt-3 block max-w-md text-xs font-bold text-slate-700">Load an account project<select value={projectId || ''} onChange={(event) => event.target.value && loadProject(event.target.value)} className="focus-ring mt-1 min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-normal text-slate-900"><option value="">Choose a saved project…</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.title} · {new Date(project.updated_at).toLocaleString()}</option>)}</select></label>}
        <p className="mt-2 text-[11px] leading-5 text-slate-500">{persistenceMode === 'server' ? 'Authenticated saves use the EnginX backend and are scoped to your account.' : 'This is not a server save yet; the local fallback is explicitly labeled.'}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-4" aria-label="Virtual Hardware Lab progress">
         {LAB_STAGES.map((item, index) => {
          const active = item === stage;
          const complete = item === 'validate' ? validation.valid : item === 'simulate' ? simulation.status === 'running' : index < ['build', 'validate', 'program', 'simulate'].indexOf(stage);
          return <div key={item} className={`rounded-xl border p-3 ${active ? 'border-teal-300 bg-teal-50' : complete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-600 text-white' : active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{complete ? '✓' : index + 1}</span><span className="text-sm font-bold capitalize text-slate-900">{item}</span></div><p className="mt-2 text-[11px] leading-5 text-slate-500">{item === 'build' ? 'Place and connect components.' : item === 'validate' ? 'Check the real graph.' : item === 'program' ? 'Edit supported firmware.' : 'Run and observe state.'}</p></div>;
        })}
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950" role="status">
        <p className="font-bold">Honest runtime boundary</p>
        <p className="mt-1">This first vertical slice provides a functioning connection graph, LED validation and a constrained Arduino digital I/O interpreter. It does not claim arbitrary Arduino/ESP32/Raspberry Pi compilation, physical hardware access or VR support.</p>
      </section>

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(480px,1fr)_360px]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" aria-label="Virtual hardware toolbox">
          <div><p className="eyebrow">1 · Select board</p><label className="mt-2 block text-xs font-bold text-slate-700"><span className="sr-only">Board profile</span><select value={boardId} onChange={(event) => selectBoard(event.target.value as BoardId)} className="focus-ring min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900">{BOARD_OPTIONS.map((id) => <option key={id} value={id}>{BOARD_PROFILES[id].name}</option>)}</select></label><p className="mt-2 text-[11px] leading-5 text-slate-500">{board.family} · {board.logicVoltage} V logic · {board.language.toUpperCase()}</p></div>
           <div className="border-t border-slate-100 pt-4"><p className="eyebrow">2 · Place components</p><div className="mt-2 space-y-1.5">{TOOLBOX.map((type) => <button key={type} type="button" aria-label={`Add ${COMPONENT_DEFINITIONS[type].label}`} onClick={() => { updateGraph(addComponent(graph, type)); setMessage(`${COMPONENT_DEFINITIONS[type].label} placed. Select its pins to begin a wire.`); }} className="focus-ring flex min-h-[40px] w-full items-center gap-2 rounded-lg border border-slate-200 px-2.5 text-left text-xs font-semibold text-slate-700 hover:border-teal-300 hover:bg-teal-50"><Box className="h-3.5 w-3.5 text-teal-700" aria-hidden="true" />{COMPONENT_DEFINITIONS[type].label}</button>)}</div></div>
          <div className="border-t border-slate-100 pt-4"><p className="eyebrow">Board notes</p><ul className="mt-2 space-y-2 text-[11px] leading-5 text-slate-600">{board.notes.map((note) => <li key={note}>• {note}</li>)}</ul></div>
        </aside>

        <section className="min-w-0 space-y-3" aria-label="3D virtual electronics workbench">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="eyebrow">Interactive workbench</p><p className="mt-1 text-sm font-bold text-slate-900">{board.name} · {graph.components.length} components · {graph.wires.length} wires</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${wireStart ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>{wireStart ? `Wire from ${wireStart.pinId}` : 'Select a pin to wire'}</span></div>
            <VirtualHardwareScene boardId={boardId} graph={graph} selectedPin={selectedPin} wireStart={wireStart} ledOn={simulation.ledOn} ledStates={simulation.ledStates || {}} servoAngles={simulation.servoAngles || {}} onSelectPin={handleSelectPin} onSelectComponent={(id) => updateGraph({ ...graph, selectedId: id })} onDeleteComponent={(id) => updateGraph(removeComponent(graph, id))} onDeleteWire={handleDeleteWire} onReconnectWire={beginReconnect} onMoveComponent={(id, position) => updateGraph(moveComponent(graph, id, position))} onRotateComponent={(id) => updateGraph(rotateComponent(graph, id))} onToggleButton={toggleButton} />
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs"><Keyboard className="h-4 w-4 text-teal-700" aria-hidden="true" /><span className="font-semibold text-slate-700">Keyboard: Tab pins · Enter starts/finishes wire · Escape cancels · Delete removes selected component.</span><span className="ml-auto text-slate-500">Touch: tap-to-start / tap-to-finish</span></div>
        </section>

        <aside className="space-y-4" aria-label="Circuit validation and simulation panel">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Guided project</p><h2 className="mt-1 text-base font-extrabold text-slate-900">{LIGHT_LED_PROJECT.title}</h2></div><Zap className="h-5 w-5 text-amber-600" aria-hidden="true" /></div><p className="mt-2 text-xs leading-5 text-slate-600">{LIGHT_LED_PROJECT.subtitle}</p><ol className="mt-3 space-y-2 text-xs text-slate-700">{LIGHT_LED_PROJECT.objectives.map((objective, index) => <li key={objective} className="flex gap-2"><span className="font-mono text-teal-700">{index + 1}.</span><span>{objective}</span></li>)}</ol></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="eyebrow">3 · Validate</p><h2 className="mt-1 text-base font-extrabold text-slate-900">Connection checks</h2></div><button type="button" onClick={checkConnections} className="focus-ring min-h-[40px] rounded-lg bg-enginx-primary px-3 text-xs font-bold text-white hover:bg-teal-700">Check connections</button></div><div className="mt-3 space-y-2">{validation.passedChecks.map((item) => <p key={item} className="flex gap-2 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />{item}</p>)}{validation.issues.map((issue) => <p key={issue.id} className={`flex gap-2 text-xs ${issue.severity === 'error' ? 'text-rose-800' : 'text-amber-800'}`}><AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />{issue.message}</p>)}{validation.issues.length === 0 && <p className="text-xs text-slate-500">No checks have failed. Add or remove a wire to explore validation.</p>}</div></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="eyebrow">4 · Program</p><h2 className="mt-1 text-base font-extrabold text-slate-900">Arduino-compatible sketch</h2></div><Cpu className="h-5 w-5 text-teal-700" aria-hidden="true" /></div><textarea value={code} onChange={(event) => { setCode(event.target.value); setSaved(false); }} spellCheck={false} aria-label="Virtual hardware firmware editor" className="focus-ring mt-3 min-h-48 w-full resize-y rounded-xl border border-slate-200 bg-slate-950 p-3 font-mono text-xs leading-5 text-slate-100" /><div className="mt-2 flex gap-2"><button type="button" onClick={runSimulation} disabled={!validation.valid} className="focus-ring inline-flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg bg-enginx-cta px-3 text-xs font-bold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"><Play className="h-4 w-4" aria-hidden="true" />Run simulation</button><button type="button" onClick={() => setCode(LIGHT_LED_PROJECT.starterCode)} className="focus-ring min-h-[42px] rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:border-teal-300">Starter</button></div><p className="mt-2 text-[11px] leading-5 text-slate-500">{LIGHT_LED_PROJECT.runtimeNote}</p></section>

          <section className={`rounded-2xl border p-4 shadow-sm ${simulation.status === 'running' ? 'border-emerald-200 bg-emerald-50' : simulation.status === 'blocked' || simulation.status === 'error' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'}`} aria-live="polite"><div className="flex items-center justify-between gap-2"><div><p className="eyebrow">5 · Observe</p><h2 className="mt-1 text-base font-extrabold text-slate-900">Simulation console</h2></div><CircleDot className={`h-5 w-5 ${simulation.ledOn ? 'text-red-500' : 'text-slate-400'}`} aria-hidden="true" /></div><p className="mt-2 text-xs leading-5 text-slate-700">{simulation.message}</p>{simulation.serialOutput.length > 0 && <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-5 text-emerald-300">{simulation.serialOutput.join('\n')}</pre>}<div className="mt-3 flex items-center justify-between rounded-lg border border-white/70 bg-white/60 p-3 text-xs"><span className="font-semibold text-slate-700">Virtual LED output</span><span className={`font-bold ${simulation.ledOn ? 'text-red-600' : 'text-slate-500'}`}>{simulation.ledOn ? 'ON · D8 HIGH' : 'OFF'}</span></div></section>
        </aside>
      </div>
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600" role="status">{message}</p>
    </div>
  );
};

interface WorkbenchSceneProps {
  boardId: BoardId;
  graph: CircuitGraph;
  selectedPin: string | null;
  wireStart: CircuitEndpoint | null;
  ledOn: boolean;
  onSelectPin: (endpoint: CircuitEndpoint) => void;
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire: (id: string) => void;
}

const WorkbenchScene: React.FC<WorkbenchSceneProps> = ({ boardId, graph, selectedPin, wireStart, ledOn, onSelectPin, onSelectComponent, onDeleteComponent, onDeleteWire }) => {
  const board = boardProfile(boardId);
  const boardPins = board.pins;
  const positionForEndpoint = (endpoint: CircuitEndpoint): [number, number] => {
    if (endpoint.ownerId === 'board') return boardPins.find((pin) => pin.id === endpoint.pinId)?.position || [0, 0];
    const component = graph.components.find((item) => item.id === endpoint.ownerId);
    const pin = component ? COMPONENT_DEFINITIONS[component.type].pins.find((item) => item.id === endpoint.pinId) : undefined;
    return component && pin ? [component.position[0] + pin.position[0], component.position[1] + pin.position[1]] : [0, 0];
  };
  const scaleX = (x: number) => 50 + x * 5.7;
  const scaleY = (y: number) => 50 - y * 8;
  return <div className="relative min-h-[500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-inner" tabIndex={0} onKeyDown={(event) => { if (event.key === 'Escape') onSelectPin({ ownerId: '__cancel__', pinId: '__cancel__', kind: 'board-pin' }); if ((event.key === 'Delete' || event.key === 'Backspace') && graph.selectedId) { event.preventDefault(); onDeleteComponent(graph.selectedId); } }}>
    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', backgroundSize: '28px 28px' }} aria-hidden="true" />
    <div className="relative h-[470px] min-w-[620px]">
      <div className="absolute left-[25%] top-[12%] h-[220px] w-[50%] rounded-2xl border-2 border-slate-500 bg-slate-800 p-4 shadow-xl"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300"><span>{board.name}</span><span>{board.logicVoltage}V logic</span></div><div className="mt-5 grid grid-cols-7 gap-2"><span className="col-span-7 h-8 rounded bg-slate-700" /><span className="col-span-3 h-4 rounded bg-slate-700" /><span className="col-span-1 h-4 rounded bg-slate-900" /><span className="col-span-3 h-4 rounded bg-slate-700" /></div><div className="absolute inset-x-3 bottom-2 text-[9px] text-slate-400">Pin labels are interactive endpoints. Use the toolbox to add components, then wire the graph.</div></div>
      <div className="absolute left-[7%] top-[64%] h-[130px] w-[86%] rounded-xl border-2 border-slate-500 bg-slate-100 p-3 shadow-lg"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"><span>Virtual solderless breadboard</span><span>Grouped rows · center channel</span></div><div className="mt-4 grid grid-cols-20 gap-1 opacity-80">{Array.from({ length: 100 }, (_, index) => <span key={index} className={`h-2 w-2 rounded-full ${index % 11 === 0 ? 'bg-red-500' : 'bg-slate-400'}`} />)}</div></div>
      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Circuit wire visualization">{graph.wires.map((wire) => { const from = positionForEndpoint(wire.from); const to = positionForEndpoint(wire.to); return <line key={wire.id} x1={scaleX(from[0])} y1={scaleY(from[1])} x2={scaleX(to[0])} y2={scaleY(to[1])} stroke={WIRE_COLORS[wire.color]} strokeWidth="0.7" strokeLinecap="round" />; })}{wireStart && <line x1={scaleX(positionForEndpoint(wireStart)[0])} y1={scaleY(positionForEndpoint(wireStart)[1])} x2={scaleX(positionForEndpoint(wireStart)[0]) + 4} y2={scaleY(positionForEndpoint(wireStart)[1]) - 5} stroke="#f59e0b" strokeWidth="0.8" strokeDasharray="2 1" />}</svg>
      <div className="absolute inset-0">{boardPins.map((pin) => { const active = selectedPin === `board:${pin.id}` || wireStart?.ownerId === 'board' && wireStart.pinId === pin.id; return <button key={pin.id} type="button" onClick={() => onSelectPin({ ownerId: 'board', pinId: pin.id, kind: 'board-pin' })} className={`focus-ring absolute flex min-h-[34px] min-w-[56px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border px-1 text-[10px] font-bold transition-colors ${active ? 'border-amber-300 bg-amber-400 text-slate-950' : pin.kind === 'ground' ? 'border-slate-300 bg-slate-900 text-white' : pin.kind === 'power' ? 'border-red-300 bg-red-600 text-white' : 'border-teal-300 bg-teal-700 text-white hover:bg-teal-500'}`} style={{ left: `${scaleX(pin.position[0])}%`, top: `${scaleY(pin.position[1])}%` }} aria-label={`Board pin ${pin.label}`}>{pin.label}</button>; })}</div>
      {graph.components.map((component) => { const definition = COMPONENT_DEFINITIONS[component.type]; const selected = graph.selectedId === component.id; return <div key={component.id} className={`absolute rounded-xl border p-2 shadow-lg ${selected ? 'border-amber-300 bg-amber-100' : 'border-teal-300 bg-white'} ${component.type === 'led' && ledOn ? 'ring-4 ring-red-400/70' : ''}`} style={{ left: `${scaleX(component.position[0])}%`, top: `${scaleY(component.position[1])}%`, transform: `translate(-50%, -50%) rotate(${component.rotation}deg)` }} onClick={() => onSelectComponent(component.id)}><div className="flex items-center gap-2"><span className={`h-6 w-6 rounded-full ${component.type === 'led' ? ledOn ? 'bg-red-500 shadow-[0_0_18px_#ef4444]' : 'bg-slate-300' : 'bg-teal-700'}`} /><span className="text-[10px] font-bold text-slate-800">{definition.label}</span><button type="button" onClick={(event) => { event.stopPropagation(); onDeleteComponent(component.id); }} className="focus-ring rounded p-1 text-slate-400 hover:text-rose-600" aria-label={`Delete ${definition.label}`}><Trash2 className="h-3 w-3" aria-hidden="true" /></button></div><div className="mt-2 flex gap-1">{definition.pins.map((pin) => { const active = selectedPin === `${component.id}:${pin.id}` || wireStart?.ownerId === component.id && wireStart.pinId === pin.id; return <button key={pin.id} type="button" onClick={(event) => { event.stopPropagation(); onSelectPin({ ownerId: component.id, pinId: pin.id, kind: 'component-pin' }); }} className={`focus-ring rounded px-1.5 py-1 text-[9px] font-bold ${active ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600 hover:bg-teal-100'}`} aria-label={`${definition.label} pin ${pin.label}`}>{pin.label}</button>; })}</div></div>; })}
      <div className="absolute bottom-2 left-2 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-[10px] leading-5 text-slate-300"><p className="font-bold text-white">Connection-first controls</p><p>Click/tap a pin to start, click/tap another to finish.</p><p>Delete selected components from their card. Wires appear in the graph immediately.</p></div>
      {graph.wires.length > 0 && <div className="absolute right-2 top-2 max-w-[190px] rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-[10px] text-slate-300"><p className="font-bold text-white">Active wires</p>{graph.wires.map((wire) => <button key={wire.id} type="button" onClick={() => onDeleteWire(wire.id)} className="focus-ring mt-1 flex w-full items-center justify-between gap-2 rounded px-1.5 py-1 text-left hover:bg-slate-800"><span>{wire.from.pinId} ↔ {wire.to.pinId}</span><Trash2 className="h-3 w-3 text-rose-300" aria-hidden="true" /></button>)}</div>}
    </div>
  </div>;
};

export default VirtualHardwareLab;
