import React, { Component, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Line, Text } from '@react-three/drei';
import type { BoardId, CircuitEndpoint, CircuitGraph, PlacedComponent } from '../../data/virtualHardwareLab';
import { BOARD_PROFILES, COMPONENT_DEFINITIONS, breadboardEndpoint, createDefaultBreadboardTopology } from '../../data/virtualHardwareLab';

interface VirtualHardwareSceneProps {
  boardId: BoardId;
  graph: CircuitGraph;
  selectedPin: string | null;
  wireStart: CircuitEndpoint | null;
  ledOn: boolean;
  ledStates: Record<string, number>;
  servoAngles: Record<string, number>;
  onSelectPin: (endpoint: CircuitEndpoint) => void;
  onSelectComponent: (id: string) => void;
  onDeleteComponent: (id: string) => void;
  onDeleteWire: (id: string) => void;
  onReconnectWire: (id: string) => void;
  onMoveComponent: (id: string, position: [number, number]) => void;
  onRotateComponent: (id: string) => void;
  onToggleButton: (id: string) => void;
}

const WIRE_COLORS: Record<string, string> = { signal: '#2dd4bf', power: '#ef4444', ground: '#111827', custom: '#a78bfa' };

function pointForEndpoint(graph: CircuitGraph, boardId: BoardId, endpoint: CircuitEndpoint): [number, number, number] {
  if (endpoint.ownerId === 'board') {
    const pin = BOARD_PROFILES[boardId].pins.find((candidate) => candidate.id === endpoint.pinId);
    return pin ? [pin.position[0] * 0.55, 0.42, pin.position[1] * 0.55] : [0, 0.42, 0];
  }
  if (endpoint.ownerId === 'breadboard-1' && endpoint.kind === 'breadboard-hole') {
    const match = endpoint.pinId.match(/^([a-j])(\d+)$/);
    if (match) {
      const column = 'abcdefghij'.indexOf(match[1]);
      const row = Number(match[2]);
      return [-2.55 + column * 0.56, 0.42, -3.55 + (row - 1) * 0.12];
    }
    if (endpoint.pinId.startsWith('+') || endpoint.pinId.startsWith('-')) {
      const row = Number(endpoint.pinId.slice(1));
      return [-2.8 + (row - 1) * 0.18, 0.42, endpoint.pinId.startsWith('+') ? -4.05 : -4.35];
    }
  }
  const component = graph.components.find((candidate) => candidate.id === endpoint.ownerId);
  const pin = component ? COMPONENT_DEFINITIONS[component.type].pins.find((candidate) => candidate.id === endpoint.pinId) : null;
  if (!component || !pin) return [0, 0.55, 0];
  const angle = component.rotation;
  const localX = pin.position[0] * 0.45;
  const localZ = pin.position[1] * 0.45;
  return [component.position[0] + localX * Math.cos(angle) - localZ * Math.sin(angle), 0.55, component.position[1] + localX * Math.sin(angle) + localZ * Math.cos(angle)];
}

class SceneErrorBoundary extends Component<{ onError: () => void; children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(): void {
    this.props.onError();
  }

  render(): React.ReactNode {
    return this.state.hasError ? null : this.props.children;
  }
}

function CameraReset({ resetToken }: { resetToken: number }): React.ReactElement {
  const { camera } = useThree();
  const controls = useRef<any>(null);
  useEffect(() => {
    if (resetToken < 1) return;
    camera.position.set(0, 7.5, 8.5);
    camera.lookAt(0, 0, -0.8);
    controls.current?.target?.set(0, 0, -0.8);
    controls.current?.update?.();
  }, [camera, resetToken]);
  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} minDistance={4} maxDistance={15} target={[0, 0, -0.8]} />;
}

