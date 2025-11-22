
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
  Square,
  Plus,
  ArrowLeft,
  Save as SaveIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Microscope,
  Split,
  Filter,
  Droplets,
  Settings,
  ArrowRightCircle,
  Waves,
  Thermometer,
  Gauge,
  Scale,
  Activity
} from 'lucide-react';
import { 
  NodeType, 
  EquipmentConfig, 
  NodeData, 
  Connection,
  Mineral,
  GlobalSimulationConfig
} from '../types';

// --- Mock Database (Extended Webmineral.com Data) ---
const WEBMINERAL_DB: Mineral[] = [
  // Iron & Steel
  { id: '1', name: 'Quartz', formula: 'SiO2', density: 2.65, abrasionIndex: 0.75, workIndex: 13.5, class: 'Silicate', molecularWeight: 60.08, elementalComposition: 'Si: 46.74%, O: 53.26%', color: 'Colorless, White', luster: 'Vitreous' },
  { id: '2', name: 'Hematite', formula: 'Fe2O3', density: 5.26, abrasionIndex: 0.30, workIndex: 12.8, class: 'Oxide', molecularWeight: 159.69, elementalComposition: 'Fe: 69.94%, O: 30.06%', color: 'Steel grey, Reddish brown', luster: 'Metallic' },
  { id: '3', name: 'Magnetite', formula: 'Fe3O4', density: 5.18, abrasionIndex: 0.25, workIndex: 10.0, class: 'Oxide', molecularWeight: 231.53, elementalComposition: 'Fe: 72.36%, O: 27.64%', color: 'Iron black', luster: 'Metallic' },
  { id: '5', name: 'Pyrite', formula: 'FeS2', density: 5.01, abrasionIndex: 0.45, workIndex: 14.0, class: 'Sulfide', molecularWeight: 119.98, elementalComposition: 'Fe: 46.55%, S: 53.45%', color: 'Pale brass yellow', luster: 'Metallic' },
  
  // Base Metals
  { id: '6', name: 'Chalcopyrite', formula: 'CuFeS2', density: 4.2, abrasionIndex: 0.12, workIndex: 10.5, class: 'Sulfide', molecularWeight: 183.53, elementalComposition: 'Cu: 34.63%, Fe: 30.43%, S: 34.94%', color: 'Brass yellow', luster: 'Metallic' },
  { id: '7', name: 'Bornite', formula: 'Cu5FeS4', density: 5.06, abrasionIndex: 0.10, workIndex: 9.0, class: 'Sulfide', molecularWeight: 501.84, elementalComposition: 'Cu: 63.31%, Fe: 11.13%, S: 25.56%', color: 'Copper red', luster: 'Metallic' },
  { id: '10', name: 'Galena', formula: 'PbS', density: 7.58, abrasionIndex: 0.05, workIndex: 8.5, class: 'Sulfide', molecularWeight: 239.27, elementalComposition: 'Pb: 86.60%, S: 13.40%', color: 'Lead grey', luster: 'Metallic' },
  { id: '11', name: 'Sphalerite', formula: 'ZnS', density: 4.0, abrasionIndex: 0.18, workIndex: 11.5, class: 'Sulfide', molecularWeight: 97.47, elementalComposition: 'Zn: 67.09%, S: 32.90%', color: 'Yellow, Brown, Black', luster: 'Resinous' },
  
  // Industrial
  { id: '12', name: 'Calcite', formula: 'CaCO3', density: 2.71, abrasionIndex: 0.02, workIndex: 5.0, class: 'Carbonate', molecularWeight: 100.09, elementalComposition: 'Ca: 40.04%, C: 12.00%, O: 47.96%', color: 'White, Colorless', luster: 'Vitreous' },
  { id: '20', name: 'Gold', formula: 'Au', density: 19.3, abrasionIndex: 0.01, workIndex: 6.0, class: 'Native Element', molecularWeight: 196.97, elementalComposition: 'Au: 100.00%', color: 'Gold yellow', luster: 'Metallic' },
];

// --- Props Interface ---

