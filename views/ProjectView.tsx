
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
  MousePointer
} from 'lucide-react';
import { 
  NodeType, 
  EquipmentConfig, 
  NodeData, 
  Connection,
  Mineral
} from '../types';

// --- Mock Database (Extended Webmineral.com Data) ---
const WEBMINERAL_DB: Mineral[] = [
  { id: '1', name: 'Quartz', formula: 'SiO2', density: 2.65, abrasionIndex: 0.75, workIndex: 13.5, class: 'Silicate', molecularWeight: 60.08, elementalComposition: 'Si: 46.74%, O: 53.26%', color: 'Colorless, White', luster: 'Vitreous' },
  { id: '2', name: 'Hematite', formula: 'Fe2O3', density: 5.26, abrasionIndex: 0.30, workIndex: 12.8, class: 'Oxide', molecularWeight: 159.69, elementalComposition: 'Fe: 69.94%, O: 30.06%', color: 'Steel grey, Reddish brown', luster: 'Metallic' },
  { id: '3', name: 'Magnetite', formula: 'Fe3O4', density: 5.18, abrasionIndex: 0.25, workIndex: 10.0, class: 'Oxide', molecularWeight: 231.53, elementalComposition: 'Fe: 72.36%, O: 27.64%', color: 'Iron black', luster: 'Metallic' },
  { id: '5', name: 'Pyrite', formula: 'FeS2', density: 5.01, abrasionIndex: 0.45, workIndex: 14.0, class: 'Sulfide', molecularWeight: 119.98, elementalComposition: 'Fe: 46.55%, S: 53.45%', color: 'Pale brass yellow', luster: 'Metallic' },
  { id: '6', name: 'Chalcopyrite', formula: 'CuFeS2', density: 4.2, abrasionIndex: 0.12, workIndex: 10.5, class: 'Sulfide', molecularWeight: 183.53, elementalComposition: 'Cu: 34.63%, Fe: 30.43%, S: 34.94%', color: 'Brass yellow', luster: 'Metallic' },
  { id: '7', name: 'Bornite', formula: 'Cu5FeS4', density: 5.06, abrasionIndex: 0.10, workIndex: 9.0, class: 'Sulfide', molecularWeight: 501.84, elementalComposition: 'Cu: 63.31%, Fe: 11.13%, S: 25.56%', color: 'Copper red', luster: 'Metallic' },
  { id: '10', name: 'Galena', formula: 'PbS', density: 7.58, abrasionIndex: 0.05, workIndex: 8.5, class: 'Sulfide', molecularWeight: 239.27, elementalComposition: 'Pb: 86.60%, S: 13.40%', color: 'Lead grey', luster: 'Metallic' },
  { id: '11', name: 'Sphalerite', formula: 'ZnS', density: 4.0, abrasionIndex: 0.18, workIndex: 11.5, class: 'Sulfide', molecularWeight: 97.47, elementalComposition: 'Zn: 67.09%, S: 32.90%', color: 'Yellow, Brown, Black', luster: 'Resinous' },
  { id: '12', name: 'Calcite', formula: 'CaCO3', density: 2.71, abrasionIndex: 0.02, workIndex: 5.0, class: 'Carbonate', molecularWeight: 100.09, elementalComposition: 'Ca: 40.04%, C: 12.00%, O: 47.96%', color: 'White, Colorless', luster: 'Vitreous' },
  { id: '20', name: 'Gold', formula: 'Au', density: 19.3, abrasionIndex: 0.01, workIndex: 6.0, class: 'Native Element', molecularWeight: 196.97, elementalComposition: 'Au: 100.00%', color: 'Gold yellow', luster: 'Metallic' },
];

