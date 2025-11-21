import React, { useState, useRef, DragEvent, useEffect } from 'react';
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
  X
} from 'lucide-react';
import { 
  NodeType, 
  EquipmentConfig, 
  NodeData, 
  Connection 
} from '../types';

// --- Props Interface ---

interface ProjectViewProps {
  nodes: NodeData[];
  setNodes: React.Dispatch<React.SetStateAction<NodeData[]>>;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
}

// --- Configuration ---

const EQUIPMENT_CONFIGS: Record<NodeType, EquipmentConfig> = {
  'Mixer': { 
    type: 'Mixer', icon: Shuffle, label: 'Mixer', color: 'bg-purple-100 border-purple-500 text-purple-700',
    inputs: [{ id: 'in1', type: 'input' }, { id: 'in2', type: 'input' }],
    outputs: [{ id: 'out1', type: 'output' }]
  },
  'Moinho': { 
    type: 'Moinho', icon: Settings2, label: 'Moinho', color: 'bg-blue-100 border-blue-500 text-blue-700',
    inputs: [{ id: 'feed', type: 'input', label: 'Feed' }],
    outputs: [{ id: 'discharge', type: 'output', label: 'Product' }]
  },
  'Britador': { 
    type: 'Britador', icon: Hammer, label: 'Britador', color: 'bg-slate-200 border-slate-500 text-slate-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'product', type: 'output' }]
  },
  'Rougher': { 
    type: 'Rougher', icon: Layers, label: 'Rougher', color: 'bg-green-100 border-green-500 text-green-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output', label: 'Conc' }, { id: 'tail', type: 'output', label: 'Tail' }]
  },
  'Cleaner': { 
    type: 'Cleaner', icon: Boxes, label: 'Cleaner', color: 'bg-teal-100 border-teal-500 text-teal-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output' }, { id: 'tail', type: 'output' }]
  },
  'Reacleanner': { 
    type: 'Reacleanner', icon: Boxes, label: 'Reacleanner', color: 'bg-emerald-100 border-emerald-500 text-emerald-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output' }, { id: 'tail', type: 'output' }]
  },
};

const NODE_WIDTH = 140;
const NODE_HEIGHT = 80;