function DraggableComponent({ component, graph, boardId, selectedPin, wireStart, ledOn, ledStates, servoAngles, onSelectComponent, onSelectPin, onMoveComponent, onDeleteComponent, onToggleButton }: {
  component: PlacedComponent;
  graph: CircuitGraph;
  boardId: BoardId;
  selectedPin: string | null;
  wireStart: CircuitEndpoint | null;
  ledOn: boolean;
  ledStates: Record<string, number>;
  servoAngles: Record<string, number>;
  onSelectComponent: (id: string) => void;
  onSelectPin: (endpoint: CircuitEndpoint) => void;
  onMoveComponent: (id: string, position: [number, number]) => void;
  onDeleteComponent: (id: string) => void;
  onToggleButton: (id: string) => void;
}): React.ReactElement {
  const definition = COMPONENT_DEFINITIONS[component.type];
  const led = component.type === 'led';
  const ledBrightness = ledStates[component.id] ?? (component.id === 'led-1' && ledOn ? 1 : 0);
  const selected = graph.selectedId === component.id;
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<[number, number]>(component.position);
  const positionRef = useRef<[number, number]>(component.position);
  const color = led ? (ledBrightness > 0 ? '#ef4444' : '#94a3b8') : component.type === 'resistor' ? '#d6a85a' : component.type === 'servo' ? '#475569' : component.type === 'button' ? component.properties.pressed === true ? '#dc2626' : '#f97316' : '#0f766e';

  useEffect(() => {
    if (!dragging) {
      setPosition(component.position);
      positionRef.current = component.position;
    }
  }, [component.position, dragging]);

  return (
    <group
      position={[position[0], 0.72, position[1]]}
      rotation={[0, component.rotation, 0]}
      onClick={(event) => { event.stopPropagation(); onSelectComponent(component.id); }}
      onPointerDown={(event) => { event.stopPropagation(); setDragging(true); onSelectComponent(component.id); }}
      onPointerMove={(event) => { if (!dragging) return; event.stopPropagation(); const nextPosition: [number, number] = [Math.max(-3.5, Math.min(3.5, event.point.x)), Math.max(-2, Math.min(2.2, event.point.z))]; positionRef.current = nextPosition; setPosition(nextPosition); }}
      onPointerUp={(event) => { if (!dragging) return; event.stopPropagation(); setDragging(false); onMoveComponent(component.id, positionRef.current); }}
    >
      <mesh scale={selected ? 1.08 : 1}>
        <boxGeometry args={[1.05, 0.34, 0.66]} />
         <meshStandardMaterial color={color} emissive={selected ? '#fbbf24' : led && ledBrightness > 0 ? '#ef4444' : '#000000'} emissiveIntensity={selected ? 0.6 : led ? ledBrightness * 1.4 : 0} />
      </mesh>
       <Text position={[0, 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.13} color="#f8fafc" anchorX="center">{definition.label}</Text>
       {component.type === 'button' && <Text position={[0, 0.3, 0.25]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.1} color="#fed7aa" anchorX="center" onClick={(event) => { event.stopPropagation(); onToggleButton(component.id); }}>{component.properties.pressed === true ? 'Pressed' : 'Press'}</Text>}
      {component.type === 'servo' && <group rotation={[0, ((servoAngles[component.id] || servoAngles.servo || 0) * Math.PI) / 180, 0]} position={[0, 0.23, 0]}><mesh position={[0, 0.28, 0]}><boxGeometry args={[0.08, 0.5, 0.08]} /><meshStandardMaterial color="#f8fafc" /></mesh></group>}
      {definition.pins.map((pin) => {
        const endpoint = { ownerId: component.id, pinId: pin.id, kind: 'component-pin' as const };
        const active = selectedPin === `${component.id}:${pin.id}` || (wireStart?.ownerId === component.id && wireStart.pinId === pin.id);
        return <mesh key={pin.id} position={[pin.position[0] * 0.45, 0.2, pin.position[1] * 0.45]} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onSelectPin(endpoint); }}><sphereGeometry args={[active ? 0.16 : 0.11, 12, 12]} /><meshStandardMaterial color={active ? '#fbbf24' : pin.kind === 'ground' ? '#111827' : pin.kind === 'power' ? '#ef4444' : '#facc15'} /></mesh>;
      })}
      <Text position={[0.65, 0.25, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.1} color="#fda4af" anchorX="left" onClick={(event) => { event.stopPropagation(); onDeleteComponent(component.id); }}>×</Text>
    </group>
  );
}