interface ProjectViewProps {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

const EQUIPMENT_CONFIGS: Record<NodeType, EquipmentConfig> = {
  'Feed': {
    type: 'Feed', icon: ArrowRight, label: 'Feed (Source)', color: 'bg-transparent border-0 text-slate-500',
    inputs: [],
    outputs: [{ id: 'out', type: 'output', label: 'Stream' }],
    defaultParameters: { totalTph: 100, percentSolids: 60, description: 'Feed' }
  },
  'Product': {
    type: 'Product', icon: ArrowRight, label: 'Product (Sink)', color: 'bg-transparent border-0 text-slate-500',
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
// Feed/Product nodes are effectively invisible points
const COMPACT_NODE_WIDTH = 20;
const COMPACT_NODE_HEIGHT = 20;

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  nodes, 
  setNodes, 
  connections, 
  setConnections 
}) => {
  // UI State
  const [showSidebar, setShowSidebar] = useState(true);
  const [simState, setSimState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [activeTool, setActiveTool] = useState<'pointer' | 'stream'>('pointer');
  
  // Interaction State
  const [draggingNode, setDraggingNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  const [activeItem, setActiveItem] = useState<{ id: string; type: 'node' | 'connection'; x: number; y: number; data?: any; } | null>(null);
  
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
  const [activeTab, setActiveTab] = useState<'specifications' | 'composition'>('specifications');
  const [showClearModal, setShowClearModal] = useState(false);
  
  // Mineral State
  const [showMineralModal, setShowMineralModal] = useState(false);
  const [minerals, setMinerals] = useState<Mineral[]>(WEBMINERAL_DB);
  const [selectedMinerals, setSelectedMinerals] = useState<string[]>(['1', '2', '3', '6']); 
  const [mineralSearch, setMineralSearch] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---

  const getAbsolutePortPosition = (nodeId: string, portId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
    if (!config) return null;

    const isCompact = node.type === 'Feed' || node.type === 'Product';
    const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
    const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;

    // Special case for Feed/Product: Port is always center
    if (isCompact) {
        return {
            x: node.x + width / 2,
            y: node.y + height / 2
        };
    }

    // Check inputs
    const inputIndex = config.inputs.findIndex(p => p.id === portId);
    if (inputIndex !== -1) {
        return {
            x: node.x, 
            y: node.y + (height * ((inputIndex + 1) / (config.inputs.length + 1)))
        };
    }

    // Check outputs
    const outputIndex = config.outputs.findIndex(p => p.id === portId);
    if (outputIndex !== -1) {
        return {
            x: node.x + width, 
            y: node.y + (height * ((outputIndex + 1) / (config.outputs.length + 1)))
        };
    }
    return null;
  };

  // Aspen Style Orthogonal Routing
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
     setActiveItem(null);

     // Handle Stream Tool Logic (Start on Canvas = Create Feed Node)
     if (activeTool === 'stream') {
         if (!canvasRef.current) return;
         const bounds = canvasRef.current.getBoundingClientRect();
         const mouseX = e.clientX - bounds.left;
         const mouseY = e.clientY - bounds.top;

         // Center the node exactly on the mouse
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
         
         // Start drawing from this new Feed node center
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

    // Handle Node Dragging
    if (draggingNode) {
        setNodes(nds => nds.map(n => n.id === draggingNode.id ? { ...n, x: mouseX - draggingNode.offsetX, y: mouseY - draggingNode.offsetY } : n));
        return;
    }

    // Handle Connection Drawing
    if (drawingLine) {
        setDrawingLine(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
    }
  };

  const onCanvasMouseUp = (e: React.MouseEvent) => {
      setDraggingNode(null);

      // Handle Stream Tool Logic (End on Canvas = Create Product Node)
      if (activeTool === 'stream' && drawingLine) {
          if (!canvasRef.current) return;
          const bounds = canvasRef.current.getBoundingClientRect();
          const mouseX = e.clientX - bounds.left;
          const mouseY = e.clientY - bounds.top;
          
          // Check distance to avoid creating tiny lines on click-errors
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
          
          // Connect the line to this new node
          const newConn: Connection = {
              id: `conn_${Date.now()}`,
              fromNode: drawingLine.fromNode,
              fromPort: drawingLine.fromPort,
              toNode: newNodeId,
              toPort: 'in',
              parameters: { flowRate: 0, solidsPct: 0 }
          };
          
          setConnections(prev => [...prev, newConn]);
          setDrawingLine(null);
      }
      
      // Cancel normal drawing if let go on canvas
      if (drawingLine && activeTool !== 'stream') {
          setDrawingLine(null);
      }
  };

  // -- Port Interaction --

  const onPortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
      e.stopPropagation();
      // e.preventDefault(); 
      
      // Allow drawing regardless of tool if clicking explicit port, OR if tool is stream
      // Aspen: Clicking port in Stream mode starts line.
      
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
          // Prevent self-connection loop on same port
          if (drawingLine.fromNode === nodeId && drawingLine.fromPort === portId) {
              setDrawingLine(null);
              return;
          }
          
          // Check direction (Output -> Input only)
          // const fromNode = nodes.find(n => n.id === drawingLine.fromNode);
          // const toNode = nodes.find(n => n.id === nodeId);
          // We rely on config. 
          // Simplification: Just connect.
          
          const newConn: Connection = {
              id: `conn_${Date.now()}`,
              fromNode: drawingLine.fromNode,
              fromPort: drawingLine.fromPort,
              toNode: nodeId,
              toPort: portId,
              parameters: { flowRate: 0, solidsPct: 0 }
          };

          setConnections(prev => [...prev, newConn]);
          setDrawingLine(null);
          
          // If in stream mode, we are done with this stream. Tool stays active for next one.
      }
  };

  // -- Node Interaction --
  const onNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (activeTool === 'pointer') {
        setDraggingNode({ id: nodeId, offsetX: e.nativeEvent.offsetX, offsetY: e.nativeEvent.offsetY });
        setActiveItem(null);
      }
      // In Stream mode, clicking on Node does nothing (or could start line if logic was complex, but using ports is safer)
  };

  // --- Edit Logic ---
  const handleOpenEditModal = () => {
    if (!activeItem) return;
    setActiveTab('specifications');
    if (activeItem.type === 'node') {
        const node = nodes.find(n => n.id === activeItem.id);
        setEditFormData(node?.parameters || {});
    } else {
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
          setConnections(c => c.map(x => x.id === activeItem.id ? { ...x, parameters: editFormData } : x));
      }
      setEditModalOpen(false);
      setActiveItem(null);
  };

  const toggleMineralSelection = (id: string) => setSelectedMinerals(prev => prev.includes(id) ? prev.filter(mid => mid !== id) : [...prev, id]);
  const filteredMinerals = minerals.filter(min => min.name.toLowerCase().includes(mineralSearch.toLowerCase()));

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative">
      {/* Toolbar */}
      <header className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between select-none">
        <div className="flex items-center space-x-2">
            <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-lg transition-colors ${showSidebar ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'}`}>
                <PanelLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button onClick={() => { setShowMineralModal(true); setMineralSearch(''); }} className="px-3 py-2 bg-white border border-slate-200 rounded-lg flex items-center text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-purple-300 transition-all">
                <Beaker className="w-4 h-4 mr-2 text-purple-600" /> Components
            </button>
            <div className="h-6 w-px bg-slate-200 mx-2"></div>
            <button onClick={() => setSimState('running')} className={`px-4 py-2 rounded-lg flex items-center font-bold text-sm transition-all shadow-sm ${simState === 'running' ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-1' : 'bg-white border border-slate-200 text-slate-700 hover:bg-green-50 hover:text-green-700'}`}>
                <Play className={`w-4 h-4 mr-2 ${simState === 'running' ? 'fill-current' : ''}`} /> Simulate
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
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Operations</h3>
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
        >
            <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Drag and Drop Zone */}
            <div className="absolute inset-0 w-full h-full" onDrop={handleDrop} onDragOver={handleDragOver}>
                
                {/* Layer 1: Static Connections */}
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
                        return (
                            <g key={conn.id} onContextMenu={(e) => { e.preventDefault(); setActiveItem({ id: conn.id, type: 'connection', x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY, data: conn }); }} className="pointer-events-auto cursor-pointer group">
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke="transparent" strokeWidth="25" fill="none" />
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke={isActive ? "#2563eb" : "#64748b"} strokeWidth={isActive ? "3" : "2"} fill="none" markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"} className="transition-all group-hover:stroke-slate-600" />
                            </g>
                        );
                    })}
                </svg>

                {/* Layer 2: Nodes and Ports */}
                {nodes.map((node) => {
                    const config = EQUIPMENT_CONFIGS[node.type as keyof typeof EQUIPMENT_CONFIGS];
                    if (!config) return null;
                    const isActive = activeItem?.id === node.id;
                    const isCompact = node.type === 'Feed' || node.type === 'Product';
                    const width = isCompact ? COMPACT_NODE_WIDTH : NODE_WIDTH;
                    const height = isCompact ? COMPACT_NODE_HEIGHT : NODE_HEIGHT;
                    
                    // Determine visibility style for Compact Nodes (Feed/Product)
                    // They should be transparent (invisible) but still clickable
                    const nodeStyle = isCompact 
                        ? `bg-transparent border-none shadow-none z-10` 
                        : `bg-white border-2 shadow-sm hover:shadow-md z-20 ${config.color}`;
                    
                    return (
                        <div 
                            key={node.id} 
                            onMouseDown={(e) => onNodeMouseDown(e, node.id)} 
                            onContextMenu={(e) => { e.preventDefault(); setActiveItem({ id: node.id, type: 'node', x: node.x + width/2, y: node.y, data: node }); }} 
                            style={{ left: node.x, top: node.y, width: width, height: height, position: 'absolute' }} 
                            className={`group rounded-lg transition-all flex flex-col cursor-pointer ${nodeStyle} ${isActive && !isCompact ? 'ring-2 ring-blue-500 shadow-lg scale-105 z-40' : ''}`}
                        >
                            <div className={`flex items-center justify-center p-1 w-full h-full pointer-events-none`}>
                                {!isCompact && <config.icon className={`w-5 h-5 mr-1 opacity-75`} />}
                                {!isCompact && <span className="text-xs font-bold truncate">{node.label}</span>}
                                {/* For Compact nodes, we render nothing visible */}
                            </div>
                            
                            <div className="absolute inset-0 w-full h-full">
                                {/* INPUTS */}
                                {config.inputs.map((port, idx) => {
                                    // For compact nodes, center the port
                                    const topPos = isCompact ? '50%' : ((idx + 1) * (100 / (config.inputs.length + 1))) + '%';
                                    const leftPos = isCompact ? '50%' : '-16px';
                                    const transform = isCompact ? 'translate(-50%, -50%)' : 'translateY(-50%)';
                                    
                                    return (
                                        <div 
                                            key={port.id} 
                                            className="absolute w-8 h-8 flex items-center justify-center cursor-crosshair z-[100] hover:scale-125 transition-transform"
                                            style={{ top: topPos, left: leftPos, transform: transform }} 
                                            onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)}
                                            onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)}
                                            title={port.label || 'Input'}
                                        >
                                            {/* Dot is hidden for compact nodes unless hovered or active? Keeping it simple: invisible hit target for compact inputs if needed, though compact usually just needs one port */}
                                            <div className={`w-3 h-3 rounded-full border border-slate-600 bg-green-400 pointer-events-none ${isCompact ? 'opacity-0 group-hover:opacity-50' : ''}`}></div>
                                        </div>
                                    );
                                })}
                                
                                {/* OUTPUTS */}
                                {config.outputs.map((port, idx) => {
                                     const topPos = isCompact ? '50%' : ((idx + 1) * (100 / (config.outputs.length + 1))) + '%';
                                     const rightPos = isCompact ? 'auto' : '-16px';
                                     const leftPos = isCompact ? '50%' : 'auto';
                                     const transform = isCompact ? 'translate(-50%, -50%)' : 'translateY(-50%)';

                                    return (
                                        <div 
                                            key={port.id} 
                                            className={`absolute w-8 h-8 flex items-center justify-center cursor-crosshair z-[100] hover:scale-125 transition-transform`}
                                            style={{ top: topPos, right: rightPos, left: leftPos, transform: transform }} 
                                            onMouseDown={(e) => onPortMouseDown(e, node.id, port.id)}
                                            onMouseUp={(e) => onPortMouseUp(e, node.id, port.id)}
                                            title={port.label || 'Output'}
                                        >
                                            <div className={`w-3 h-3 rounded-full border border-slate-600 bg-red-400 pointer-events-none ${isCompact ? 'opacity-0 group-hover:opacity-50' : ''}`}></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}

                {/* Layer 3: Active Drawing Line (MOVED TO TOP to avoid being hidden by nodes, but pointer-events-none allows clicks through) */}
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

                {/* Context Menu / Action Menu */}
                {activeItem && !draggingNode && (
                   <div className="absolute z-[60] bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex flex-col min-w-[120px] animate-in fade-in zoom-in-95 duration-100 origin-top-left" style={{ left: activeItem.x + 10, top: activeItem.y }} onMouseDown={(e) => e.stopPropagation()}>
                      <button onClick={handleOpenEditModal} className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-left"><Edit className="w-4 h-4 mr-2" /> Edit</button>
                      <button onClick={() => { if(activeItem.type==='node') setNodes(n=>n.filter(x=>x.id!==activeItem.id)); else setConnections(c=>c.filter(x=>x.id!==activeItem.id)); setActiveItem(null); }} className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"><Trash2 className="w-4 h-4 mr-2" /> Delete</button>
                   </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Modals (Mineral, Edit, Clear) */}
      {showMineralModal && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col h-[85vh] animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg mr-4"><Database className="w-6 h-6 text-purple-600" /></div>
                        <div><h2 className="text-xl font-bold text-slate-900">Mineral Database & Selection</h2></div>
                    </div>
                    <button onClick={() => setShowMineralModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"><X className="w-6 h-6" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                         <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-16 text-center">Sel</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mineral</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Formula</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase text-right">SG</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredMinerals.map((mineral) => {
                                        const isSelected = selectedMinerals.includes(mineral.id);
                                        return (
                                            <tr key={mineral.id} className={`transition-colors ${isSelected ? 'bg-purple-50' : 'hover:bg-slate-50'}`}>
                                                <td className="px-4 py-3 text-center cursor-pointer" onClick={() => toggleMineralSelection(mineral.id)}>
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center mx-auto ${isSelected ? 'bg-purple-600 border-purple-600' : 'border-slate-300 bg-white'}`}>
                                                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{mineral.name}</td>
                                                <td className="px-4 py-3 font-mono text-slate-600 text-sm">{mineral.formula}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-700">{mineral.density}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                         </table>
                    </div>
                </div>
                <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
                    <button onClick={() => setShowMineralModal(false)} className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-sm">Done</button>
                </div>
            </div>
         </div>
      )}

      {editModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="font-bold text-lg text-slate-900">Edit Parameters</h3>
                      <button onClick={() => setEditModalOpen(false)}><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                       {activeItem.type === 'connection' ? (
                           <div className="space-y-4">
                               <div><label className="block text-sm font-medium text-slate-700">Mass Flow (t/h)</label><input type="number" value={editFormData.totalTph || 0} onChange={(e) => setEditFormData(p=>({...p, totalTph: parseFloat(e.target.value)}))} className="w-full border rounded p-2" /></div>
                               <div><label className="block text-sm font-medium text-slate-700">% Solids</label><input type="number" value={editFormData.percentSolids || 0} onChange={(e) => setEditFormData(p=>({...p, percentSolids: parseFloat(e.target.value)}))} className="w-full border rounded p-2" /></div>
                           </div>
                       ) : (
                           <div className="space-y-4">
                                {Object.entries(editFormData).map(([key, value]) => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-slate-700 capitalize">{key}</label>
                                        <input type="text" value={value as any} onChange={(e) => setEditFormData(p=>({...p, [key]: e.target.value}))} className="w-full border rounded p-2" />
                                    </div>
                                ))}
                           </div>
                       )}
                  </div>
                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                      <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                      <button onClick={handleSaveEditModal} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Save</button>
                  </div>
              </div>
          </div>
      )}
      
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Clear project?</h3>
                    <p className="text-slate-500 text-sm">This will remove all equipment and connections.</p>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex justify-end space-x-3">
                    <button onClick={() => setShowClearModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                    <button onClick={() => { setNodes([]); setConnections([]); setShowClearModal(false); }} className="px-4 py-2 bg-red-600 text-white rounded-lg">Clear All</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
