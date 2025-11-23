

import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings2, 
  Hammer, 
  Boxes, 
  Layers, 
  Shuffle, 
  Trash2, 
  MousePointer2, 
  ArrowUpRight,
  Save,
  RotateCcw,
  AlertTriangle,
  X,
  Edit,
  MoreHorizontal,
  Check,
  Play,
  Pause,
  PanelLeft,
  Search,
  Beaker,
  Database,
  ExternalLink,
  CheckSquare,
  Plus,
  ArrowLeft,
  Save as SaveIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Thermometer,
  Gauge,
  Scale,
  Droplets,
  Waves,
  Split,
  Filter,
  ArrowRight,
  MousePointer,
  FileText,
  Table,
  Activity,
  CheckCircle,
  Calculator,
  Menu,
  Tag,
  FlaskConical,
  Atom,
  Square,
  CheckSquare2
} from 'lucide-react';
import { 
  NodeType, 
  EquipmentConfig, 
  NodeData, 
  Connection,
  Mineral,
  StreamData
} from '../types';
import { solveFlowsheet, SimulationResult } from '../services/flowsheetSolver';

// --- Mock Database (Extended Webmineral.com Data) ---
const WEBMINERAL_DB: Mineral[] = [
  { id: '1', name: 'Quartz', formula: 'SiO2', density: 2.65, abrasionIndex: 0.75, workIndex: 13.5, class: 'Silicate', molecularWeight: 60.08, elementalComposition: 'Si: 46.74%, O: 53.26%', color: 'Colorless, White', luster: 'Vitreous', selected: true },
  { id: '2', name: 'Hematite', formula: 'Fe2O3', density: 5.26, abrasionIndex: 0.30, workIndex: 12.8, class: 'Oxide', molecularWeight: 159.69, elementalComposition: 'Fe: 69.94%, O: 30.06%', color: 'Steel grey, Reddish brown', luster: 'Metallic', selected: false },
  { id: '3', name: 'Magnetite', formula: 'Fe3O4', density: 5.18, abrasionIndex: 0.25, workIndex: 10.0, class: 'Oxide', molecularWeight: 231.53, elementalComposition: 'Fe: 72.36%, O: 27.64%', color: 'Iron black', luster: 'Metallic', selected: false },
  { id: '5', name: 'Pyrite', formula: 'FeS2', density: 5.01, abrasionIndex: 0.45, workIndex: 14.0, class: 'Sulfide', molecularWeight: 119.98, elementalComposition: 'Fe: 46.55%, S: 53.45%', color: 'Pale brass yellow', luster: 'Metallic', selected: true },
  { id: '6', name: 'Chalcopyrite', formula: 'CuFeS2', density: 4.2, abrasionIndex: 0.12, workIndex: 10.5, class: 'Sulfide', molecularWeight: 183.53, elementalComposition: 'Cu: 34.63%, Fe: 30.43%, S: 34.94%', color: 'Brass yellow', luster: 'Metallic', selected: true },
  { id: '7', name: 'Bornite', formula: 'Cu5FeS4', density: 5.06, abrasionIndex: 0.10, workIndex: 9.0, class: 'Sulfide', molecularWeight: 501.84, elementalComposition: 'Cu: 63.31%, Fe: 11.13%, S: 25.56%', color: 'Copper red', luster: 'Metallic', selected: false },
  { id: '10', name: 'Galena', formula: 'PbS', density: 7.58, abrasionIndex: 0.05, workIndex: 8.5, class: 'Sulfide', molecularWeight: 239.27, elementalComposition: 'Pb: 86.60%, S: 13.40%', color: 'Lead grey', luster: 'Metallic', selected: false },
  { id: '11', name: 'Sphalerite', formula: 'ZnS', density: 4.0, abrasionIndex: 0.18, workIndex: 11.5, class: 'Sulfide', molecularWeight: 97.47, elementalComposition: 'Zn: 67.09%, S: 32.90%', color: 'Yellow, Brown, Black', luster: 'Resinous', selected: false },
  { id: '12', name: 'Calcite', formula: 'CaCO3', density: 2.71, abrasionIndex: 0.02, workIndex: 5.0, class: 'Carbonate', molecularWeight: 100.09, elementalComposition: 'Ca: 40.04%, C: 12.00%, O: 47.96%', color: 'White, Colorless', luster: 'Vitreous', selected: false },
  { id: '20', name: 'Gold', formula: 'Au', density: 19.3, abrasionIndex: 0.01, workIndex: 6.0, class: 'Native Element', molecularWeight: 196.97, elementalComposition: 'Au: 100.00%', color: 'Gold yellow', luster: 'Metallic', selected: true },
];