export const ProjectView: React.FC<ProjectViewProps> = ({ 
  nodes, 
  setNodes, 
  connections, 
  setConnections 
}) => {
  // Local UI State (Selection, Dragging, Tools)
  const [tool, setTool] = useState<'pointer' | 'connection'>('pointer');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  
  // Interaction State
  const [draggingNode, setDraggingNode] = useState<{id: string, offsetX: number, offsetY: number} | null>(null);
  
  // Line Drawing State
  const [drawingLine, setDrawingLine] = useState<{
    fromNode?: string;
    fromPort?: string;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  } | null>(null);

  // Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Helpers: Position Calculation ---

  const getAbsolutePortPosition = (nodeId: string, portId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    const config = EQUIPMENT_CONFIGS[node.type];
    
    // Check Inputs (Left Side)
    const inputIndex = config.inputs.findIndex(p => p.id === portId);
    if (inputIndex !== -1) {
        const totalPorts = config.inputs.length;
        const yPercent = (inputIndex + 1) / (totalPorts + 1);
        return {
            x: node.x, // Left edge
            y: node.y + (NODE_HEIGHT * yPercent)
        };
    }

    // Check Outputs (Right Side)
    const outputIndex = config.outputs.findIndex(p => p.id === portId);
    if (outputIndex !== -1) {
        const totalPorts = config.outputs.length;
        const yPercent = (outputIndex + 1) / (totalPorts + 1);
        return {
            x: node.x + NODE_WIDTH, // Right edge
            y: node.y + (NODE_HEIGHT * yPercent)
        };
    }

    return { x: node.x, y: node.y }; // Fallback
  };

  // --- Drag New Node from Sidebar ---

  const handleSidebarDragStart = (e: DragEvent, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSidebarDrop = (e: DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;

    const type = e.dataTransfer.getData('application/reactflow') as NodeType;
    if (!type || !EQUIPMENT_CONFIGS[type]) return;

    const bounds = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - bounds.left - (NODE_WIDTH / 2);
    const y = e.clientY - bounds.top - (NODE_HEIGHT / 2);

    const newNode: NodeData = {
      id: `node_${Date.now()}`,
      type,
      x,
      y,
      label: type
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // --- Node Interaction ---

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    if (tool === 'connection') {
        // In connection mode, clicking a node doesn't drag it.
        // It could potentially start a connection if we wanted node-center connections, 
        // but we stick to ports or space for now.
        return; 
    }

    setSelectedNode(nodeId);
    setSelectedConnection(null);
    
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setDraggingNode({
        id: nodeId,
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY
      });
    }
  };

  // --- Connection Logic (Ports & Canvas) ---

  // 1. Start Drawing from Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (tool === 'connection' && canvasRef.current) {
        const bounds = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;

        setDrawingLine({
            startX: x,
            startY: y,
            currX: x,
            currY: y
        });
        
        // Deselect everything when starting to draw on canvas
        setSelectedNode(null);
        setSelectedConnection(null);
    } else if (tool === 'pointer') {
        setSelectedNode(null);
        setSelectedConnection(null);
    }
  };

  // 2. Start Drawing from Port
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
    e.stopPropagation();
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const portPos = getAbsolutePortPosition(nodeId, portId);
    const startX = portPos ? portPos.x : e.clientX - bounds.left;
    const startY = portPos ? portPos.y : e.clientY - bounds.top;

    // We allow drawing from a port in both modes for better UX
    setDrawingLine({
        fromNode: nodeId,
        fromPort: portId,
        startX: startX,
        startY: startY,
        currX: startX,
        currY: startY
    });
  };

  // 3. End Drawing on Port (Snap)
  const handlePortMouseUp = (e: React.MouseEvent, nodeId: string, portId: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (drawingLine) {
        // Check if valid connection loop
        if (drawingLine.fromNode === nodeId) {
            setDrawingLine(null);
            return;
        }

        // Create Connection
        const newConn: Connection = {
            id: `conn_${Date.now()}`,
            fromNode: drawingLine.fromNode,
            fromPort: drawingLine.fromPort,
            fromX: drawingLine.fromNode ? undefined : drawingLine.startX,
            fromY: drawingLine.fromNode ? undefined : drawingLine.startY,
            toNode: nodeId,
            toPort: portId
        };

        // Avoid duplicates
        const exists = connections.some(c => 
           (c.fromNode === newConn.fromNode && c.fromPort === newConn.fromPort && 
            c.toNode === newConn.toNode && c.toPort === newConn.toPort) ||
           // Check coordinate based duplicate (simplified)
           (c.fromX === newConn.fromX && c.fromY === newConn.fromY &&
            c.toNode === newConn.toNode && c.toPort === newConn.toPort)
        );

        if (!exists) {
            setConnections(prev => [...prev, newConn]);
        }
        
        setDrawingLine(null);
    }
  };

  // 4. Update Drawing / Drag Nodes
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - bounds.left;
    const mouseY = e.clientY - bounds.top;

    // Handle Node Dragging
    if (draggingNode && tool === 'pointer') {
        setNodes(nds => nds.map(n => {
            if (n.id === draggingNode.id) {
                return {
                    ...n,
                    x: mouseX - draggingNode.offsetX,
                    y: mouseY - draggingNode.offsetY
                };
            }
            return n;
        }));
    }

    // Handle Line Drawing Update
    if (drawingLine) {
        setDrawingLine(prev => prev ? { ...prev, currX: mouseX, currY: mouseY } : null);
    }
  };

  // 5. End Drawing on Canvas (Loose End)
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    setDraggingNode(null);

    if (drawingLine) {
        // Only create loose end connection if length is significant or if it started from a node
        const dist = Math.sqrt(
            Math.pow(drawingLine.currX - drawingLine.startX, 2) + 
            Math.pow(drawingLine.currY - drawingLine.startY, 2)
        );

        if (dist > 10 || drawingLine.fromNode) {
             const newConn: Connection = {
                id: `conn_${Date.now()}`,
                fromNode: drawingLine.fromNode,
                fromPort: drawingLine.fromPort,
                fromX: drawingLine.fromNode ? undefined : drawingLine.startX,
                fromY: drawingLine.fromNode ? undefined : drawingLine.startY,
                toX: drawingLine.currX,
                toY: drawingLine.currY
            };
            setConnections(prev => [...prev, newConn]);
        }
        setDrawingLine(null);
    }
  };

  // --- Helpers ---

  const deleteSelected = () => {
    if (selectedNode) {
      setNodes(nodes.filter(n => n.id !== selectedNode));
      setConnections(connections.filter(c => c.fromNode !== selectedNode && c.toNode !== selectedNode));
      setSelectedNode(null);
    }
    if (selectedConnection) {
        setConnections(connections.filter(c => c.id !== selectedConnection));
        setSelectedConnection(null);
    }
  };

  const confirmClearCanvas = () => {
      setNodes([]);
      setConnections([]);
      setSelectedNode(null);
      setSelectedConnection(null);
      setShowClearModal(false);
  };

  // Generate Bezier Path
  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
     const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * 0.4;
     // If points are close, reduce curvature
     const controlDist = Math.min(Math.max(dist, 20), 150);
     
     // Simple logic: assume left-to-right flow preference
     // If x2 < x1 (backwards), curve goes up/down more
     return `M ${x1} ${y1} C ${x1 + controlDist} ${y1}, ${x2 - controlDist} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative">
      <header className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Flowsheet Designer</h1>
            <p className="text-slate-500">
                {tool === 'connection' 
                  ? "Draw Mode: Drag on canvas or between ports to connect." 
                  : "Select Mode: Move equipment or delete items."}
            </p>
        </div>
        <div className="flex space-x-2">
            <button onClick={() => setShowClearModal(true)} className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium flex items-center transition-colors">
                <RotateCcw className="w-4 h-4 mr-2" /> Clear
            </button>
            <button className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium flex items-center shadow-sm transition-colors">
                <Save className="w-4 h-4 mr-2" /> Save Project
            </button>
        </div>
      </header>

      <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none">
        
        {/* Sidebar / Toolbox */}
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-20">
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Tools</h3>
            <div className="flex space-x-2">
                <button 
                    onClick={() => setTool('pointer')}
                    className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${tool === 'pointer' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    title="Select/Move Tool"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
                <button 
                    onClick={() => setTool('connection')}
                    className={`flex-1 p-2 rounded-lg flex items-center justify-center transition-colors ${tool === 'connection' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                    title="Connection Tool (Linha)"
                >
                    <ArrowUpRight className="w-5 h-5" />
                    <span className="ml-2 text-sm font-medium">Linha</span>
                </button>
            </div>
            {(selectedNode || selectedConnection) && (
                <button 
                    onClick={deleteSelected}
                    className="w-full mt-2 p-2 rounded-lg flex items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 transition-colors"
                >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </button>
            )}
          </div>

          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Equipment</h3>
            <div className="space-y-3">
                {Object.values(EQUIPMENT_CONFIGS).map((item) => (
                    <div
                        key={item.type}
                        onDragStart={(e) => handleSidebarDragStart(e, item.type)}
                        draggable
                        className="flex items-center p-3 rounded-lg border-2 border-dashed border-slate-300 bg-white cursor-move hover:border-blue-400 hover:shadow-md transition-all"
                    >
                        <item.icon className="w-5 h-5 text-slate-500 mr-3" />
                        <span className="text-slate-700 font-medium">{item.label}</span>
                    </div>
                ))}
            </div>
          </div>
        </div>

        {/* Canvas Area */}
        <div 
            className={`flex-1 relative bg-slate-50 overflow-hidden ${tool === 'connection' ? 'cursor-crosshair' : 'cursor-default'}`} 
            ref={canvasRef}
            onMouseDown={handleCanvasMouseDown}
        >
            {/* Grid Pattern */}
            <div className="absolute inset-0 pointer-events-none opacity-10" 
                 style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            {/* Interaction Layer */}
            <div 
                className="absolute inset-0 w-full h-full"
                onDrop={handleSidebarDrop}
                onDragOver={handleDragOver}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
            >
                {/* SVG Connections Layer */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                        </marker>
                        <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                        </marker>
                        <marker id="arrowhead-drawing" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
                        </marker>
                    </defs>

                    {/* Render Saved Connections */}
                    {connections.map(conn => {
                        let start = { x: 0, y: 0 };
                        let end = { x: 0, y: 0 };

                        // Determine Start
                        if (conn.fromNode && conn.fromPort) {
                            const pos = getAbsolutePortPosition(conn.fromNode, conn.fromPort);
                            if (pos) start = pos;
                        } else if (conn.fromX !== undefined && conn.fromY !== undefined) {
                            start = { x: conn.fromX, y: conn.fromY };
                        }

                        // Determine End
                        if (conn.toNode && conn.toPort) {
                            const pos = getAbsolutePortPosition(conn.toNode, conn.toPort);
                            if (pos) end = pos;
                        } else if (conn.toX !== undefined && conn.toY !== undefined) {
                            end = { x: conn.toX, y: conn.toY };
                        }
                        
                        if ((start.x === 0 && start.y === 0) || (end.x === 0 && end.y === 0)) return null;
                        
                        const isSelected = selectedConnection === conn.id;

                        return (
                            <g key={conn.id} onClick={(e) => { e.stopPropagation(); setSelectedConnection(conn.id); }} className="pointer-events-auto cursor-pointer">
                                {/* Wider transparent path for easier clicking */}
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke="transparent" strokeWidth="20" fill="none" />
                                <path 
                                    d={getPath(start.x, start.y, end.x, end.y)} 
                                    stroke={isSelected ? "#2563eb" : "#64748b"} 
                                    strokeWidth={isSelected ? "3" : "2"} 
                                    fill="none"
                                    markerEnd={isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"}
                                />
                            </g>
                        );
                    })}

                    {/* Render Active Drawing Line */}
                    {drawingLine && (
                        <path 
                            d={getPath(drawingLine.startX, drawingLine.startY, drawingLine.currX, drawingLine.currY)}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                            markerEnd="url(#arrowhead-drawing)"
                            pointerEvents="none" 
                        />
                    )}
                </svg>

                {/* Render Nodes */}
                {nodes.map((node) => {
                    const config = EQUIPMENT_CONFIGS[node.type];
                    const isSelected = selectedNode === node.id;
                    
                    return (
                        <div
                            key={node.id}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            style={{ 
                                left: node.x, 
                                top: node.y,
                                width: NODE_WIDTH,
                                height: NODE_HEIGHT,
                                position: 'absolute',
                            }}
                            className={`
                                group rounded-lg border-2 bg-white shadow-sm transition-all z-10 flex flex-col
                                ${config.color}
                                ${isSelected ? 'ring-2 ring-blue-500 shadow-lg scale-105 z-20' : 'hover:shadow-md'}
                            `}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-center p-2 border-b border-black/5 bg-white/50 rounded-t-md">
                                <config.icon className="w-4 h-4 mr-2 opacity-75" />
                                <span className="text-xs font-bold truncate">{node.label}</span>
                            </div>
                            
                            {/* Body */}
                            <div className="flex-1 relative">
                                {/* Input Ports (Left) */}
                                {config.inputs.map((port, idx) => {
                                    const total = config.inputs.length;
                                    const topPos = ((idx + 1) * (100 / (total + 1))) + '%';
                                    return (
                                        <div
                                            key={port.id}
                                            className="absolute -left-3 w-6 h-6 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-30"
                                            style={{ top: topPos, transform: 'translateY(-50%)' }}
                                            onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id)}
                                            onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id)}
                                            title={port.label || 'Input'}
                                        >
                                            <div className={`w-3 h-3 rounded-full border border-slate-600 bg-green-400 transition-colors hover:bg-green-300 hover:border-green-600 shadow-sm`}></div>
                                        </div>
                                    );
                                })}

                                {/* Output Ports (Right) */}
                                {config.outputs.map((port, idx) => {
                                    const total = config.outputs.length;
                                    const topPos = ((idx + 1) * (100 / (total + 1))) + '%';
                                    return (
                                        <div
                                            key={port.id}
                                            className="absolute -right-3 w-6 h-6 flex items-center justify-center cursor-crosshair hover:scale-125 transition-transform z-30"
                                            style={{ top: topPos, transform: 'translateY(-50%)' }}
                                            onMouseDown={(e) => handlePortMouseDown(e, node.id, port.id)}
                                            onMouseUp={(e) => handlePortMouseUp(e, node.id, port.id)}
                                            title={port.label || 'Output'}
                                        >
                                            <div className={`w-3 h-3 rounded-full border border-slate-600 bg-red-400 transition-colors hover:bg-red-300 hover:border-red-600 shadow-sm`}></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform scale-100 animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <button onClick={() => setShowClearModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Clear entire project?</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">
                        This will remove all equipment and connections from the canvas. This action cannot be undone.
                    </p>
                </div>
                <div className="bg-slate-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                    <button 
                        onClick={() => setShowClearModal(false)}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmClearCanvas}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-sm transition-colors"
                    >
                        Yes, Clear All
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};