function fallbackPoint(graph: CircuitGraph, boardId: BoardId, endpoint: CircuitEndpoint): [number, number] {
  if (endpoint.ownerId === 'board') {
    const pin = BOARD_PROFILES[boardId].pins.find((candidate) => candidate.id === endpoint.pinId);
    return pin ? [50 + pin.position[0] * 6, 25 - pin.position[1] * 8] : [50, 25];
  }
  if (endpoint.ownerId === 'breadboard-1' && endpoint.kind === 'breadboard-hole') {
    const match = endpoint.pinId.match(/^([a-j])(\d+)$/);
    if (match) {
      const column = 'abcdefghij'.indexOf(match[1]);
      const row = Number(match[2]);
      return [23 + column * 4.2, 77 - (row - 1) * 1.7];
    }
    if (endpoint.pinId.startsWith('+') || endpoint.pinId.startsWith('-')) {
      return [22 + (Number(endpoint.pinId.slice(1)) - 1) * 1.8, endpoint.pinId.startsWith('+') ? 88 : 92];
    }
  }
  const component = graph.components.find((candidate) => candidate.id === endpoint.ownerId);
  if (!component) return [50, 50];
  const pin = COMPONENT_DEFINITIONS[component.type].pins.find((candidate) => candidate.id === endpoint.pinId);
  const angle = component.rotation;
  const localX = pin?.position[0] || 0;
  const localY = pin?.position[1] || 0;
  return [
    50 + (component.position[0] + localX * Math.cos(angle) - localY * Math.sin(angle)) * 6,
    50 - (component.position[1] + localX * Math.sin(angle) + localY * Math.cos(angle)) * 8,
  ];
}

function fallbackComponentPoint(component: PlacedComponent): [number, number] {
  return [50 + component.position[0] * 6, 50 - component.position[1] * 8];
}

