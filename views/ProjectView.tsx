

import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings2, Hammer, Boxes, Layers, Shuffle, Trash2, MousePointer2, ArrowUpRight,
  Save, RotateCcw, AlertTriangle, X, Edit, MoreHorizontal, Check, Play, Pause,
  PanelLeft, Search, Beaker, Database, ExternalLink, CheckSquare, Plus, ArrowLeft,
  Save as SaveIcon, ChevronDown, ChevronUp, Info, Thermometer, Gauge, Scale,
  Droplets, Waves, Split, Filter, ArrowRight, MousePointer, FileText, Table,
  Activity, CheckCircle, Calculator, Menu, Tag, FlaskConical, Atom, Square,
  CheckSquare2, Terminal, XCircle, AlertCircle, Eraser
} from 'lucide-react';
import { 
  NodeType, EquipmentConfig, NodeData, Connection, Mineral, StreamData, LogEntry, LogType
} from '../types';
import { solveFlowsheet, SimulationResult } from '../services/flowsheetSolver';

interface ProjectViewProps {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  minerals: Mineral[];
  setMinerals: React.Dispatch<React.SetStateAction<Mineral[]>>;
  logs: LogEntry[];
  setLogs: React.Dispatch<React.SetStateAction<LogEntry[]>>;
  onSimulationComplete: (results: SimulationResult) => void;
  onNavigateToResults: () => void;
}