interface ProjectViewProps {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

// --- Configuration (Rigorous Mass Balance Parameters) ---

const EQUIPMENT_CONFIGS: Record<Exclude<NodeType, 'Feed'>, EquipmentConfig> = {
  'Mixer': { 
    type: 'Mixer', icon: Shuffle, label: 'Mixer', color: 'bg-purple-100 border-purple-500 text-purple-700',
    inputs: [{ id: 'in1', type: 'input' }, { id: 'in2', type: 'input' }, { id: 'in3', type: 'input' }],
    outputs: [{ id: 'out1', type: 'output' }],
    defaultParameters: { description: 'Ideal Mixer' } // No DOF
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
    defaultParameters: { 
        workIndex: 12.5, 
        diameter: 4.5, 
        length: 6.0, 
        filling: 35,
        targetDischargeSolids: 70 // %Solids (Controls water addition)
    }
  },
  'Britador': { 
    type: 'Britador', icon: Hammer, label: 'Crusher', color: 'bg-slate-300 border-slate-600 text-slate-800',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'product', type: 'output' }],
    defaultParameters: { 
        capacity: 300, 
        closedSideSetting: 12, 
        reductionRatio: 4 
    }
  },
  'Hydrocyclone': { 
    type: 'Hydrocyclone', icon: Filter, label: 'Cyclone Cluster', color: 'bg-indigo-100 border-indigo-500 text-indigo-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'overflow', type: 'output', label: 'O/F' }, { id: 'underflow', type: 'output', label: 'U/F' }],
    defaultParameters: { 
        pressure: 100, 
        d50c: 150, 
        waterRecoveryToUnderflow: 45, // Rf (%)
        numberOfCyclones: 4 
    }
  },
  'FlotationCell': { 
    type: 'FlotationCell', icon: Layers, label: 'Flotation Cell', color: 'bg-green-100 border-green-500 text-green-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output', label: 'Conc' }, { id: 'tail', type: 'output', label: 'Tail' }],
    defaultParameters: { 
        residenceTime: 15, 
        airFlow: 50,
        massPull: 10, // % estimated
        waterPull: 15, // % estimated
        mineralRecovery: 90 // Global Recovery (simplified)
    }
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
    defaultParameters: { 
        underflowSolids: 65, // % Target
        flocculantDosage: 20 // g/t
    }
  }
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  nodes, 
  setNodes, 
  connections, 
  setConnections 
}) => {
  // Local UI State
  const [tool, setTool] = useState<'pointer' | 'connection'>('pointer');
  const [showSidebar, setShowSidebar] = useState(true);
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused'>('idle');
  
  // Interaction State
  const [draggingNode, setDraggingNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [drawingLine, setDrawingLine] = useState<{ fromNode?: string; fromPort?: string; startX: number; startY: number; currX: number; currY: number; } | null>(null);
  const [activeItem, setActiveItem] = useState<{ id: string; type: 'node' | 'connection'; x: number; y: number; data?: any; } | null>(null);
  
  // Hover State for robust connections
  const [hoveredPort, setHoveredPort] = useState<{ nodeId: string; portId: string } | null>(null);

  // Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'specifications' | 'composition'>('specifications');
  const [showClearModal, setShowClearModal] = useState(false);
  
  // --- MINERAL SELECTION STATE ---
  const [showMineralModal, setShowMineralModal] = useState(false);
  const [minerals, setMinerals] = useState<Mineral[]>(WEBMINERAL_DB);
  const [selectedMinerals, setSelectedMinerals] = useState<string[]>(['1', '2', '3', '6']); 
  const [mineralSearch, setMineralSearch] = useState('');
  const [expandedMineralId, setExpandedMineralId] = useState<string | null>(null);
  
  // --- MINERAL EDITING STATE ---
  const [isMineralFormOpen, setIsMineralFormOpen] = useState(false);
  const [editingMineralId, setEditingMineralId] = useState<string | null>(null);
  const [mineralFormData, setMineralFormData] = useState<Partial<Mineral>>({
      name: '', formula: '', density: 0, abrasionIndex: 0, workIndex: 0, class: 'Silicate'
  });

  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const getAbsolutePortPosition = (nodeId: string, portId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
    if (!config) return null;

    const inputIndex = config.inputs.findIndex(p => p.id === portId);
    if (inputIndex !== -1) {
        return {
            x: node.x, 
            y: node.y + (NODE_HEIGHT * ((inputIndex + 1) / (config.inputs.length + 1)))
        };
    }

    const outputIndex = config.outputs.findIndex(p => p.id === portId);
    if (outputIndex !== -1) {
        return {
            x: node.x + NODE_WIDTH, 
            y: node.y + (NODE_HEIGHT * ((outputIndex + 1) / (config.outputs.length + 1)))
        };
    }
    return { x: node.x, y: node.y }; 
  };

  const handleSidebarDragStart = (e: React.DragEvent<HTMLDivElement>, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSidebarDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const type = e.dataTransfer.getData('application/reactflow') as NodeType;
    // @ts-ignore - Checking type existence
    if (!type || !EQUIPMENT_CONFIGS[type]) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const newNode: NodeData = {
      id: `node_${Date.now()}`,
      type,
      x: e.clientX - bounds.left - (NODE_WIDTH / 2),
      y: e.clientY - bounds.top - (NODE_HEIGHT / 2),
      label: type,
      // @ts-ignore - Checking type existence
      parameters: { ...EQUIPMENT_CONFIGS[type].defaultParameters }
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (activeItem) setActiveItem(null);
    
    if (tool === 'connection') return;
    setDraggingNode({ id: nodeId, offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setActiveItem(null);
    setEditModalOpen(false);
    if (tool === 'connection' && canvasRef.current) {
        const bounds = canvasRef.current.getBoundingClientRect();
        setDrawingLine({ startX: e.clientX - bounds.left, startY: e.clientY - bounds.top, currX: e.clientX - bounds.left, currY: e.clientY - bounds.top });
    }
  };

  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
    e.stopPropagation();
    e.preventDefault(); // Prevents browser native drag/selection
    setActiveItem(null);
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const portPos = getAbsolutePortPosition(nodeId, portId);
    const startX = portPos ? portPos.x : e.clientX - bounds.left;
    const startY = portPos ? portPos.y : e.clientY - bounds.top;
    setDrawingLine({ fromNode: nodeId, fromPort: portId, startX, startY, currX: startX, currY: startY });
  };

  const handlePortMouseEnter = (nodeId: string, portId: string) => {
    setHoveredPort({ nodeId, portId });
  };

  const handlePortMouseLeave = () => {
    setHoveredPort(null);
  };

  // Centralized drop logic for better UX
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setDraggingNode(null);
    
    // Finalize Connection if valid
    if (drawingLine) {
        // Connection is valid if we have a hovered port and it's not the same node
        if (hoveredPort && hoveredPort.nodeId !== drawingLine.fromNode) {
             const newConn: Connection = {
                id: `conn_${Date.now()}`,
                fromNode: drawingLine.fromNode,
                fromPort: drawingLine.fromPort,
                fromX: drawingLine.fromNode ? undefined : drawingLine.startX,
                fromY: drawingLine.fromNode ? undefined : drawingLine.startY,
                toNode: hoveredPort.nodeId,
                toPort: hoveredPort.portId,
                parameters: { flowRate: 0, solidsPct: 0 }
            };
            setConnections(prev => [...prev, newConn]);
        }
        // Always clear line on mouse up
        setDrawingLine(null);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - bounds.left;
    const mouseY = e.clientY - bounds.top;
    
    if (draggingNode && tool === 'pointer') {
        setNodes(nds => nds.map(n => n.id === draggingNode.id ? { ...n, x: mouseX - draggingNode.offsetX, y: mouseY - draggingNode.offsetY } : n));
        if (activeItem) setActiveItem(null);
    }
    if (drawingLine) {
        // Snap to hovered port if available for visual feedback
        if (hoveredPort) {
             const snapPos = getAbsolutePortPosition(hoveredPort.nodeId, hoveredPort.portId);
             if (snapPos) {
                 setDrawingLine(prev => prev ? { ...prev, currX: snapPos.x, currY: snapPos.y } : null);
             } else {
                 setDrawingLine(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
             }
        } else {
            setDrawingLine(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
        }
    }
  };

  // Aspen Style Orthogonal Routing (Manhattan)
  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
     const midX = (x1 + x2) / 2;
     return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
  };

  // --- Mineral Logic ---
  const filteredMinerals = minerals.filter(min => min.name.toLowerCase().includes(mineralSearch.toLowerCase()));
  const toggleMineralSelection = (id: string) => setSelectedMinerals(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  
  const handleSaveMineralForm = () => {
      if (!mineralFormData.name || !mineralFormData.formula) return alert("Name and Formula required.");
      if (editingMineralId) setMinerals(prev => prev.map(m => m.id === editingMineralId ? { ...m, ...mineralFormData } as Mineral : m));
      else setMinerals(prev => [...prev, { id: `min_${Date.now()}`, ...mineralFormData } as Mineral]);
      setIsMineralFormOpen(false);
  };

  // --- Feed Mineral Composition Handlers (Connection specific) ---
  const handleCompositionChange = (mineralId: string, value: number) => {
      setEditFormData(prev => ({
          ...prev,
          mineralComposition: { ...prev.mineralComposition, [mineralId]: value }
      }));
  };

  // --- Edit Modal Logic ---
  const handleOpenEditModal = () => {
      if (!activeItem) return;
      setActiveTab('specifications');
      
      if (activeItem.type === 'node') {
          const node = nodes.find(n => n.id === activeItem.id);
          setEditFormData(node?.parameters || {});
      } else {
          // Connection logic: Always load parameters from the connection itself
          const conn = connections.find(c => c.id === activeItem.id);
          setEditFormData(conn?.parameters || {});
      }
      setEditModalOpen(true);
  };

  const handleSaveEditModal = () => {
      if (!activeItem) return;

      if (activeItem.type === 'node') {
          setNodes(nds => nds.map(n => n.id === activeItem.id ? { ...n, parameters: editFormData } : n));
      } else {
          // Connection Logic: Always save to connection
          setConnections(c => c.map(x => x.id === activeItem.id ? { ...x, parameters: editFormData } : x));
      }
      setEditModalOpen(false);
      setActiveItem(null);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative">
      {/* --- Header Toolbar --- */}
      <header className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition-colors ${showSidebar ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                <PanelLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            
            <button onClick={() => { setShowMineralModal(true); setMineralSearch(''); setIsMineralFormOpen(false); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-purple-300 transition-all">
                <Beaker className="w-4 h-4 mr-2 text-purple-600" /> Components
            </button>
            
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button onClick={() => setSimState('running')} className={`px-4 py-2 rounded-lg flex items-center font-bold text-sm transition-all shadow-sm ${simState === 'running' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'bg-white border border-slate-200 text-slate-700 hover:bg-green-50 hover:text-green-700'}`}>
                <Play className={`w-4 h-4 mr-2 ${simState === 'running' ? 'fill-current' : ''}`} /> Simulate
            </button>
            <button onClick={() => setSimState('paused')} className={`px-4 py-2 rounded-lg flex items-center font-medium text-sm transition-all ${simState === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'text-slate-600 hover:bg-yellow-50'}`}>
                <Pause className="w-4 h-4 mr-2" /> Pause
            </button>
            <button onClick={() => setSimState('idle')} className="px-4 py-2 rounded-lg flex items-center font-medium text-sm text-slate-600 hover:bg-slate-100"><RotateCcw className="w-4 h-4 mr-2" /> Reset</button>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowClearModal(true)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-5 h-5" /></button>
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium flex items-center shadow-sm text-sm"><Save className="w-4 h-4 mr-2" /> Save</button>
        </div>
      </header>

      <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none relative">
        {/* Sidebar */}
        <div className={`bg-slate-50 border-r border-slate-200 flex flex-col z-20 transition-all duration-300 ${showSidebar ? 'w-64 opacity-100' : 'w-0 opacity-0 border-none overflow-hidden'}`}>
          <div className="p-4 border-b border-slate-200 min-w-[16rem]">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tools</h3>
            <div className="flex space-x-2">
                <button onClick={() => setTool('pointer')} className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${tool === 'pointer' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}><MousePointer2 className="w-5 h-5" /></button>
                <button onClick={() => setTool('connection')} className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${tool === 'connection' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}><ArrowUpRight className="w-5 h-5" /> <span className="ml-2 text-sm font-medium">Link</span></button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto min-w-[16rem]">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Unit Operations</h3>
            <div className="space-y-3">
                {Object.values(EQUIPMENT_CONFIGS).map((item) => (
                    <div key={item.type} onDragStart={(e) => handleSidebarDragStart(e, item.type)} draggable className="flex items-center p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white cursor-move hover:border-blue-400 hover:shadow-md transition-all">
                        <item.icon className="w-5 h-5 text-slate-500 mr-3" /> <span className="text-slate-700 font-medium">{item.label}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className={`flex-1 relative bg-slate-50 overflow-hidden ${tool === 'connection' ? 'cursor-crosshair' : 'cursor-default'}`} ref={canvasRef} onMouseDown={handleCanvasMouseDown} onMouseUp={handleCanvasMouseUp} onMouseMove={handleCanvasMouseMove}>
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            <div className="absolute inset-0 w-full h-full" onDrop={handleSidebarDrop} onDragOver={handleDragOver}>
                {/* Layer 1: Global Definitions */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" /></marker>
                    </defs>
                    {/* Layer 2: Established Connections */}
                    {connections.map(conn => {
                        let start = { x: 0, y: 0 }, end = { x: 0, y: 0 };
                        if (conn.fromNode && conn.fromPort) { const pos = getAbsolutePortPosition(conn.fromNode, conn.fromPort); if (pos) start = pos; } else if (conn.fromX) start = { x: conn.fromX, y: conn.fromY! };
                        if (conn.toNode && conn.toPort) { const pos = getAbsolutePortPosition(conn.toNode, conn.toPort); if (pos) end = pos; } else if (conn.toX) end = { x: conn.toX, y: conn.toY! };
                        if (!start.x && !end.x) return null;
                        const isActive = activeItem?.id === conn.id;
                        return (
                            <g key={conn.id} onContextMenu={(e) => { e.preventDefault(); setActiveItem({ id: conn.id, type: 'connection', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, data: conn }); }} className="pointer-events-auto cursor-pointer group">
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke="transparent" strokeWidth="25" fill="none" />
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke={isActive ? "#2563eb" : "#64748b"} strokeWidth={isActive ? "3" : "2"} fill="none" markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"} className="transition-all group-hover:stroke-slate-600" />
                            </g>
                        );
                    })}
                </svg>

                {/* Layer 3: Nodes */}
                {nodes.map((node) => {
                    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
                    // Guard if node type removed
                    if (!config) return null;
                    const isActive = activeItem?.id === node.id;
                    return (
                        <div key={node.id} onMouseDown={(e) => handleNodeMouseDown(e, node.id)} onContextMenu={(e) => { e.preventDefault(); setActiveItem({ id: node.id, type: 'node', x: node.x + NODE_WIDTH/2, y: node.y, data: node }); }} style={{ left: node.x, top: node.y, width: NODE_WIDTH, height: NODE_HEIGHT, position: 'absolute' }} className={`group rounded-lg border-2 bg-white shadow-sm transition-all z-10 flex flex-col cursor-pointer ${config.color} ${isActive ? 'ring-2 ring-blue-500 shadow-lg scale-105 z-20' : 'hover:shadow-md'}`}>
                            <div className="flex items-center justify-center p-2 border-b border-black/5 bg-white/50 rounded-t-md node-header"><config.icon className="w-4 h-4 mr-2 opacity-75" /> <span className="text-xs font-bold truncate">{node.label}</span></div>
                            <div className="flex-1 relative">
                                {config.inputs.map((port, idx) => (
                                    <div 
                                        key={port.id} 
                                        className={`absolute -left-4 w-8 h-8 flex items-center justify-center cursor-crosshair hover:scale-110 transition-transform z-50 ${hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id ? 'scale-125' : ''}`}
                                        style={{ top: ((idx + 1) * (100 / (config.inputs.length + 1))) + '%', transform: 'translateY(-50%)' }} 
                                        onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id)} 
                                        onMouseEnter={() => handlePortMouseEnter(node.id, port.id)}
                                        onMouseLeave={handlePortMouseLeave}
                                        title={port.label || 'Input'}
                                    >
                                        <div className={`w-3 h-3 rounded-full border border-slate-600 transition-colors shadow-sm pointer-events-none ${hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id ? 'bg-green-300 ring-2 ring-green-500' : 'bg-green-400'}`}></div>
                                    </div>
                                ))}
                                {config.outputs.map((port, idx) => (
                                    <div 
                                        key={port.id} 
                                        className={`absolute -right-4 w-8 h-8 flex items-center justify-center cursor-crosshair hover:scale-110 transition-transform z-50 ${hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id ? 'scale-125' : ''}`}
                                        style={{ top: ((idx + 1) * (100 / (config.outputs.length + 1))) + '%', transform: 'translateY(-50%)' }} 
                                        onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id)}
                                        onMouseEnter={() => handlePortMouseEnter(node.id, port.id)}
                                        onMouseLeave={handlePortMouseLeave}
                                        title={port.label || 'Output'}
                                    >
                                        <div className={`w-3 h-3 rounded-full border border-slate-600 transition-colors shadow-sm pointer-events-none ${hoveredPort?.nodeId === node.id && hoveredPort?.portId === port.id ? 'bg-red-300 ring-2 ring-red-500' : 'bg-red-400'}`}></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {/* Layer 4: Active Drag Line (Z-50 for visibility on top of everything) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-50 overflow-visible">
                     {drawingLine && (
                         <path 
                             d={getPath(drawingLine.startX, drawingLine.startY, drawingLine.currX, drawingLine.currY)} 
                             stroke="#3b82f6" 
                             strokeWidth="3" 
                             strokeDasharray="5,5" 
                             fill="none" 
                             markerEnd="url(#arrowhead-active)" 
                         />
                     )}
                </svg>

                {activeItem && !draggingNode && (
                   <div className="absolute z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex flex-col min-w-[120px] animate-in fade-in zoom-in-95 duration-100 origin-top-left" style={{ left: activeItem.x + 10, top: activeItem.y }} onMouseDown={(e) => e.stopPropagation()}>
                      <button onClick={handleOpenEditModal} className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-left"><Edit className="w-4 h-4 mr-2" /> Edit</button>
                      <button onClick={() => { if(activeItem.type==='node') setNodes(n=>n.filter(x=>x.id!==activeItem.id)); else setConnections(c=>c.filter(x=>x.id!==activeItem.id)); setActiveItem(null); }} className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"><Trash2 className="w-4 h-4 mr-2" /> Delete</button>
                   </div>
                )}
            </div>
        </div>
      </div>

      {/* --- MINERAL MODAL --- */}
      {showMineralModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col h-[85vh] animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-4"><Database className="w-6 h-6 text-purple-600" /></div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Mineral Database & Selection</h2>
                            <p className="text-sm text-slate-500 flex items-center mt-1">Integrated with <a href="https://webmineral.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline ml-1 flex items-center">Webmineral.com <ExternalLink className="w-3 h-3 ml-0.5" /></a></p>
                        </div>
                    </div>
                    <button onClick={() => setShowMineralModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><X className="w-6 h-6" /></button>
                </div>

                {isMineralFormOpen ? (
                    <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm max-w-2xl mx-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800">{editingMineralId ? 'Edit Mineral' : 'Add New Mineral'}</h3>
                                <button onClick={() => setIsMineralFormOpen(false)} className="text-sm text-slate-500 hover:text-slate-800 flex items-center"><ArrowLeft className="w-4 h-4 mr-1" /> Back</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Name</label><input type="text" value={mineralFormData.name} onChange={(e) => setMineralFormData(p => ({...p, name: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Formula</label><input type="text" value={mineralFormData.formula} onChange={(e) => setMineralFormData(p => ({...p, formula: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-mono" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Density (g/cm³)</label><input type="number" step="0.01" value={mineralFormData.density} onChange={(e) => setMineralFormData(p => ({...p, density: parseFloat(e.target.value)}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" /></div>
                                
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Abrasion Index (AI)</label><input type="number" step="0.01" value={mineralFormData.abrasionIndex} onChange={(e) => setMineralFormData(p => ({...p, abrasionIndex: parseFloat(e.target.value)}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" /></div>
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Bond Work Index (WI)</label><input type="number" step="0.1" value={mineralFormData.workIndex} onChange={(e) => setMineralFormData(p => ({...p, workIndex: parseFloat(e.target.value)}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500" /></div>
                                
                                <div><label className="block text-sm font-medium text-slate-700 mb-1">Elemental Comp.</label><input type="text" value={mineralFormData.elementalComposition || ''} onChange={(e) => setMineralFormData(p => ({...p, elementalComposition: e.target.value}))} placeholder="e.g. Fe: 69.9%, O: 30.1%" className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 font-mono" /></div>
                                
                                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Class</label><select value={mineralFormData.class} onChange={(e) => setMineralFormData(p => ({...p, class: e.target.value}))} className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"><option value="Silicate">Silicate</option><option value="Sulfide">Sulfide</option><option value="Oxide">Oxide</option><option value="Carbonate">Carbonate</option><option value="Native Element">Native Element</option><option value="Other">Other</option></select></div>
                            </div>
                            <div className="mt-8 flex justify-end space-x-3">
                                <button onClick={() => setIsMineralFormOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
                                <button onClick={handleSaveMineralForm} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm flex items-center"><SaveIcon className="w-4 h-4 mr-2" /> Save</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col h-full overflow-hidden">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 shrink-0">
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                                    <input type="text" placeholder="Search minerals..." value={mineralSearch} onChange={(e) => setMineralSearch(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg shadow-sm outline-none focus:ring-2 focus:ring-purple-500" />
                                </div>
                                <button onClick={() => { setEditingMineralId(null); setMineralFormData({ name: '', formula: '', density: 2.6, abrasionIndex: 0.1, workIndex: 10, class: 'Silicate', elementalComposition: '' }); setIsMineralFormOpen(true); }} className="px-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-purple-50 hover:text-purple-700 transition-all flex items-center shadow-sm"><Plus className="w-5 h-5 mr-2" /> New</button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-10"></th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">Sel</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mineral</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Formula</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">SG</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">AI</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">WI (kWh/t)</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMinerals.map((mineral) => {
                                        const isSelected = selectedMinerals.includes(mineral.id);
                                        const isExpanded = expandedMineralId === mineral.id;
                                        return (
                                            <React.Fragment key={mineral.id}>
                                                <tr className={`transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                                                    <td className="px-4 py-3 text-center">
                                                        <button onClick={() => setExpandedMineralId(isExpanded ? null : mineral.id)} className="text-slate-400 hover:text-purple-600 p-1 rounded hover:bg-slate-200 transition-colors">
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleMineralSelection(mineral.id)}>
                                                        <div className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition-all ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{mineral.name}</td>
                                                    <td className="px-4 py-3 font-mono text-slate-600 text-sm">{mineral.formula}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-700">{mineral.density}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-700">{mineral.abrasionIndex}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-700">{mineral.workIndex}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button onClick={(e) => { e.stopPropagation(); setEditingMineralId(mineral.id); setMineralFormData({...mineral}); setIsMineralFormOpen(true); }} className="text-slate-400 hover:text-purple-600 p-1 rounded hover:bg-purple-50"><Edit className="w-4 h-4" /></button>
                                                    </td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 bg-white border-t border-slate-200 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-500 uppercase">Selected Minerals ({selectedMinerals.length})</span>
                                <button onClick={() => setSelectedMinerals([])} className="text-xs text-red-500 hover:text-red-700 hover:underline">Clear All</button>
                            </div>
                            <div className="flex space-x-3 overflow-x-auto pb-2 pt-1 min-h-[3rem] scrollbar-hide">
                                {selectedMinerals.length === 0 ? (
                                    <span className="text-sm text-slate-400 italic">No minerals selected.</span>
                                ) : (
                                    selectedMinerals.map(id => {
                                        const m = minerals.find(min => min.id === id);
                                        if(!m) return null;
                                        return (
                                            <div key={id} className="flex items-center bg-purple-50 border border-purple-200 rounded-full pl-3 pr-2 py-1 shrink-0 animate-in fade-in zoom-in duration-200">
                                                <span className="text-sm font-medium text-purple-800 mr-2">{m.name}</span>
                                                <button onClick={() => toggleMineralSelection(id)} className="w-5 h-5 rounded-full bg-white text-purple-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors shadow-sm">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <div className="mt-4 flex justify-end space-x-3">
                                <button onClick={() => setShowMineralModal(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
                                <button onClick={() => setShowMineralModal(false)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm flex items-center">
                                    <CheckSquare className="w-4 h-4 mr-2" /> Confirm Selection
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Edit Modal for Nodes/Connections (Rigorous Inputs - Aspen Style) */}
      {editModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                      <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3 border border-blue-200">
                              {activeItem.type === 'node' ? <Settings2 className="w-5 h-5 text-blue-600" /> : <Waves className="w-5 h-5 text-blue-600" />}
                          </div>
                          <div>
                              <h3 className="font-bold text-lg text-slate-900">
                                {activeItem.type === 'node' ? `Block: ${activeItem.data.label}` : 'Material Stream Input'}
                              </h3>
                              <p className="text-xs text-slate-500 font-mono mt-0.5 uppercase tracking-wider">
                                ID: {activeItem.id}
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full"><X className="w-6 h-6" /></button>
                  </div>
                  
                  <div className="flex flex-col h-[65vh]">
                      {activeItem.type === 'connection' ? (
                          /* ASPEN-LIKE INPUT INTERFACE (Tabs & Grids) */
                          <>
                              {/* Tabs */}
                              <div className="flex border-b border-slate-200 px-6 bg-white">
                                  <button 
                                    onClick={() => setActiveTab('specifications')}
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'specifications' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                  >
                                      Specifications
                                  </button>
                                  <button 
                                    onClick={() => setActiveTab('composition')}
                                    className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'composition' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                  >
                                      Composition
                                  </button>
                              </div>

                              <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                                  {activeTab === 'specifications' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                        {/* State Variables Grid */}
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase tracking-wider">State Variables</div>
                                            <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Thermometer className="w-4 h-4 mr-2 text-slate-400"/>Temperature</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value={editFormData.temperature ?? 25} onChange={(e) => setEditFormData(p=>({...p, temperature: parseFloat(e.target.value)}))} className="w-full px-2 py-1 border border-slate-300 border-r-0 rounded-l text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                                                        <span className="bg-slate-100 border border-slate-300 px-2 py-1 rounded-r text-xs text-slate-600">C</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Gauge className="w-4 h-4 mr-2 text-slate-400"/>Pressure</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value={editFormData.pressure ?? 1.013} onChange={(e) => setEditFormData(p=>({...p, pressure: parseFloat(e.target.value)}))} className="w-full px-2 py-1 border border-slate-300 border-r-0 rounded-l text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                                                        <span className="bg-slate-100 border border-slate-300 px-2 py-1 rounded-r text-xs text-slate-600">bar</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Waves className="w-4 h-4 mr-2 text-slate-400"/>Vapor Fraction</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value="0" disabled className="w-full px-2 py-1 border border-slate-200 bg-slate-50 rounded text-right text-sm text-slate-400" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Flow Definition Grid */}
                                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-600 uppercase tracking-wider">Total Flow</div>
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Scale className="w-4 h-4 mr-2 text-slate-400"/>Mass Flow</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value={editFormData.totalTph || 0} onChange={(e) => setEditFormData(p=>({...p, totalTph: parseFloat(e.target.value)}))} className="w-full px-2 py-1 border border-slate-300 border-r-0 rounded-l text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-600" />
                                                        <span className="bg-slate-100 border border-slate-300 px-2 py-1 rounded-r text-xs text-slate-600">kg/h</span>
                                                    </div>
                                                </div>

                                                {/* New Volumetric Flow Input */}
                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Droplets className="w-4 h-4 mr-2 text-slate-400"/>Vol. Flow</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value={editFormData.volumetricFlow || 0} onChange={(e) => setEditFormData(p=>({...p, volumetricFlow: parseFloat(e.target.value)}))} className="w-full px-2 py-1 border border-slate-300 border-r-0 rounded-l text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none font-bold text-blue-600" />
                                                        <span className="bg-slate-100 border border-slate-300 px-2 py-1 rounded-r text-xs text-slate-600">m³/h</span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <label className="text-sm text-slate-700 font-medium flex items-center"><Boxes className="w-4 h-4 mr-2 text-slate-400"/>Solid Fraction</label>
                                                    <div className="flex items-center w-32">
                                                        <input type="number" value={editFormData.percentSolids || 0} onChange={(e) => setEditFormData(p=>({...p, percentSolids: parseFloat(e.target.value)}))} className="w-full px-2 py-1 border border-slate-300 border-r-0 rounded-l text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none" />
                                                        <span className="bg-slate-100 border border-slate-300 px-2 py-1 rounded-r text-xs text-slate-600">% w/w</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                  )}

                                  {activeTab === 'composition' && (
                                      <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                             <table className="w-full text-left text-sm">
                                                 <thead className="bg-slate-100 border-b border-slate-200">
                                                     <tr>
                                                         <th className="px-4 py-2 font-semibold text-slate-600 text-xs uppercase">Component</th>
                                                         <th className="px-4 py-2 font-semibold text-slate-600 text-xs uppercase text-right">Formula</th>
                                                         <th className="px-4 py-2 font-semibold text-slate-600 text-xs uppercase text-right">Value</th>
                                                         <th className="px-4 py-2 font-semibold text-slate-600 text-xs uppercase w-12 text-center">Unit</th>
                                                     </tr>
                                                 </thead>
                                                 <tbody className="divide-y divide-slate-100">
                                                     {selectedMinerals.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-500 italic">No components selected in Global Settings.</td></tr>}
                                                     {selectedMinerals.map(id => {
                                                         const m = minerals.find(min => min.id === id);
                                                         if(!m) return null;
                                                         return (
                                                             <tr key={id} className="hover:bg-blue-50/50">
                                                                 <td className="px-4 py-2 font-medium text-slate-700">{m.name}</td>
                                                                 <td className="px-4 py-2 text-right font-mono text-slate-500 text-xs">{m.formula}</td>
                                                                 <td className="px-4 py-2 text-right">
                                                                     <input 
                                                                         type="number" 
                                                                         value={editFormData.mineralComposition?.[id] || 0} 
                                                                         onChange={(e) => handleCompositionChange(id, parseFloat(e.target.value))}
                                                                         className="w-24 px-2 py-1 border border-slate-300 rounded text-right text-sm focus:ring-1 focus:ring-blue-500 outline-none" 
                                                                     />
                                                                 </td>
                                                                 <td className="px-4 py-2 text-center text-slate-500 text-xs">%</td>
                                                             </tr>
                                                         );
                                                     })}
                                                 </tbody>
                                                 <tfoot className="bg-slate-50 border-t border-slate-200">
                                                     <tr>
                                                         <td colSpan={2} className="px-4 py-2 text-right font-bold text-slate-700">Total Composition:</td>
                                                         <td className="px-4 py-2 text-right font-bold">
                                                             <span className={`${Math.abs(((Object.values(editFormData.mineralComposition || {}) as number[]).reduce((a, b) => a + b, 0)) - 100) < 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                                                                 {(Object.values(editFormData.mineralComposition || {}) as number[]).reduce((a, b) => a + b, 0).toFixed(1)}
                                                             </span>
                                                         </td>
                                                         <td className="px-4 py-2 text-center text-slate-500 text-xs">%</td>
                                                     </tr>
                                                 </tfoot>
                                             </table>
                                          </div>
                                          <div className="mt-2 flex justify-end">
                                              <button className="text-xs text-blue-600 hover:underline flex items-center"><Info className="w-3 h-3 mr-1" /> Normalize Composition</button>
                                          </div>
                                      </div>
                                  )}
                              </div>
                          </>
                      ) : (
                          /* STANDARD NODE INPUT */
                          <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {Object.keys(editFormData).length > 0 ? (
                                Object.entries(editFormData).map(([key, value]) => {
                                    if (key === 'mineralComposition' || key === 'temperature' || key === 'pressure') return null;
                                    return (
                                        <div key={key}>
                                            <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                            <div className="relative">
                                                <input type={typeof value === 'number' ? 'number' : 'text'} value={value as any} onChange={(e) => setEditFormData(prev => ({ ...prev, [key]: typeof value === 'number' ? parseFloat(e.target.value) : e.target.value }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" />
                                            </div>
                                        </div>
                                    );
                                })
                             ) : (
                                  <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50"><MoreHorizontal className="w-8 h-8 mx-auto mb-2 opacity-50" /><p>No configurable parameters for this block.</p></div>
                             )
                            }
                          </div>
                      )}
                  </div>
                  
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                      <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Cancel</button>
                      <button onClick={handleSaveEditModal} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm flex items-center transition-colors"><Check className="w-4 h-4 mr-2" /> Save Changes</button>
                  </div>
              </div>
          </div>
      )}

      {/* Clear Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-full"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
                        <button onClick={() => setShowClearModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Clear entire project?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">This will remove all equipment and connections. Action cannot be undone.</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                    <button onClick={() => setShowClearModal(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancel</button>
                    <button onClick={() => { setNodes([]); setConnections([]); setActiveItem(null); setShowClearModal(false); }} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm">Yes, Clear All</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