function FallbackWorkbench({ boardId, graph, selectedPin, wireStart, ledOn, ledStates, onSelectPin, onSelectComponent, onDeleteComponent, onDeleteWire, onReconnectWire, onMoveComponent, onRotateComponent, onToggleButton }: VirtualHardwareSceneProps): React.ReactElement {
  const board = BOARD_PROFILES[boardId];
  return (
    <div className="min-h-[500px] bg-slate-950 p-3" aria-label="Accessible 2D fallback workbench">
      <div className="relative h-[470px] min-w-[620px] overflow-hidden rounded-xl border border-slate-700 bg-[linear-gradient(#334155_1px,transparent_1px),linear-gradient(90deg,#334155_1px,transparent_1px)] bg-[size:28px_28px]">
        <div className="absolute left-[25%] top-[8%] h-[190px] w-[50%] rounded-2xl border-2 border-slate-500 bg-slate-800 p-4 text-slate-200"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em]"><span>{board.name}</span><span>{board.logicVoltage}V logic</span></div><p className="mt-3 text-[11px] text-slate-400">2D fallback: the same circuit graph remains editable through the visible pin buttons.</p></div>
        <div className="absolute left-[7%] top-[63%] h-[130px] w-[86%] rounded-xl border-2 border-slate-500 bg-slate-100 p-3"><div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500"><span>Virtual solderless breadboard</span><span>Grouped rows · center channel</span></div><div className="mt-4 grid grid-cols-20 gap-1 opacity-80">{Array.from({ length: 150 }, (_, index) => <button key={index} type="button" aria-label={`Fallback breadboard hole ${index + 1}`} className="h-2 w-2 rounded-full bg-slate-400" onClick={() => onSelectPin(breadboardEndpoint(`a${(index % 30) + 1}`))} />)}</div></div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Fallback wire visualization">{graph.wires.map((wire) => { const from = fallbackPoint(graph, boardId, wire.from); const to = fallbackPoint(graph, boardId, wire.to); return <line key={wire.id} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]} stroke={WIRE_COLORS[wire.color] || WIRE_COLORS.signal} strokeWidth="0.8" strokeLinecap="round" />; })}{wireStart && <line x1={fallbackPoint(graph, boardId, wireStart)[0]} y1={fallbackPoint(graph, boardId, wireStart)[1]} x2={fallbackPoint(graph, boardId, wireStart)[0] + 5} y2={fallbackPoint(graph, boardId, wireStart)[1] - 5} stroke="#fbbf24" strokeWidth="1" strokeDasharray="2 1" />}</svg>
        <div className="absolute inset-0">{board.pins.map((pin) => { const [left, top] = fallbackPoint(graph, boardId, { ownerId: 'board', pinId: pin.id, kind: 'board-pin' }); const active = selectedPin === `board:${pin.id}` || (wireStart?.ownerId === 'board' && wireStart.pinId === pin.id); return <button key={pin.id} type="button" onClick={() => onSelectPin({ ownerId: 'board', pinId: pin.id, kind: 'board-pin' })} className={`focus-ring absolute min-h-[32px] min-w-[54px] -translate-x-1/2 -translate-y-1/2 rounded-md border px-1 text-[10px] font-bold ${active ? 'border-amber-300 bg-amber-400 text-slate-950' : pin.kind === 'ground' ? 'border-slate-300 bg-slate-900 text-white' : pin.kind === 'power' ? 'border-red-300 bg-red-600 text-white' : 'border-teal-300 bg-teal-700 text-white'}`} style={{ left: `${left}%`, top: `${top}%` }} aria-label={`Fallback board pin ${pin.label}`}>{pin.label}</button>; })}</div>
         {graph.components.filter((component) => component.type !== 'breadboard').map((component) => { const [left, top] = fallbackComponentPoint(component); const definition = COMPONENT_DEFINITIONS[component.type]; return <div key={component.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border p-2 shadow-lg ${graph.selectedId === component.id ? 'border-amber-300 bg-amber-100' : 'border-teal-300 bg-white'} ${component.type === 'led' && ledOn ? 'ring-4 ring-red-400/70' : ''}`} style={{ left: `${left}%`, top: `${top}%`, transform: `translate(-50%, -50%) rotate(${component.rotation}rad)` }}><div className="flex items-center gap-1"><button type="button" onClick={() => onSelectComponent(component.id)} className="focus-ring text-[10px] font-bold text-slate-800">{definition.label}</button><button type="button" onClick={() => onDeleteComponent(component.id)} aria-label={`Delete ${definition.label}`} className="focus-ring text-xs text-rose-600">×</button></div><div className="mt-1 flex gap-1">{definition.pins.map((pin) => <button key={pin.id} type="button" onClick={() => onSelectPin({ ownerId: component.id, pinId: pin.id, kind: 'component-pin' })} className={`focus-ring rounded px-1 py-0.5 text-[9px] font-bold ${selectedPin === `${component.id}:${pin.id}` || (wireStart?.ownerId === component.id && wireStart.pinId === pin.id) ? 'bg-amber-400 text-slate-950' : 'bg-slate-100 text-slate-600'}`} aria-label={`Fallback ${definition.label} pin ${pin.label}`}>{pin.label}</button>)}</div><div className="mt-1 flex gap-1"><button type="button" onClick={() => onMoveComponent(component.id, [component.position[0] - 0.2, component.position[1]])} className="focus-ring rounded border border-slate-200 px-1 text-[9px] font-bold text-slate-600" aria-label={`Move ${definition.label} left`}>←</button><button type="button" onClick={() => onMoveComponent(component.id, [component.position[0] + 0.2, component.position[1]])} className="focus-ring rounded border border-slate-200 px-1 text-[9px] font-bold text-slate-600" aria-label={`Move ${definition.label} right`}>→</button><button type="button" onClick={() => onRotateComponent(component.id)} className="focus-ring rounded border border-slate-200 px-1 text-[9px] font-bold text-slate-600" aria-label={`Rotate ${definition.label}`}>↻</button></div></div>; })}
      </div>
    </div>
  );
}

export const VirtualHardwareScene: React.FC<VirtualHardwareSceneProps> = ({ boardId, graph, selectedPin, wireStart, ledOn, ledStates, servoAngles, onSelectPin, onSelectComponent, onDeleteComponent, onDeleteWire, onReconnectWire, onMoveComponent, onRotateComponent, onToggleButton }) => {
  const board = BOARD_PROFILES[boardId];
  const canRenderThree = typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined';
  const [sceneError, setSceneError] = useState(false);
  const [resetToken, setResetToken] = useState(0);
  const topology = graph.breadboardTopology || createDefaultBreadboardTopology();
  const keyboardPins = useMemo(() => [
    ...board.pins.map((pin) => ({ endpoint: { ownerId: 'board' as const, pinId: pin.id, kind: 'board-pin' as const }, label: `Board ${pin.label}` })),
    ...graph.components.flatMap((component) => COMPONENT_DEFINITIONS[component.type].pins.map((pin) => ({ endpoint: { ownerId: component.id, pinId: pin.id, kind: 'component-pin' as const }, label: `${COMPONENT_DEFINITIONS[component.type].label} ${pin.label}` }))),
    ...topology.nodes.flatMap((node) => node.connectedHoleIds.slice(0, 3).map((holeId) => ({ endpoint: breadboardEndpoint(holeId), label: `Breadboard ${holeId}` }))),
  ], [board.pins, graph.components, topology.nodes]);

  return (
    <div
      className="relative min-h-[500px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-inner focus-within:ring-2 focus-within:ring-teal-300"
      aria-label="Three-dimensional virtual electronics workbench"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onSelectPin({ ownerId: '__cancel__', pinId: '__cancel__', kind: 'board-pin' });
        }
        if ((event.key === 'Delete' || event.key === 'Backspace') && graph.selectedId && graph.selectedId !== 'board') {
          event.preventDefault();
          onDeleteComponent(graph.selectedId);
        }
        if (event.key.toLowerCase() === 'r' && graph.selectedId && graph.selectedId !== 'board') {
          event.preventDefault();
          onRotateComponent(graph.selectedId);
        }
      }}
    >
       {canRenderThree && !sceneError ? <SceneErrorBoundary onError={() => setSceneError(true)}><Canvas camera={{ position: [0, 7.5, 8.5], fov: 42 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={['#020617']} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[4, 8, 4]} intensity={2.1} />
        <gridHelper args={[12, 24, '#334155', '#0f172a']} position={[0, -0.05, 0]} />
        <group>
          <mesh position={[0, 0.18, 0]} onClick={() => onSelectComponent('board')}>
            <boxGeometry args={[6.8, 0.35, 3.3]} />
            <meshStandardMaterial color="#14532d" roughness={0.7} />
          </mesh>
          <Text position={[0, 0.42, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.28} color="#d1fae5" anchorX="center" anchorY="middle">{board.name}</Text>
          {board.pins.map((pin) => {
            const [x, y, z] = pointForEndpoint(graph, boardId, { ownerId: 'board', pinId: pin.id, kind: 'board-pin' });
            const key = `board:${pin.id}`;
            const active = selectedPin === key || (wireStart?.ownerId === 'board' && wireStart.pinId === pin.id);
            return <group key={key} position={[x, y, z]}><mesh onClick={(event) => { event.stopPropagation(); onSelectPin({ ownerId: 'board', pinId: pin.id, kind: 'board-pin' }); }}><sphereGeometry args={[active ? 0.17 : 0.13, 16, 16]} /><meshStandardMaterial color={active ? '#fbbf24' : pin.kind === 'ground' ? '#111827' : pin.kind === 'power' ? '#ef4444' : '#2dd4bf'} emissive={active ? '#f59e0b' : '#000000'} emissiveIntensity={active ? 0.5 : 0} /></mesh><Text position={[0, 0.24, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color="#e2e8f0" anchorX="center">{pin.label}</Text></group>;
          })}
        </group>
        <mesh position={[0, 0.12, -3.0]}><boxGeometry args={[7.8, 0.22, 2.2]} /><meshStandardMaterial color="#e2e8f0" roughness={0.6} /></mesh>
        <mesh position={[0, 0.25, -3.0]}><boxGeometry args={[5.8, 0.08, 1.65]} /><meshStandardMaterial color="#f8fafc" /></mesh>
        {topology.nodes.flatMap((node) => node.connectedHoleIds.map((holeId) => {
          const [x, y, z] = pointForEndpoint(graph, boardId, breadboardEndpoint(holeId));
          const active = wireStart?.ownerId === 'breadboard-1' && wireStart.pinId === holeId;
          return <mesh key={holeId} position={[x, y, z]} onClick={(event) => { event.stopPropagation(); onSelectPin(breadboardEndpoint(holeId)); }}><cylinderGeometry args={[active ? 0.07 : 0.04, active ? 0.07 : 0.04, 0.06, 10]} /><meshStandardMaterial color={active ? '#fbbf24' : node.kind === 'power-rail' ? (node.id === 'positive-rail' ? '#ef4444' : '#111827') : '#64748b'} /></mesh>;
        }))}
        {graph.wires.map((wire) => { const from = pointForEndpoint(graph, boardId, wire.from); const to = pointForEndpoint(graph, boardId, wire.to); const midpoint: [number, number, number] = [(from[0] + to[0]) / 2, Math.max(from[1], to[1]) + 0.55, (from[2] + to[2]) / 2]; return <group key={wire.id}><Line points={[from, midpoint, to]} color={WIRE_COLORS[wire.color] || WIRE_COLORS.signal} lineWidth={3} /><mesh position={midpoint} onClick={(event) => { event.stopPropagation(); onDeleteWire(wire.id); }}><sphereGeometry args={[0.07, 10, 10]} /><meshStandardMaterial color="#f8fafc" /></mesh></group>; })}
        {wireStart && <Line points={[pointForEndpoint(graph, boardId, wireStart), [pointForEndpoint(graph, boardId, wireStart)[0], 1.25, pointForEndpoint(graph, boardId, wireStart)[2]]]} color="#fbbf24" lineWidth={2} dashed dashSize={0.12} gapSize={0.08} />}
        {graph.components.filter((component) => component.type !== 'breadboard').map((component) => (
          <DraggableComponent
            key={component.id}
            component={component}
            graph={graph}
            boardId={boardId}
            selectedPin={selectedPin}
            wireStart={wireStart}
            ledOn={ledOn}
            ledStates={ledStates}
            servoAngles={servoAngles}
            onSelectComponent={onSelectComponent}
            onSelectPin={onSelectPin}
            onMoveComponent={onMoveComponent}
            onDeleteComponent={onDeleteComponent}
            onToggleButton={onToggleButton}
          />
        ))}
        <CameraReset resetToken={resetToken} />
       </Canvas></SceneErrorBoundary> : <FallbackWorkbench boardId={boardId} graph={graph} selectedPin={selectedPin} wireStart={wireStart} ledOn={ledOn} ledStates={ledStates} servoAngles={servoAngles} onSelectPin={onSelectPin} onSelectComponent={onSelectComponent} onDeleteComponent={onDeleteComponent} onDeleteWire={onDeleteWire} onReconnectWire={onReconnectWire} onMoveComponent={onMoveComponent} onRotateComponent={onRotateComponent} onToggleButton={onToggleButton} />}
      <div className="absolute left-3 top-3 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 text-[10px] leading-5 text-slate-300"><p className="font-bold text-white">{!canRenderThree || sceneError ? '2D fallback workbench' : '3D workbench'}</p>{(!canRenderThree || sceneError) && <p>3D preview unavailable in this browser; editing remains available here.</p>}{canRenderThree && !sceneError && <><p>Orbit · zoom · pan with mouse or touch.</p><p>Drag components to move them; press R to rotate.</p><div className="mt-1 flex gap-1"><button type="button" onClick={() => setResetToken((token) => token + 1)} className="focus-ring pointer-events-auto rounded border border-slate-600 px-2 py-1 font-bold text-teal-200 hover:bg-slate-800">Reset camera</button><button type="button" disabled={!graph.selectedId || graph.selectedId === 'board'} onClick={() => graph.selectedId && onRotateComponent(graph.selectedId)} className="focus-ring pointer-events-auto rounded border border-slate-600 px-2 py-1 font-bold text-teal-200 disabled:opacity-40">Rotate selected</button></div></>}</div>
       <div className="absolute bottom-3 left-3 right-3 max-h-24 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/90 p-2"><div className="flex flex-wrap gap-1.5" aria-label="Keyboard connection points">{keyboardPins.map(({ endpoint, label }) => <button key={`${endpoint.ownerId}:${endpoint.pinId}`} type="button" onClick={() => onSelectPin(endpoint)} className="focus-ring min-h-[30px] rounded border border-slate-600 px-2 text-[10px] font-bold text-slate-200 hover:border-teal-300 hover:bg-slate-800" aria-label={`Connect ${label}`}>{label}</button>)}</div></div>
       {graph.wires.length > 0 && <div className="absolute right-3 top-3 max-w-[250px] rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-[10px] text-slate-300" aria-label="Wire controls"><p className="font-bold text-white">Active wires</p>{graph.wires.map((wire) => <div key={wire.id} className="mt-1 flex items-center gap-1 rounded px-1.5 py-1"><span className="min-w-0 flex-1 truncate">{wire.from.pinId} ↔ {wire.to.pinId}</span><button type="button" onClick={() => onReconnectWire(wire.id)} className="focus-ring rounded border border-slate-600 px-1 text-[9px] font-bold text-teal-200" aria-label={`Reconnect wire ${wire.from.pinId} to ${wire.to.pinId}`}>Reconnect</button><button type="button" onClick={() => onDeleteWire(wire.id)} className="focus-ring rounded border border-rose-900 px-1 text-[9px] font-bold text-rose-300" aria-label={`Delete wire ${wire.from.pinId} to ${wire.to.pinId}`}>Delete</button></div>)}</div>}
       {(!canRenderThree || sceneError) && graph.components.some((component) => component.type === 'button') && <div className="absolute left-3 top-24 max-w-[220px] rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-[10px] text-slate-300" aria-label="Button input controls"><p className="font-bold text-white">Button inputs</p>{graph.components.filter((component) => component.type === 'button').map((button) => <button key={button.id} type="button" onClick={() => onToggleButton(button.id)} className="focus-ring mt-1 flex w-full items-center justify-between rounded border border-slate-600 px-2 py-1 text-left font-bold text-orange-200" aria-label={`${button.properties.pressed === true ? 'Release' : 'Press'} ${button.id}`}><span>{button.id}</span><span>{button.properties.pressed === true ? 'Pressed' : 'Released'}</span></button>)}</div>}
       {(!canRenderThree || sceneError) && graph.components.some((component) => component.type === 'led') && <div className="absolute bottom-28 left-3 max-w-[220px] rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-[10px] text-slate-300" aria-label="Virtual LED outputs"><p className="font-bold text-white">Virtual LED outputs</p>{graph.components.filter((component) => component.type === 'led').map((led) => { const brightness = ledStates[led.id] ?? (led.id === 'led-1' && ledOn ? 1 : 0); return <p key={led.id} className="mt-1 flex items-center justify-between"><span>{led.id}</span><span className={brightness > 0 ? 'font-bold text-red-300' : 'text-slate-400'}>{brightness > 0 ? `${Math.round(brightness * 100)}%` : 'OFF'}</span></p>; })}</div>}
    </div>
  );
};

export default VirtualHardwareScene;