interface ProjectViewProps {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  onSimulationComplete: (results: SimulationResult) => void;
  onNavigateToResults: () => void;
}

const EQUIPMENT_CONFIGS: Record<NodeType, EquipmentConfig> = {
  'Feed': {
    type: 'Feed', icon: ArrowRight, label: 'Feed', color: 'bg-transparent border-0',
    inputs: [],
    outputs: [{ id: 'out', type: 'output', label: 'Stream' }],
    defaultParameters: { 
        solidsTph: 100, 
        percentSolids: 60, 
        sg: 2.7, 
        description: 'Fresh Feed' 
    }
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
  onSimulationComplete,
  onNavigateToResults
}) => {
  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused' | 'success'>('idle');
  const [activeTool, setActiveTool] = useState<'pointer' | 'stream'>('pointer');
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  
  // Interaction State
  const [draggingNode, setDraggingNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [activeItem, setActiveItem] = useState<{ id: string; type: 'node' | 'connection'; x: number; y: number; data?: any; } | null>(null);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'node' | 'connection'; id: string } | null>(null);

  // Connection Drawing State
  const [drawingLine, setDrawingLine] = useState<{ 
      fromNode: string; 
      fromPort: string; 
      startX: number; 
      startY: number; 
      currX: number; 
      currY: number; 
  } | null>(null);

  // Modals State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editLabel, setEditLabel] = useState(''); // Separate state for Label editing
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Mineral State
  const [showMineralModal, setShowMineralModal] = useState(false);
  const [minerals, setMinerals] = useState<Mineral[]>(WEBMINERAL_DB);
  const [mineralSearch, setMineralSearch] = useState('');
  const [mineralViewMode, setMineralViewMode] = useState<'list' | 'edit'>('list');
  const [currentMineral, setCurrentMineral] = useState<Partial<Mineral>>({});

  const canvasRef = useRef<HTMLDivElement>(null);

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

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
        return prev.map(m => m.id === currentMineral.id ? currentMineral as Mineral : m);
      } else {
        return [...prev, currentMineral as Mineral];
      }
    });
    setMineralViewMode('list');
  };

  const handleDeleteMineral = (id: string) => {
    if (confirm('Tem certeza que deseja remover este mineral da base de dados?')) {
      setMinerals(prev => prev.filter(m => m.id !== id));
    }
  };

  const filteredMinerals = minerals.filter(m => 
    m.name.toLowerCase().includes(mineralSearch.toLowerCase()) || 
    m.formula.toLowerCase().includes(mineralSearch.toLowerCase())
  );

  // --- Simulation Logic ---
  const handleRunSimulation = () => {
      setSimState('running');
      setDiagnostics([]);
      
      setTimeout(() => {
          try {
              // Pass minerals DB to solver so it can calculate assays from mineral grades
              const result = solveFlowsheet(nodes, connections, minerals);
              
              if (result.diagnostics.length > 0) {
                 setSimState('idle');
                 setDiagnostics(result.diagnostics);
                 
                 if (!result.converged && result.error === 100) {
                     return; 
                 }
              }

              const updatedConnections = connections.map(c => ({
                  ...c,
                  streamState: result.streams[c.id]
              }));
              setConnections(updatedConnections);
              
              onSimulationComplete(result);

              if (result.converged && result.error < 1) {
                  setSimState('success');
                  setTimeout(() => setSimState('idle'), 5000); 
              } else {
                  setSimState('idle');
              }

          } catch (e) {
              console.error(e);
              setSimState('idle');
              setDiagnostics(['Erro interno na simulação.']);
          }
      }, 500); 
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
    if (inputIndex !== -1) {
        return {
            x: node.x, 
            y: node.y + (height * ((inputIndex + 1) / (config.inputs.length + 1)))
        };
    }

    const outputIndex = config.outputs.findIndex(p => p.id === portId);
    if (outputIndex !== -1) {
        return {
            x: node.x + width, 
            y: node.y + (height * ((outputIndex + 1) / (config.outputs.length + 1)))
        };
    }
    return null;
  };

  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
     if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) return '';
     const midX = (x1 + x2) / 2;
     return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  };

  // --- Event Handlers ---

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, type: string) => {
    if (activeTool !== 'pointer') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const type = e.dataTransfer.getData('application/reactflow') as NodeType;
    // @ts-ignore
    if (!type || !EQUIPMENT_CONFIGS[type]) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const width = (type === 'Feed' || type === 'Product') ? COMPACT_NODE_WIDTH : NODE_WIDTH;
    const height = (type === 'Feed' || type === 'Product') ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
    
    const newNode: NodeData = {
      id: `node_${Date.now()}`,
      type,
      x: e.clientX - bounds.left - (width / 2),
      y: e.clientY - bounds.top - (height / 2),
      label: type === 'Feed' ? 'Feed' : (type === 'Product' ? 'Product' : type),
      // @ts-ignore
      parameters: { ...EQUIPMENT_CONFIGS[type].defaultParameters }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  // -- Canvas Interaction --

  const onCanvasMouseDown = (e: React.MouseEvent) => {
     if (e.button !== 0) return;
     setActiveItem(null);

     if (activeTool === 'stream') {
         if (!canvasRef.current) return;
         const bounds = canvasRef.current.getBoundingClientRect();
         const mouseX = e.clientX - bounds.left;
         const mouseY = e.clientY - bounds.top;

         const newNodeId = `node_feed_${Date.now()}`;
         const newNode: NodeData = {
             id: newNodeId,
             type: 'Feed',
             x: mouseX - (COMPACT_NODE_WIDTH / 2),
             y: mouseY - (COMPACT_NODE_HEIGHT / 2),
             label: 'Feed',
             parameters: { ...EQUIPMENT_CONFIGS['Feed'].defaultParameters }
         };
         
         setNodes(prev => [...prev, newNode]);
         
         const portX = mouseX;
         const portY = mouseY;
         
         setDrawingLine({
             fromNode: newNodeId,
             fromPort: 'out',
             startX: portX,
             startY: portY,
             currX: mouseX,
             currY: mouseY
         });
     }
  };

  const onCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - bounds.left;
    const mouseY = e.clientY - bounds.top;

    if (draggingNode) {
        setNodes(nds => nds.map(n => n.id === draggingNode.id ? { ...n, x: mouseX - draggingNode.offsetX, y: mouseY - draggingNode.offsetY } : n));
        return;
    }

    if (drawingLine) {
        setDrawingLine(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
    }
  };

  const onCanvasMouseUp = (e: React.MouseEvent) => {
      setDraggingNode(null);

      if (activeTool === 'stream' && drawingLine) {
          if (!canvasRef.current) return;
          const bounds = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - bounds.left;
          const mouseY = e.clientY - bounds.top;
          
          const dist = Math.sqrt(Math.pow(mouseX - drawingLine.startX, 2) + Math.pow(mouseY - drawingLine.startY, 2));
          if (dist < 10) {
              setDrawingLine(null);
              return;
          }

          const newNodeId = `node_prod_${Date.now()}`;
          const newNode: NodeData = {
              id: newNodeId,
              type: 'Product',
              x: mouseX - (COMPACT_NODE_WIDTH / 2),
              y: mouseY - (COMPACT_NODE_HEIGHT / 2),
              label: 'Product',
              parameters: { ...EQUIPMENT_CONFIGS['Product'].defaultParameters }
          };
          
          setNodes(prev => [...prev, newNode]);
          
          const newConn: Connection = {
              id: `conn_${Date.now()}`,
              label: `Stream ${connections.length + 1}`,
              fromNode: drawingLine.fromNode,
              fromPort: drawingLine.fromPort,
              toNode: newNodeId,
              toPort: 'in',
              parameters: { volumetricFlow: 0, percentSolids: 0 }
          };
          
          setConnections(prev => [...prev, newConn]);
          setDrawingLine(null);
      }
      
      if (drawingLine && activeTool !== 'stream') {
          setDrawingLine(null);
      }
  };

  // -- Port Interaction --

  const onPortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return; // Left click only
      
      const pos = getAbsolutePortPosition(nodeId, portId);
      if (pos) {
          setDrawingLine({
              fromNode: nodeId,
              fromPort: portId,
              startX: pos.x,
              startY: pos.y,
              currX: pos.x,
              currY: pos.y
          });
      }
  };

  const onPortMouseUp = (e: React.MouseEvent, nodeId: string, portId: string) => {
      e.stopPropagation();
      
      if (drawingLine) {
          if (drawingLine.fromNode === nodeId && drawingLine.fromPort === portId) {
              setDrawingLine(null);
              return;
          }
          
          const newConn: Connection = {
              id: `conn_${Date.now()}`,
              label: `Stream ${connections.length + 1}`,
              fromNode: drawingLine.fromNode,
              fromPort: drawingLine.fromPort,
              toNode: nodeId,
              toPort: portId,
              parameters: { volumetricFlow: 0, percentSolids: 0 }
          };

          setConnections(prev => [...prev, newConn]);
          setDrawingLine(null);
      }
  };

  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (e.button !== 0) return; 

      if (activeTool === 'pointer') {
        setDraggingNode({ id: nodeId, offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY });
        setActiveItem(null);
      }
  };

  // -- Context Menu Logic --
  const handleContextMenu = (e: React.MouseEvent, type: 'node' | 'connection', id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
          x: e.clientX,
          y: e.clientY,
          type,
          id
      });
      const item = type === 'node' 
          ? nodes.find(n => n.id === id) 
          : connections.find(c => c.id === id);
      if (item) {
           // @ts-ignore
           setActiveItem({ id, type, x: 0, y: 0, data: item });
      }
  };

  // --- Edit Logic ---
  const handleOpenEditModal = (item?: { id: string; type: 'node' | 'connection'; data?: any }) => {
    const target = item || (contextMenu ? { id: contextMenu.id, type: contextMenu.type } : activeItem);
    if (!target) return;
    
    // Resolve data if missing
    let data = target.data;
    if (!data) {
        if (target.type === 'node') data = nodes.find(n => n.id === target.id);
        else data = connections.find(c => c.id === target.id);
    }

    setActiveItem({ id: target.id, type: target.type as 'node'|'connection', x: 0, y: 0, data });
    setEditFormData(data?.parameters || {});
    setEditLabel(target.type === 'connection' ? (data.label || '') : (data.label || ''));
    setEditModalOpen(true);
    setContextMenu(null);
  };

  const handleSaveEditModal = () => {
      if (!activeItem) return;
      if (activeItem.type === 'node') {
          setNodes(nds => nds.map(n => n.id === activeItem.id ? { ...n, parameters: editFormData, label: editLabel || n.label } : n));
      } else {
          setConnections(c => c.map(x => x.id === activeItem.id ? { ...x, parameters: editFormData, label: editLabel || x.label } : x));
      }
      setEditModalOpen(false);
      setActiveItem(null);
  };

  const handleDeleteItem = (id: string, type: 'node' | 'connection') => {
    if (type === 'node') {
        setNodes(n => n.filter(x => x.id !== id));
        setConnections(c => c.filter(x => x.fromNode !== id && x.toNode !== id));
    } else {
        setConnections(c => c.filter(x => x.id !== id));
    }
    setContextMenu(null);
    setEditModalOpen(false);
    setActiveItem(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative">
      {/* Toolbar */}
      <header className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition-colors ${showSidebar ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                <PanelLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button onClick={() => { setShowMineralModal(true); setMineralSearch(''); setMineralViewMode('list'); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-purple-300 transition-all">
                <Beaker className="w-4 h-4 mr-2 text-purple-600" /> Components
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button 
                onClick={handleRunSimulation}
                disabled={simState === 'running'} 
                className={`px-4 py-2 rounded-lg flex items-center font-bold text-sm transition-all shadow-sm ${simState === 'running' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : (simState === 'success' ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-green-50 hover:text-green-700')}`}
            >
                {simState === 'running' && <Activity className="w-4 h-4 mr-2 animate-spin" />}
                {simState === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
                {simState === 'idle' && <Play className="w-4 h-4 mr-2" />}
                {simState === 'running' ? 'Calculando Balanço...' : (simState === 'success' ? 'Simulado' : 'Simulate')}
            </button>
            
            {simState === 'success' && (
                <button onClick={onNavigateToResults} className="px-3 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 text-sm flex items-center animate-in fade-in">
                    Ver Resultados <ArrowRight className="w-3 h-3 ml-1" />
                </button>
            )}
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowClearModal(true)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Validation Diagnostics */}
      {diagnostics.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start animate-in fade-in slide-in-from-top-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
              <div>
                  <h4 className="text-sm font-bold text-red-800">Alerta de Simulação</h4>
                  <ul className="list-disc list-inside text-sm text-red-700 mt-1">
                      {diagnostics.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
              </div>
              <button onClick={() => setDiagnostics([])} className="ml-auto text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
          </div>
      )}

      <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none relative">
        {/* Sidebar */}
        <div className={`bg-slate-50 border-r border-slate-200 flex flex-col z-20 transition-all duration-300 ${showSidebar ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none overflow-hidden'}`}>
           <div className="p-4 border-b border-slate-200">
              <div className="flex space-x-2 bg-slate-200 p-1 rounded-lg mb-4">
                  <button 
                    onClick={() => setActiveTool('pointer')}
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-sm font-medium transition-all ${activeTool === 'pointer' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <MousePointer2 className="w-4 h-4 mr-1.5" /> Select
                  </button>
                  <button 
                    onClick={() => setActiveTool('stream')}
                    className={`flex-1 flex items-center justify-center py-1.5 rounded-md text-sm font-medium transition-all ${activeTool === 'stream' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                      <Waves className="w-4 h-4 mr-1.5" /> Stream
                  </button>
              </div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Equipamentos</h3>
           </div>
           <div className="flex-1 p-4 overflow-y-auto">
               <div className="space-y-3">
                {Object.values(EQUIPMENT_CONFIGS)
                  .filter(item => item.type !== 'Feed' && item.type !== 'Product')
                  .map((item) => (
                    <div key={item.type} onDragStart={(e) => handleDragStart(e, item.type)} draggable={activeTool === 'pointer'} className={`flex items-center p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white transition-all ${activeTool === 'pointer' ? 'cursor-move hover:border-blue-400 hover:shadow-md' : 'opacity-50 cursor-not-allowed'}`}>
                        <item.icon className="w-5 h-5 text-slate-500 mr-3" /> <span className="text-slate-700 font-medium">{item.label}</span>
                    </div>
                ))}
               </div>
           </div>
        </div>

        {/* Main Canvas */}
        <div 
            className={`flex-1 relative bg-slate-50 overflow-hidden ${activeTool === 'stream' ? 'cursor-crosshair' : 'cursor-default'}`} 
            ref={canvasRef} 
            onMouseDown={onCanvasMouseDown} 
            onMouseMove={onCanvasMouseMove}
            onMouseUp={onCanvasMouseUp}
            onContextMenu={(e) => e.preventDefault()} 
        >
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            <div className="absolute inset-0 w-full h-full" onDrop={handleDrop} onDragOver={handleDragOver}>
                
                {/* Layer 1: Connections */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" /></marker>
                    </defs>
                    {connections.map(conn => {
                        let start = { x: 0, y: 0 }, end = { x: 0, y: 0 };
                        if (conn.fromNode && conn.fromPort) { const pos = getAbsolutePortPosition(conn.fromNode, conn.fromPort); if (pos) start = pos; }
                        if (conn.toNode && conn.toPort) { const pos = getAbsolutePortPosition(conn.toNode, conn.toPort); if (pos) end = pos; }
                        if (!start.x && !end.x) return null;
                        
                        const isActive = activeItem?.id === conn.id;
                        const midX = (start.x + end.x) / 2;
                        const midY = (start.y + end.y) / 2;
                        // Orthogonal midpoint approximation for label placement
                        const labelX = midX; 
                        const labelY = start.y; // Place on horizontal segment if possible, or simple mid

                        return (
                            <g 
                                key={conn.id} 
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenEditModal({ id: conn.id, type: 'connection', data: conn });
                                }}
                                onContextMenu={(e) => handleContextMenu(e, 'connection', conn.id)}
                                className="pointer-events-auto cursor-pointer group"
                            >
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke="transparent" strokeWidth="20" fill="none" />
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke={isActive ? "#2563eb" : "#64748b"} strokeWidth={isActive ? "3" : "2"} fill="none" markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"} className="transition-all group-hover:stroke-slate-600" />
                                
                                {/* Label Tag */}
                                <foreignObject x={labelX - 40} y={labelY - 12} width="80" height="24" style={{ overflow: 'visible' }}>
                                    <div 
                                        onClick={(e) => {e.stopPropagation(); handleOpenEditModal({ id: conn.id, type: 'connection', data: conn });}}
                                        className={`flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-sm transition-all whitespace-nowrap cursor-pointer hover:scale-110 ${isActive ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                                    >
                                        {conn.label || 'Stream'}
                                    </div>
                                </foreignObject>
                            </g>
                        );
                    })}
                </svg>

                {/* Layer 2: Nodes */}
                {nodes.map((node) => {
                    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
                    if (!config) return null;
                    const isActive = activeItem?.id === node.id;
                    const isCompact = node.type === 'Feed' || node.type === 'Product';
                    const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
                    const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
                    
                    if (isCompact) {
                        return (
                             <div 
                                key={node.id}
                                onMouseDown={(e) => onNodeMouseDown(e, node.id)}
                                onDoubleClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleOpenEditModal({ id: node.id, type: 'node', data: node });
                                }}
                                onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                                style={{ left: node.x, top: node.y, width: width, height: height, position: 'absolute' }}
                                className="group z-10 cursor-pointer" 
                             >
                                <div className={`w-full h-full rounded-full border bg-slate-400 opacity-0 group-hover:opacity-100 group-hover:bg-white group-hover:border-slate-400 transition-all duration-200 ${isActive ? 'opacity-100 bg-blue-100 border-blue-500 ring-2 ring-blue-200' : ''}`} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                     {config.inputs.map(port => (
                                        <div key={port.id} className="absolute w-full h-full" onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)} onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)} />
                                     ))}
                                     {config.outputs.map(port => (
                                        <div key={port.id} className="absolute w-full h-full" onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)} onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)} />
                                     ))}
                                </div>
                             </div>
                        );
                    }

                    return (
                        <div 
                            key={node.id} 
                            onMouseDown={(e) => onNodeMouseDown(e, node.id)} 
                            onDoubleClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenEditModal({ id: node.id, type: 'node', data: node });
                            }}
                            onContextMenu={(e) => handleContextMenu(e, 'node', node.id)}
                            style={{ left: node.x, top: node.y, width: width, height: height, position: 'absolute' }} 
                            className={`group rounded-lg transition-all flex flex-col cursor-pointer bg-white border-2 shadow-sm hover:shadow-md z-20 ${config.color} ${isActive ? 'ring-2 ring-blue-500 shadow-lg scale-105 z-40' : ''}`}
                        >
                            <div className={`flex items-center justify-center p-1 w-full h-full pointer-events-none`}>
                                <config.icon className={`w-5 h-5 mr-1 opacity-75`} />
                                <span className="text-xs font-bold truncate">{node.label}</span>
                            </div>
                            <div className="absolute inset-0 w-full h-full">
                                {config.inputs.map((port, idx) => {
                                    const topPos = ((idx + 1) * (100 / (config.inputs.length + 1))) + '%';
                                    return <div key={port.id} className="absolute w-8 h-8 flex items-center justify-center cursor-crosshair z-[100]" style={{ top: topPos, left: '-16px', transform: 'translateY(-50%)' }} onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)} onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)}><div className="w-3 h-3 rounded-full border border-slate-600 bg-green-400 pointer-events-none"></div></div>;
                                })}
                                {config.outputs.map((port, idx) => {
                                     const topPos = ((idx + 1) * (100 / (config.outputs.length + 1))) + '%';
                                    return <div key={port.id} className="absolute w-8 h-8 flex items-center justify-center cursor-crosshair z-[100]" style={{ top: topPos, right: '-16px', transform: 'translateY(-50%)' }} onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)} onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)}><div className="w-3 h-3 rounded-full border border-slate-600 bg-red-400 pointer-events-none"></div></div>;
                                })}
                            </div>
                        </div>
                    );
                })}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
                     {drawingLine && (
                         <path d={getPath(drawingLine.startX, drawingLine.startY, drawingLine.currX, drawingLine.currY)} stroke="#3b82f6" strokeWidth="3" strokeDasharray="5,5" fill="none" markerEnd="url(#arrowhead-active)" />
                     )}
                </svg>
            </div>
        </div>
        
        {/* Context Menu */}
        {contextMenu && (
            <div 
                className="fixed bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-[100] min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
                style={{ left: contextMenu.x, top: contextMenu.y }}
            >
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Opções</div>
                <button 
                    onClick={() => handleOpenEditModal({ id: contextMenu.id, type: contextMenu.type })}
                    className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center transition-colors"
                >
                    <Edit className="w-4 h-4 mr-2" /> Editar
                </button>
                <div className="h-px bg-slate-100 my-1"></div>
                <button 
                    onClick={() => handleDeleteItem(contextMenu.id, contextMenu.type)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Deletar
                </button>
            </div>
        )}
      </div>

      {/* Mineral Database Modal */}
      {showMineralModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4 flex flex-col h-[85vh] animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50 rounded-t-xl">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-4"><Database className="w-6 h-6 text-purple-600" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Base de Minerais</h2>
                            <p className="text-sm text-slate-500 flex items-center mt-1">
                                <span className="flex items-center text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-600 mr-2">
                                    <ExternalLink className="w-3 h-3 mr-1" /> webmineral.com/data
                                </span>
                                Selecione os minerais que farão parte da simulação.
                            </p>
                        </div>
                    </div>
                    <button onClick={() => setShowMineralModal(false)} className="hover:bg-slate-200 p-2 rounded-lg transition-colors"><X className="w-6 h-6 text-slate-400" /></button>
                </div>
                
                {mineralViewMode === 'list' ? (
                    <>
                        <div className="p-4 border-b border-slate-100 flex gap-4 bg-white">
                             <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar por nome, fórmula ou classe..." 
                                    value={mineralSearch}
                                    onChange={(e) => setMineralSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                             </div>
                             <button onClick={handleCreateMineral} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 flex items-center transition-colors shadow-sm">
                                <Plus className="w-4 h-4 mr-2" /> Novo Mineral
                             </button>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-center w-12">Select</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Mineral</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Fórmula</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">SG (g/cm³)</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">WI (kWh/t)</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Classe</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider">Composição</th>
                                        <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {filteredMinerals.map(min => (
                                        <tr key={min.id} className="hover:bg-purple-50 transition-colors group">
                                            <td className="px-6 py-3 text-center">
                                                <button 
                                                    onClick={() => handleToggleSelection(min.id)}
                                                    className={`p-1 rounded transition-colors ${min.selected ? 'text-purple-600 hover:text-purple-800' : 'text-slate-300 hover:text-slate-500'}`}
                                                >
                                                    {min.selected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-900">{min.name}</td>
                                            <td className="px-6 py-3 font-mono text-slate-600 bg-slate-50/50">{min.formula}</td>
                                            <td className="px-6 py-3 text-slate-600">{min.density}</td>
                                            <td className="px-6 py-3 text-slate-600">{min.workIndex}</td>
                                            <td className="px-6 py-3 text-slate-600"><span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">{min.class}</span></td>
                                            <td className="px-6 py-3 text-xs text-slate-500 max-w-xs truncate" title={min.elementalComposition}>{min.elementalComposition}</td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditMineral(min)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Edit className="w-4 h-4" /></button>
                                                    <button onClick={() => handleDeleteMineral(min.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 overflow-y-auto p-8 bg-slate-50 flex justify-center">
                        <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-sm border border-slate-200 h-fit">
                            <div className="flex items-center mb-6 border-b border-slate-100 pb-4">
                                <button onClick={() => setMineralViewMode('list')} className="mr-4 text-slate-400 hover:text-slate-600"><ArrowLeft className="w-6 h-6" /></button>
                                <h3 className="text-xl font-bold text-slate-800">{currentMineral.id?.startsWith('custom') ? 'Criar Novo Mineral' : 'Editar Mineral'}</h3>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 space-y-2">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Mineral</label>
                                    <input type="text" value={currentMineral.name || ''} onChange={(e) => setCurrentMineral(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ex: Calcopirita" />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fórmula Química</label>
                                    <div className="relative">
                                        <FlaskConical className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input type="text" value={currentMineral.formula || ''} onChange={(e) => setCurrentMineral(p => ({...p, formula: e.target.value}))} className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono" placeholder="Ex: CuFeS2" />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Classe Mineral</label>
                                    <input type="text" value={currentMineral.class || ''} onChange={(e) => setCurrentMineral(p => ({...p, class: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Ex: Sulfide" />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Densidade (SG)</label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input type="number" step="0.01" value={currentMineral.density || 0} onChange={(e) => setCurrentMineral(p => ({...p, density: parseFloat(e.target.value)}))} className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Work Index (kWh/t)</label>
                                    <div className="relative">
                                        <Hammer className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                        <input type="number" step="0.1" value={currentMineral.workIndex || 0} onChange={(e) => setCurrentMineral(p => ({...p, workIndex: parseFloat(e.target.value)}))} className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Composição Elementar</label>
                                    <div className="relative">
                                        <Atom className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                                        <textarea 
                                            value={currentMineral.elementalComposition || ''} 
                                            onChange={(e) => setCurrentMineral(p => ({...p, elementalComposition: e.target.value}))} 
                                            className="w-full pl-10 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm h-24" 
                                            placeholder="Ex: Cu: 34.63%, Fe: 30.43%, S: 34.94%"
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">Formato: Elemento: Percentual%, ... (Usado para o balanço de massa)</p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end space-x-3">
                                <button onClick={() => setMineralViewMode('list')} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                                <button onClick={handleSaveMineral} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 shadow-md flex items-center transition-colors">
                                    <Save className="w-4 h-4 mr-2" /> Salvar Mineral
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mineralViewMode === 'list' && (
                    <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-sm text-slate-500">
                        <span>Total de {filteredMinerals.length} minerais cadastrados. <span className="text-purple-600 font-bold ml-1">{minerals.filter(m => m.selected).length} selecionados para o projeto.</span></span>
                        <button onClick={() => setShowMineralModal(false)} className="px-6 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium rounded-lg transition-colors">Fechar</button>
                    </div>
                )}
            </div>
         </div>
      )}

      {editModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50 shrink-0">
                      <h3 className="font-bold text-lg text-slate-900 flex items-center">
                        {activeItem.type === 'node' ? (
                            activeItem.data.type === 'Feed' ? <Waves className="w-5 h-5 mr-2 text-blue-600" /> : <Settings2 className="w-5 h-5 mr-2 text-slate-500" />
                        ) : <ArrowRight className="w-5 h-5 mr-2 text-slate-500" />}
                        {activeItem.type === 'node' ? `Editar ${activeItem.data.label}` : 'Editar Corrente (Stream)'}
                      </h3>
                      <button onClick={() => setEditModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1">
                       {/* COMMON: LABEL INPUT */}
                       <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nome / Identificação</label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                <input 
                                    type="text" 
                                    value={editLabel}
                                    onChange={(e) => setEditLabel(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="Ex: Alimentação Moinho"
                                />
                            </div>
                       </div>

                       {activeItem.type === 'connection' ? (
                           <div className="space-y-6">
                               <div className="p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start">
                                   <Info className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                   <span>
                                      Defina as propriedades iniciais da corrente. 
                                      <br/><span className="text-xs text-slate-500 mt-1 block opacity-80">Nota: Se esta corrente for uma alimentação (Feed), estes valores serão usados como input para a simulação. Caso contrário, eles poderão ser sobrescritos pelo balanço de massa.</span>
                                   </span>
                               </div>

                               {/* Stream Properties Form */}
                               <div>
                                   <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center border-b border-slate-100 pb-2">
                                       <Waves className="w-4 h-4 mr-2" /> 
                                       Propriedades Físicas
                                   </h4>
                                   <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Vazão Volumétrica (m³/h)</label>
                                            <input 
                                                type="number" 
                                                placeholder="0.0"
                                                value={editFormData.volumetricFlow || ''} 
                                                onChange={(e) => setEditFormData(p=>({...p, volumetricFlow: e.target.value}))} 
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-slate-800" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Tonalgem Sólida (t/h)</label>
                                            <input 
                                                type="number" 
                                                placeholder="0.0"
                                                value={editFormData.solidsTph || ''} 
                                                onChange={(e) => setEditFormData(p=>({...p, solidsTph: e.target.value}))} 
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-slate-800" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">% Sólidos (Cw)</label>
                                            <input 
                                                type="number" 
                                                placeholder="0.0"
                                                value={editFormData.percentSolids || ''} 
                                                onChange={(e) => setEditFormData(p=>({...p, percentSolids: e.target.value}))} 
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-slate-800" 
                                            />
                                        </div>
                                   </div>
                               </div>

                               {/* Composition Form (Dynamic) */}
                               <div>
                                   <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center border-b border-slate-100 pb-2">
                                       <Beaker className="w-4 h-4 mr-2" /> 
                                       Composição Mineralógica (%)
                                   </h4>
                                   
                                   {minerals.some(m => m.selected) ? (
                                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                {minerals.filter(m => m.selected).map(min => (
                                                    <div key={min.id}>
                                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{min.name} (%)</label>
                                                        <input 
                                                            type="number" 
                                                            placeholder="0.00"
                                                            value={editFormData[`mineral_${min.id}`] || ''} 
                                                            onChange={(e) => setEditFormData(p => ({...p, [`mineral_${min.id}`]: e.target.value}))} 
                                                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm" 
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-3 flex items-center">
                                                <Info className="w-3 h-3 mr-1" />
                                                Insira a porcentagem em massa de cada mineral. O simulador calculará os teores elementares (Cu, Fe, S, etc.) automaticamente.
                                            </p>
                                        </div>
                                   ) : (
                                       <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                                           <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                                           <p className="text-sm text-yellow-800 font-medium">Nenhum mineral selecionado.</p>
                                           <p className="text-xs text-yellow-700 mt-1">Vá em "Components" e selecione os minerais do seu projeto para definir a composição.</p>
                                       </div>
                                   )}
                               </div>
                           </div>
                       ) : (
                           // Equipamentos (Nodes)
                           <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    {Object.entries(editFormData).map(([key, value]) => {
                                        // Filter out internal keys or complex objects if needed
                                        if (typeof value === 'object') return null;
                                        
                                        return (
                                            <div key={key}>
                                                <label className="block text-sm font-medium text-slate-700 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                                <input 
                                                    type="text" 
                                                    value={value as any} 
                                                    onChange={(e) => setEditFormData(p=>({...p, [key]: e.target.value}))} 
                                                    className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                                                />
                                            </div>
                                        );
                                    })}
                                </div>
                           </div>
                       )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between shrink-0">
                      <button 
                        onClick={() => handleDeleteItem(activeItem.id, activeItem.type)}
                        className="px-4 py-2 text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Deletar
                      </button>
                      <div className="flex space-x-3">
                          <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                          <button onClick={handleSaveEditModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors flex items-center">
                              <Save className="w-4 h-4 mr-2" /> Salvar
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Limpar Projeto?</h3>
                    <p className="text-slate-500 text-sm">Isso removerá todos os equipamentos e conexões desenhados.</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
                    <button onClick={() => setShowClearModal(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
                    <button onClick={() => { setNodes([]); setConnections([]); setShowClearModal(false); }} className="px-4 py-2 bg-red-600 text-white rounded-lg">Limpar Tudo</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