const EQUIPMENT_CONFIGS: Record<NodeType, EquipmentConfig> = {
  'Feed': {
    type: 'Feed', icon: ArrowRight, label: 'Feed', color: 'bg-transparent border-0',
    inputs: [],
    outputs: [{ id: 'out', type: 'output', label: 'Stream' }],
    defaultParameters: { solidsTph: 100, percentSolids: 60, sg: 2.7, description: 'Fresh Feed' }
  },
  'Product': {
    type: 'Product', icon: ArrowRight, label: 'Product', color: 'bg-transparent border-0',
    inputs: [{ id: 'in', type: 'input', label: 'Stream' }],
    outputs: [],
    defaultParameters: { description: 'Final Product' }
  },
  'Mixer': { 
    type: 'Mixer', icon: Shuffle, label: 'Mixer', color: 'bg-purple-100 border-purple-500 text-purple-700',
    inputs: [{ id: 'in1', type: 'input' }, { id: 'in2', type: 'input' }, { id: 'in3', type: 'input' }],
    outputs: [{ id: 'out1', type: 'output' }],
    defaultParameters: { description: 'Ideal Mixer' } 
  },
  'Splitter': {
    type: 'Splitter', icon: Split, label: 'Splitter', color: 'bg-slate-200 border-slate-500 text-slate-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'stream1', type: 'output', label: 'S1' }, { id: 'stream2', type: 'output', label: 'S2' }],
    defaultParameters: { splitRatio: 50, description: '% Mass to Stream 1' }
  },
  'Moinho': { 
    type: 'Moinho', icon: Settings2, label: 'Ball Mill', color: 'bg-blue-100 border-blue-500 text-blue-700',
    inputs: [{ id: 'feed', type: 'input', label: 'Feed' }],
    outputs: [{ id: 'discharge', type: 'output', label: 'Product' }],
    defaultParameters: { workIndex: 12.5, diameter: 4.5, length: 6.0, filling: 35, targetDischargeSolids: 70 }
  },
  'Britador': { 
    type: 'Britador', icon: Hammer, label: 'Crusher', color: 'bg-slate-300 border-slate-600 text-slate-800',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'product', type: 'output' }],
    defaultParameters: { capacity: 300, closedSideSetting: 12, reductionRatio: 4 }
  },
  'Hydrocyclone': { 
    type: 'Hydrocyclone', icon: Filter, label: 'Cyclone Cluster', color: 'bg-indigo-100 border-indigo-500 text-indigo-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'overflow', type: 'output', label: 'O/F' }, { id: 'underflow', type: 'output', label: 'U/F' }],
    defaultParameters: { pressure: 100, d50c: 150, waterRecoveryToUnderflow: 45, numberOfCyclones: 4 }
  },
  'FlotationCell': { 
    type: 'FlotationCell', icon: Layers, label: 'Flotation Cell', color: 'bg-green-100 border-green-500 text-green-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output', label: 'Conc' }, { id: 'tail', type: 'output', label: 'Tail' }],
    defaultParameters: { residenceTime: 15, airFlow: 50, massPull: 10, waterPull: 15, mineralRecovery: 90 }
  },
  'Conditioner': {
    type: 'Conditioner', icon: Droplets, label: 'Conditioner', color: 'bg-teal-100 border-teal-500 text-teal-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'out', type: 'output' }],
    defaultParameters: { residenceTime: 5, reagents: 'PAX' }
  },
  'Thickener': {
    type: 'Thickener', icon: Boxes, label: 'Thickener', color: 'bg-cyan-100 border-cyan-500 text-cyan-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'underflow', type: 'output', label: 'U/F' }, { id: 'overflow', type: 'output', label: 'Water' }],
    defaultParameters: { underflowSolids: 65, flocculantDosage: 20 }
  }
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;
const COMPACT_NODE_WIDTH = 12;
const COMPACT_NODE_HEIGHT = 12;

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  nodes, 
  setNodes, 
  connections, 
  setConnections,
  minerals,
  setMinerals,
  logs,
  setLogs,
  onSimulationComplete,
  onNavigateToResults
}) => {
  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused' | 'success'>('idle');
  const [activeTool, setActiveTool] = useState<'pointer' | 'stream'>('pointer');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(true);
  
  // Interaction State
  const [draggingNode, setDraggingNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'node' | 'connection'; id: string } | null>(null);

  // Connection Drawing State
  const [drawingLine, setDrawingLine] = useState<{ 
      fromNode: string; 
      fromPort: string; 
      startX: number; 
      startY: number; 
      currX: number; 
      currY: number;
      autoCreatedOrigin?: boolean; 
  } | null>(null);

  // Modals State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editLabel, setEditLabel] = useState(''); 
  const [editId, setEditId] = useState<string>('');
  const [editType, setEditType] = useState<'node' | 'connection'>('node');

  const [showMineralModal, setShowMineralModal] = useState(false);
  const [mineralSearch, setMineralSearch] = useState('');
  const [mineralViewMode, setMineralViewMode] = useState<'list' | 'edit'>('list');
  const [currentMineral, setCurrentMineral] = useState<Partial<Mineral>>({});

  const canvasRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  // --- Logger Function ---
  const addLog = (message: string, type: LogType = 'info') => {
    const newLog: LogEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      type,
      message
    };
    setLogs(prev => [newLog, ...prev]); // Newest first
  };

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Global Mouse Up Handler for Clean Stream Cancellation
  useEffect(() => {
    const handleGlobalMouseUp = () => {
        if (drawingLine) {
            // If we are drawing a line and mouse up happens globally (e.g. outside canvas)
            // AND it was an auto-created feed node (via Stream Tool), clean it up.
            if (drawingLine.autoCreatedOrigin) {
                 setNodes(prev => prev.filter(n => n.id !== drawingLine.fromNode));
                 addLog('Criação de corrente cancelada.', 'info');
            }
            setDrawingLine(null);
        }
        setDraggingNode(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [drawingLine, setNodes]);

  // --- Mineral CRUD Logic ---
  const handleEditMineral = (mineral: Mineral) => {
    setCurrentMineral({ ...mineral });
    setMineralViewMode('edit');
  };

  const handleToggleSelection = (id: string) => {
    setMinerals(prev => prev.map(m => m.id === id ? { ...m, selected: !m.selected } : m));
  };

  const handleCreateMineral = () => {
    setCurrentMineral({ 
      id: `custom_${Date.now()}`,
      name: 'New Mineral',
      formula: '',
      density: 2.7,
      class: 'Silicate',
      elementalComposition: '',
      workIndex: 10,
      selected: true
    });
    setMineralViewMode('edit');
  };

  const handleSaveMineral = () => {
    if (!currentMineral.name || !currentMineral.id) return;
    
    setMinerals(prev => {
      const exists = prev.find(m => m.id === currentMineral.id);
      if (exists) {
        addLog(`Mineral '${currentMineral.name}' atualizado.`, 'success');
        return prev.map(m => m.id === currentMineral.id ? currentMineral as Mineral : m);
      } else {
        addLog(`Novo mineral '${currentMineral.name}' criado.`, 'success');
        return [...prev, currentMineral as Mineral];
      }
    });
    setMineralViewMode('list');
  };

  const handleDeleteMineral = (id: string) => {
    if (confirm('Tem certeza que deseja remover este mineral da base de dados?')) {
      setMinerals(prev => prev.filter(m => m.id !== id));
      addLog('Mineral removido da base de dados.', 'warning');
    }
  };

  const filteredMinerals = minerals.filter(m => 
    m.name.toLowerCase().includes(mineralSearch.toLowerCase()) || 
    m.formula.toLowerCase().includes(mineralSearch.toLowerCase())
  );

  // --- Simulation Logic ---
  const handleRunSimulation = () => {
      setSimState('running');
      addLog('Iniciando simulação...', 'info');
      
      setTimeout(() => {
          try {
              // Pass minerals DB to solver
              const result = solveFlowsheet(nodes, connections, minerals);
              
              if (result.diagnostics.length > 0) {
                 result.diagnostics.forEach(diag => {
                    const type = diag.includes('ERRO') ? 'error' : 'warning';
                    addLog(diag, type);
                 });
              }

              if (!result.converged && result.error === 100) {
                 setSimState('idle');
                 addLog('Simulação abortada devido a erros de validação.', 'error');
                 return; 
              }

              const updatedConnections = connections.map(c => ({
                  ...c,
                  streamState: result.streams[c.id]
              }));
              setConnections(updatedConnections);
              
              onSimulationComplete(result);

              if (result.converged && result.error < 1) {
                  setSimState('success');
                  addLog(`Simulação concluída com sucesso! Erro global: ${result.error.toFixed(4)}%`, 'success');
                  addLog(`Iterações: ${result.iterations}`, 'info');
                  setTimeout(() => setSimState('idle'), 5000); 
              } else {
                  setSimState('idle');
                  addLog(`Simulação finalizada com aviso. Erro de fechamento: ${result.error.toFixed(2)}%`, 'warning');
              }

          } catch (e) {
              console.error(e);
              setSimState('idle');
              addLog('Erro crítico interno no motor de simulação.', 'error');
          }
      }, 500); 
  };

  const handleClearFlowsheetRequest = () => {
      setShowClearConfirm(true);
  };

  const handleConfirmClear = () => {
      setNodes([]);
      setConnections([]);
      addLog('Fluxograma limpo pelo usuário.', 'warning');
      setSimState('idle');
      setShowClearConfirm(false);
  };

  // --- Helpers ---
  const getAbsolutePortPosition = (nodeId: string, portId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
    if (!config) return null;

    const isCompact = node.type === 'Feed' || node.type === 'Product';
    const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
    const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;

    if (isCompact) {
        return {
            x: node.x + width / 2,
            y: node.y + height / 2
        };
    }

    const inputIndex = config.inputs.findIndex(p => p.id === portId);
    if (inputIndex >= 0) {
        const spacing = height / (config.inputs.length + 1);
        return {
            x: node.x,
            y: node.y + spacing * (inputIndex + 1)
        };
    }

    const outputIndex = config.outputs.findIndex(p => p.id === portId);
    if (outputIndex >= 0) {
        const spacing = height / (config.outputs.length + 1);
        return {
            x: node.x + width,
            y: node.y + spacing * (outputIndex + 1)
        };
    }

    return null;
  };

  const addNode = (type: NodeType, x: number, y: number) => {
    const newNode: NodeData = {
      id: `${type}_${Date.now()}`,
      type,
      x,
      y,
      label: EQUIPMENT_CONFIGS[type].label,
      parameters: { ...EQUIPMENT_CONFIGS[type].defaultParameters }
    };
    setNodes(prev => [...prev, newNode]);
    addLog(`Adicionado equipamento: ${newNode.label}`, 'info');
    return newNode;
  };

  // --- Path Helper (Aspen Style Orthogonal) ---
  const getOrthogonalPath = (start: {x: number, y: number}, end: {x: number, y: number}) => {
      const midX = (start.x + end.x) / 2;
      return `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;
  };

  // --- Handlers ---
  const handleMouseDown = (e: React.MouseEvent, type: 'node' | 'port' | 'canvas', id?: string, portId?: string) => {
    // Only allow drag/draw on Left Click. Right click (button 2) is for context menu.
    if (e.button !== 0) return;

    e.stopPropagation();
    e.preventDefault();

    if (activeTool === 'stream') {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // If clicking on a port, start drawing from there
        if (type === 'port' && id && portId) {
            setDrawingLine({
                fromNode: id,
                fromPort: portId,
                startX: x, 
                startY: y,
                currX: x,
                currY: y
            });
            return;
        }
        
        // If clicking on canvas, create a FEED node and start drawing
        if (type === 'canvas') {
            const feedNode = addNode('Feed', x - COMPACT_NODE_WIDTH/2, y - COMPACT_NODE_HEIGHT/2);
            setDrawingLine({
                fromNode: feedNode.id,
                fromPort: 'out',
                startX: x,
                startY: y,
                currX: x,
                currY: y,
                autoCreatedOrigin: true // Mark as auto-created
            });
            return;
        }
    }

    if (activeTool === 'pointer' && type === 'node' && id) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        
        const node = nodes.find(n => n.id === id);
        if (node) {
            setDraggingNode({
                id,
                offsetX: e.clientX - rect.left - node.x,
                offsetY: e.clientY - rect.top - node.y
            });
        }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingNode) {
        setNodes(prev => prev.map(n => 
            n.id === draggingNode.id ? { ...n, x: x - draggingNode.offsetX, y: y - draggingNode.offsetY } : n
        ));
    }

    if (drawingLine) {
        setDrawingLine(prev => prev ? { ...prev, currX: x, currY: y } : null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent, type: 'port' | 'canvas', nodeId?: string, portId?: string) => {
    e.stopPropagation(); // Stop propagation to window handler if handled here
    setDraggingNode(null);

    if (drawingLine) {
        // Successful connection
        if (type === 'port' && nodeId && portId && nodeId !== drawingLine.fromNode) {
            const newConn: Connection = {
                id: `stream_${Date.now()}`,
                fromNode: drawingLine.fromNode,
                fromPort: drawingLine.fromPort,
                toNode: nodeId,
                toPort: portId,
                parameters: { solidsTph: 0, percentSolids: 0 }
            };
            setConnections(prev => [...prev, newConn]);
            addLog('Nova conexão criada.', 'info');
        } 
        // Create Product Node on drop in empty space
        else if (type === 'canvas') {
             const rect = canvasRef.current?.getBoundingClientRect();
             if (rect) {
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const prodNode = addNode('Product', x - COMPACT_NODE_WIDTH/2, y - COMPACT_NODE_HEIGHT/2);
                
                const newConn: Connection = {
                    id: `stream_${Date.now()}`,
                    fromNode: drawingLine.fromNode,
                    fromPort: drawingLine.fromPort,
                    toNode: prodNode.id,
                    toPort: 'in',
                    parameters: { solidsTph: 0, percentSolids: 0 }
                };
                setConnections(prev => [...prev, newConn]);
                addLog('Nova conexão (Produto) criada.', 'info');
             }
        }
        // CLEANUP: If invalid drop and origin was auto-created, remove the orphan Feed node
        else if (drawingLine.autoCreatedOrigin) {
             setNodes(prev => prev.filter(n => n.id !== drawingLine.fromNode));
        }

        setDrawingLine(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, type: 'node' | 'connection', id: string) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Coordinates relative to viewport for fixed positioning context menu
      setContextMenu({ x: e.clientX, y: e.clientY, type, id });
  };

  const deleteItem = () => {
      if (!contextMenu) return;
      if (contextMenu.type === 'node') {
          const node = nodes.find(n => n.id === contextMenu.id);
          setNodes(prev => prev.filter(n => n.id !== contextMenu.id));
          setConnections(prev => prev.filter(c => c.fromNode !== contextMenu.id && c.toNode !== contextMenu.id));
          addLog(`Equipamento '${node?.label}' deletado.`, 'warning');
      } else {
          setConnections(prev => prev.filter(c => c.id !== contextMenu.id));
          addLog('Conexão deletada.', 'warning');
      }
      setContextMenu(null);
  };

  const openEditModal = (type: 'node' | 'connection', id: string) => {
      if (type === 'node') {
          const node = nodes.find(n => n.id === id);
          if (node) {
              setEditType('node');
              setEditId(id);
              setEditLabel(node.label);
              setEditFormData({ ...node.parameters });
              setEditModalOpen(true);
          }
      } else {
          const conn = connections.find(c => c.id === id);
          if (conn) {
              setEditType('connection');
              setEditId(id);
              setEditLabel(conn.label || 'Stream');
              
              // If simulation results exist for this stream, populate form with calculated values
              // Otherwise use parameters
              if (conn.streamState && conn.streamState.totalTph > 0) {
                  setEditFormData({ 
                      ...conn.parameters,
                      _calculated: conn.streamState // Pass full state to visualize
                  });
              } else {
                  setEditFormData({ ...conn.parameters });
              }
              setEditModalOpen(true);
          }
      }
      setContextMenu(null);
  };

  const saveEditForm = () => {
      if (editType === 'node') {
          setNodes(prev => prev.map(n => n.id === editId ? { ...n, label: editLabel, parameters: { ...editFormData } } : n));
          addLog(`Parâmetros de '${editLabel}' atualizados.`, 'success');
      } else {
          setConnections(prev => prev.map(c => c.id === editId ? { ...c, label: editLabel, parameters: { ...editFormData } } : c));
          addLog(`Parâmetros da corrente '${editLabel}' atualizados.`, 'success');
      }
      setEditModalOpen(false);
  };

  const handleFormChange = (key: string, value: any) => {
      setEditFormData(prev => ({ ...prev, [key]: value }));
  };

  // --- Render Helpers ---
  const renderConnection = (conn: Connection) => {
      const start = getAbsolutePortPosition(conn.fromNode!, conn.fromPort!);
      const end = getAbsolutePortPosition(conn.toNode!, conn.toPort!);
      if (!start || !end) return null;

      // Aspen Style Orthogonal Path (H-V-H)
      const path = getOrthogonalPath(start, end);

      const isSelected = activeItem?.id === conn.id;

      return (
          <g key={conn.id} 
             onContextMenu={(e) => handleContextMenu(e, 'connection', conn.id)}
             onClick={() => openEditModal('connection', conn.id)}
             className="cursor-pointer group pointer-events-auto"
          >
              {/* Invisible wide stroke for easier clicking */}
              <path d={path} stroke="transparent" strokeWidth={20} fill="none" />
              
              {/* Visible Path */}
              <path d={path} 
                    stroke={isSelected ? '#f97316' : '#64748b'} 
                    strokeWidth={isSelected ? 4 : 2} 
                    fill="none" 
                    className="transition-colors duration-200 group-hover:stroke-orange-400"
                    strokeLinejoin="round"
              />
              
              {/* Arrow Head */}
              {/* We need to rotate the arrow based on the final segment direction. 
                  In this orthogonal logic, the final segment is always horizontal entering the port. 
              */}
              <path 
                  d={`M ${end.x} ${end.y} L ${end.x - 6} ${end.y - 3} L ${end.x - 6} ${end.y + 3} Z`} 
                  fill={isSelected ? '#f97316' : '#64748b'} 
              />
              
              {/* Label Badge */}
              <foreignObject x={(start.x + end.x)/2 - 20} y={(start.y + end.y)/2 - 10} width={40} height={20}>
                  <div className="bg-white border border-slate-200 text-[10px] text-center rounded text-slate-600 shadow-sm leading-tight pointer-events-none">
                      {conn.label || 'S'}
                  </div>
              </foreignObject>
          </g>
      );
  };

  // Helper for identifying active item for selection highlighting (implied)
  const activeItem = contextMenu; 

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-slate-50">
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-10 shadow-sm shrink-0">
         <div className="flex items-center space-x-2">
            <button 
                onClick={() => setActiveTool('pointer')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'pointer' ? 'bg-orange-100 text-orange-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Select / Move"
            >
                <MousePointer2 className="w-5 h-5" />
            </button>
            <button 
                onClick={() => setActiveTool('stream')}
                className={`p-2 rounded-lg transition-colors ${activeTool === 'stream' ? 'bg-orange-100 text-orange-600' : 'text-slate-500 hover:bg-slate-100'}`}
                title="Create Stream (Click on port or canvas)"
            >
                <Waves className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button 
                onClick={() => setShowMineralModal(true)}
                className="flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
            >
                <Database className="w-4 h-4 mr-2" />
                Minerais
            </button>
         </div>

         <div className="flex items-center space-x-3">
             <button 
                type="button"
                onClick={handleClearFlowsheetRequest}
                className="flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear Flowsheet"
             >
                <Trash2 className="w-5 h-5" />
             </button>
             
             <div className="h-6 w-px bg-slate-200 mx-1"></div>

             {/* Diagnostics Indicator moved to logs */}
             
             <button 
                onClick={handleRunSimulation}
                disabled={simState === 'running'}
                className={`flex items-center px-4 py-2 rounded-lg font-bold text-white shadow-md transition-all ${
                    simState === 'running' ? 'bg-slate-400 cursor-not-allowed' :
                    simState === 'success' ? 'bg-green-600 hover:bg-green-700' :
                    'bg-orange-600 hover:bg-orange-700'
                }`}
             >
                 {simState === 'running' ? (
                     <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div> Running...</>
                 ) : simState === 'success' ? (
                     <><Check className="w-4 h-4 mr-2" /> Converged</>
                 ) : (
                     <><Play className="w-4 h-4 mr-2" /> Run Simulation</>
                 )}
             </button>
             
             {simState === 'success' && (
                 <button 
                    onClick={onNavigateToResults}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md animate-in fade-in slide-in-from-right-4"
                 >
                     View Report <ArrowRight className="w-4 h-4 ml-2" />
                 </button>
             )}
         </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
         <div className="flex-1 flex overflow-hidden">
             {/* Sidebar - Equipment Palette */}
             {showSidebar && (
                 <div className="w-56 bg-white border-r border-slate-200 overflow-y-auto p-4 flex flex-col space-y-6 shadow-inner z-10 shrink-0">
                     <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Unit Operations</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(EQUIPMENT_CONFIGS).filter(([k]) => k !== 'Feed' && k !== 'Product').map(([key, config]) => (
                                <div 
                                    key={key}
                                    draggable
                                    onDragEnd={(e) => {
                                        const rect = canvasRef.current?.getBoundingClientRect();
                                        if(rect) addNode(key as NodeType, e.clientX - rect.left - NODE_WIDTH/2, e.clientY - rect.top - NODE_HEIGHT/2);
                                    }}
                                    className={`flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 hover:border-orange-300 hover:bg-orange-50 cursor-grab active:cursor-grabbing transition-all ${config.color.split(' ')[0]}`}
                                >
                                    <config.icon className={`w-6 h-6 mb-2 ${config.color.split(' ').pop()}`} />
                                    <span className="text-[10px] font-medium text-slate-700 text-center leading-tight">{config.label}</span>
                                </div>
                            ))}
                        </div>
                     </div>
                     
                     <div className="mt-auto">
                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <p className="font-bold mb-1 flex items-center"><Info className="w-3 h-3 mr-1"/> Tip:</p>
                            Drag nodes to canvas. Click & drag between ports to connect. Right-click to edit/delete.
                        </div>
                     </div>
                 </div>
             )}

             {/* Canvas Area */}
             <div 
                ref={canvasRef}
                className="flex-1 relative bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] overflow-hidden cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseUp={(e) => handleMouseUp(e, 'canvas')}
                onMouseDown={(e) => handleMouseDown(e, 'canvas')}
             >
                {/* SVG Layer for Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {connections.map(renderConnection)}
                    {drawingLine && (
                        <path 
                            d={getOrthogonalPath(
                                {x: drawingLine.startX, y: drawingLine.startY}, 
                                {x: drawingLine.currX, y: drawingLine.currY}
                            )}
                            stroke="#64748b" 
                            strokeWidth="2" 
                            strokeDasharray="5,5" 
                            fill="none"
                        />
                    )}
                </svg>

                {/* Nodes Layer */}
                {nodes.map(node => {
                    const config = EQUIPMENT_CONFIGS[node.type];
                    const isCompact = node.type === 'Feed' || node.type === 'Product';
                    const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
                    const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
                    
                    return (
                        <div 
                            key={node.id}
                            style={{ left: node.x, top: node.y, width, height }}
                            className={`absolute group shadow-sm hover:shadow-md transition-shadow select-none
                                ${isCompact ? 'rounded-full' : 'rounded-lg'}
                                ${config.color.split(' ')[0]} border ${config.color.split(' ')[1] || 'border-slate-300'}
                            `}
                            onMouseDown={(e) => handleMouseDown(e, 'node', node.id)}
                            onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                            onDoubleClick={() => openEditModal('node', node.id)}
                        >
                             {!isCompact && (
                                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                     <config.icon className={`w-6 h-6 mb-1 ${config.color.split(' ').pop()}`} />
                                     <span className="text-xs font-bold text-slate-700 px-1 truncate max-w-full">{node.label}</span>
                                 </div>
                             )}
                             {isCompact && (
                                 <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                     <div className={`w-2 h-2 rounded-full ${node.type === 'Feed' ? 'bg-green-500' : 'bg-red-500'}`} />
                                     {/* Label floating above */}
                                     <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity">
                                         {node.label}
                                     </div>
                                 </div>
                             )}

                             {/* Ports */}
                             {config.inputs.map((port, idx) => {
                                 const total = config.inputs.length;
                                 const top = isCompact ? '50%' : `${(idx + 1) * (100 / (total + 1))}%`;
                                 return (
                                     <div 
                                        key={port.id}
                                        style={{ top, left: -6 }}
                                        className={`absolute w-3 h-3 bg-white border-2 border-slate-400 rounded-full hover:border-orange-500 cursor-pointer z-20 ${isCompact ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
                                        title={port.label || 'Input'}
                                        onMouseDown={(e) => handleMouseDown(e, 'port', node.id, port.id)}
                                        onMouseUp={(e) => handleMouseUp(e, 'port', node.id, port.id)}
                                     />
                                 );
                             })}
                             {config.outputs.map((port, idx) => {
                                 const total = config.outputs.length;
                                 const top = isCompact ? '50%' : `${(idx + 1) * (100 / (total + 1))}%`;
                                 return (
                                     <div 
                                        key={port.id}
                                        style={{ top, right: -6 }}
                                        className={`absolute w-3 h-3 bg-white border-2 border-slate-400 rounded-full hover:border-orange-500 cursor-pointer z-20 ${isCompact ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}
                                        title={port.label || 'Output'}
                                        onMouseDown={(e) => handleMouseDown(e, 'port', node.id, port.id)}
                                        onMouseUp={(e) => handleMouseUp(e, 'port', node.id, port.id)}
                                     />
                                 );
                             })}
                        </div>
                    );
                })}

             </div>
         </div>
         
         {/* Logger Console Panel (Collapsible) */}
         <div className={`border-t border-slate-800 bg-slate-900 transition-all duration-300 flex flex-col z-20 ${isLogOpen ? 'h-48' : 'h-8'}`}>
             <div className="flex items-center justify-between px-3 h-8 bg-slate-800 text-slate-300 border-b border-slate-700 select-none cursor-pointer" onClick={() => setIsLogOpen(!isLogOpen)}>
                 <div className="flex items-center space-x-2">
                     <Terminal className="w-3.5 h-3.5" />
                     <span className="text-xs font-bold uppercase tracking-wider">Console & Logs</span>
                 </div>
                 <div className="flex items-center space-x-2">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setLogs([]); }}
                        className="p-1 hover:text-white hover:bg-slate-700 rounded"
                        title="Clear logs"
                    >
                        <Eraser className="w-3.5 h-3.5" />
                    </button>
                    {isLogOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                 </div>
             </div>
             {isLogOpen && (
                 <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1">
                     {logs.length === 0 && (
                         <div className="text-slate-600 italic px-2">Nenhum log registrado. Execute ações no fluxograma.</div>
                     )}
                     {logs.map((log) => (
                         <div key={log.id} className="flex items-start hover:bg-slate-800/50 rounded px-2 py-0.5 transition-colors">
                             <span className="text-slate-500 mr-3 min-w-[60px]">{log.timestamp}</span>
                             <span className="mr-2 mt-0.5">
                                 {log.type === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                                 {log.type === 'warning' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
                                 {log.type === 'success' && <CheckCircle className="w-3 h-3 text-green-500" />}
                                 {log.type === 'info' && <Info className="w-3 h-3 text-blue-400" />}
                             </span>
                             <span className={`
                                 ${log.type === 'error' ? 'text-red-400' : ''}
                                 ${log.type === 'warning' ? 'text-yellow-400' : ''}
                                 ${log.type === 'success' ? 'text-green-400' : ''}
                                 ${log.type === 'info' ? 'text-slate-300' : ''}
                             `}>
                                 {log.message}
                             </span>
                         </div>
                     ))}
                     <div ref={logEndRef} />
                 </div>
             )}
         </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
          <div 
            style={{ left: contextMenu.x, top: contextMenu.y }} 
            className="fixed bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-40 z-50 animate-in fade-in zoom-in-95 duration-100"
          >
              <button onClick={() => openEditModal(contextMenu.type, contextMenu.id)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center">
                  <Edit className="w-4 h-4 mr-2 text-slate-500" /> Edit
              </button>
              <button onClick={deleteItem} className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 text-red-600 flex items-center">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
              </button>
          </div>
      )}

      {/* Clear Flowsheet Confirmation Modal (Custom) */}
      {showClearConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
               <div className="bg-white p-6 rounded-xl shadow-2xl border border-slate-200 w-96 animate-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4 mx-auto">
                        <Trash2 className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Limpar Fluxograma?</h3>
                    <p className="text-slate-500 text-center text-sm mb-6">
                        Esta ação removerá todos os equipamentos e conexões atuais. Esta operação é irreversível.
                    </p>
                    <div className="flex justify-center space-x-3">
                        <button 
                            onClick={() => setShowClearConfirm(false)} 
                            className="px-4 py-2 text-slate-700 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleConfirmClear} 
                            className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md transition-colors"
                        >
                            Confirmar Limpeza
                        </button>
                    </div>
               </div>
          </div>
      )}

      {/* Edit Modal (Generic) */}
      {editModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-lg">Edit {editType === 'node' ? 'Component' : 'Stream'}</h3>
                      <button onClick={() => setEditModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                      {/* Common: Label */}
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name / Tag</label>
                          <input 
                            type="text" 
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                      </div>

                      {/* Display Simulation Results if available (Read-Only) */}
                      {editFormData._calculated && (
                          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4">
                              <h4 className="text-xs font-bold text-blue-600 uppercase mb-2 flex items-center"><Activity className="w-3 h-3 mr-1"/> Calculated State</h4>
                              <div className="grid grid-cols-2 gap-y-1 text-sm">
                                  <span className="text-slate-500">Total Mass:</span>
                                  <span className="font-mono text-slate-800">{editFormData._calculated.totalTph.toFixed(1)} t/h</span>
                                  <span className="text-slate-500">Solids:</span>
                                  <span className="font-mono text-slate-800">{editFormData._calculated.solidsTph.toFixed(1)} t/h</span>
                                  <span className="text-slate-500">Water:</span>
                                  <span className="font-mono text-slate-800">{editFormData._calculated.waterTph.toFixed(1)} m³/h</span>
                                  <span className="text-slate-500">% Solids:</span>
                                  <span className="font-mono text-slate-800">{editFormData._calculated.percentSolids.toFixed(1)} %</span>
                              </div>
                          </div>
                      )}

                      {/* Parameters Form */}
                      {Object.entries(editFormData).filter(([k]) => !k.startsWith('_')).map(([key, value]) => {
                          if (key.startsWith('mineral_')) return null; // Handle minerals separately
                          return (
                            <div key={key}>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                <input 
                                    type={typeof value === 'number' ? 'number' : 'text'}
                                    value={value}
                                    onChange={(e) => handleFormChange(key, e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                          );
                      })}

                      {/* Connection Specific: Mineral Grade Input (Only for streams connected to Feed nodes essentially, but allowed everywhere for overrides) */}
                      {editType === 'connection' && (
                          <div className="border-t border-slate-200 pt-4">
                              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                                  <Database className="w-4 h-4 mr-2 text-purple-600" />
                                  Composition (%)
                              </h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                  {minerals.filter(m => m.selected).map(mineral => (
                                      <div key={mineral.id} className="flex items-center justify-between">
                                          <span className="text-sm text-slate-600 truncate flex-1">{mineral.name}</span>
                                          <input 
                                            type="number"
                                            placeholder="0.0"
                                            value={editFormData[`mineral_${mineral.id}`] || ''}
                                            onChange={(e) => handleFormChange(`mineral_${mineral.id}`, parseFloat(e.target.value))}
                                            className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-sm focus:ring-1 focus:ring-purple-500 outline-none"
                                          />
                                      </div>
                                  ))}
                              </div>
                              <p className="text-xs text-slate-400 mt-2 text-right">Must sum to 100% (approx)</p>
                          </div>
                      )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end space-x-2">
                      <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg">Cancel</button>
                      <button onClick={saveEditForm} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 shadow-sm">Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {/* Minerals Management Modal */}
      {showMineralModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
               <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                   <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center">
                            <Database className="w-6 h-6 mr-3 text-purple-600" />
                            Database de Minerais
                        </h2>
                        <p className="text-sm text-slate-500">Gerencie os componentes que serão simulados no balanço.</p>
                      </div>
                      <button onClick={() => setShowMineralModal(false)}><X className="w-6 h-6 text-slate-400" /></button>
                   </div>
                   
                   <div className="flex-1 overflow-hidden flex flex-col">
                       {mineralViewMode === 'list' ? (
                           <>
                                <div className="p-4 border-b border-slate-200 flex space-x-4">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar mineral (ex: Quartzo, Au...)"
                                            value={mineralSearch}
                                            onChange={(e) => setMineralSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleCreateMineral}
                                        className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center"
                                    >
                                        <Plus className="w-4 h-4 mr-2" /> Novo
                                    </button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200">
                                                <th className="py-3 pl-2 w-10">Use</th>
                                                <th className="py-3">Name</th>
                                                <th className="py-3">Formula</th>
                                                <th className="py-3">SG</th>
                                                <th className="py-3">Type</th>
                                                <th className="py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredMinerals.map(min => (
                                                <tr key={min.id} className="border-b border-slate-100 hover:bg-slate-50 group">
                                                    <td className="py-3 pl-2">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={min.selected} 
                                                            onChange={() => handleToggleSelection(min.id)}
                                                            className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="py-3 font-medium text-slate-900">{min.name}</td>
                                                    <td className="py-3 font-mono text-slate-600 text-sm">{min.formula}</td>
                                                    <td className="py-3 text-slate-600">{min.density}</td>
                                                    <td className="py-3">
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                                            {min.class}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEditMineral(min)} className="p-1 text-blue-600 hover:bg-blue-100 rounded"><Edit className="w-4 h-4" /></button>
                                                            <button onClick={() => handleDeleteMineral(min.id)} className="p-1 text-red-600 hover:bg-red-100 rounded"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                           </>
                       ) : (
                           <div className="p-6 overflow-y-auto">
                               <button onClick={() => setMineralViewMode('list')} className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-800">
                                   <ArrowLeft className="w-4 h-4 mr-1" /> Voltar para lista
                               </button>
                               <div className="grid grid-cols-2 gap-6">
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                                       <input type="text" value={currentMineral.name || ''} onChange={e => setCurrentMineral(p => ({...p, name: e.target.value}))} className="w-full border p-2 rounded" />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1">Fórmula Química</label>
                                       <input type="text" value={currentMineral.formula || ''} onChange={e => setCurrentMineral(p => ({...p, formula: e.target.value}))} className="w-full border p-2 rounded" />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1">Densidade (SG)</label>
                                       <input type="number" value={currentMineral.density || ''} onChange={e => setCurrentMineral(p => ({...p, density: parseFloat(e.target.value)}))} className="w-full border p-2 rounded" />
                                   </div>
                                   <div>
                                       <label className="block text-sm font-medium text-slate-700 mb-1">Classificação</label>
                                       <select value={currentMineral.class || 'Silicate'} onChange={e => setCurrentMineral(p => ({...p, class: e.target.value}))} className="w-full border p-2 rounded">
                                           <option value="Silicate">Silicato</option>
                                           <option value="Sulfide">Sulfeto</option>
                                           <option value="Oxide">Óxido</option>
                                           <option value="Carbonate">Carbonato</option>
                                           <option value="Native Element">Nativo</option>
                                       </select>
                                   </div>
                                   <div className="col-span-2">
                                       <label className="block text-sm font-medium text-slate-700 mb-1">Composição Elementar (Texto)</label>
                                       <input type="text" placeholder="Ex: Fe: 69.9%, O: 30.1%" value={currentMineral.elementalComposition || ''} onChange={e => setCurrentMineral(p => ({...p, elementalComposition: e.target.value}))} className="w-full border p-2 rounded" />
                                       <p className="text-xs text-slate-500 mt-1">Usado para cálculo de ensaios químicos (Assays).</p>
                                   </div>
                               </div>
                               <div className="mt-8 flex justify-end">
                                   <button onClick={handleSaveMineral} className="px-6 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center">
                                       <SaveIcon className="w-4 h-4 mr-2" /> Salvar Mineral
                                   </button>
                               </div>
                           </div>
                       )}
                   </div>
               </div>
          </div>
      )}

    </div>
  );
};
