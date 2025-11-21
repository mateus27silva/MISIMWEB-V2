
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
  Check
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
    outputs: [{ id: 'out1', type: 'output' }],
    defaultParameters: { efficiency: 95, power: 10 }
  },
  'Moinho': { 
    type: 'Moinho', icon: Settings2, label: 'Moinho', color: 'bg-blue-100 border-blue-500 text-blue-700',
    inputs: [{ id: 'feed', type: 'input', label: 'Feed' }],
    outputs: [{ id: 'discharge', type: 'output', label: 'Product' }],
    defaultParameters: { diameter: 4.5, length: 6.0, workIndex: 12.5, filling: 35 }
  },
  'Britador': { 
    type: 'Britador', icon: Hammer, label: 'Britador', color: 'bg-slate-200 border-slate-500 text-slate-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'product', type: 'output' }],
    defaultParameters: { css: 12, power: 110, capacity: 300 }
  },
  'Rougher': { 
    type: 'Rougher', icon: Layers, label: 'Rougher', color: 'bg-green-100 border-green-500 text-green-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output', label: 'Conc' }, { id: 'tail', type: 'output', label: 'Tail' }],
    defaultParameters: { residenceTime: 15, recovery: 85, airFlow: 50 }
  },
  'Cleaner': { 
    type: 'Cleaner', icon: Boxes, label: 'Cleaner', color: 'bg-teal-100 border-teal-500 text-teal-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output' }, { id: 'tail', type: 'output' }],
    defaultParameters: { residenceTime: 20, recovery: 90 }
  },
  'Reacleanner': { 
    type: 'Reacleanner', icon: Boxes, label: 'Reacleanner', color: 'bg-emerald-100 border-emerald-500 text-emerald-700',
    inputs: [{ id: 'feed', type: 'input' }],
    outputs: [{ id: 'conc', type: 'output' }, { id: 'tail', type: 'output' }],
    defaultParameters: { residenceTime: 25, recovery: 92 }
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

  // --- NEW: Context Menu & Edit Modal State ---
  const [activeItem, setActiveItem] = useState<{
    id: string;
    type: 'node' | 'connection';
    x: number;
    y: number;
    data?: any; // Holds current config
  } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});

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

  const handleSidebarDragStart = (e: React.DragEvent<HTMLDivElement>, type: string) => {
    e.dataTransfer.setData('application/reactflow', type);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleSidebarDrop = (e: React.DragEvent<HTMLDivElement>) => {
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
      label: type,
      parameters: { ...EQUIPMENT_CONFIGS[type].defaultParameters }
    };

    setNodes((nds) => [...nds, newNode]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // --- Node Interaction ---

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    
    // If left-click, we usually just want to drag OR start a connection, NOT open the menu.
    // We close the menu if it was open elsewhere.
    if (activeItem) {
        setActiveItem(null);
    }

    const node = nodes.find(n => n.id === nodeId);

    if (tool === 'connection') {
       return; 
    }

    if (node) {
      // Start Dragging
      setDraggingNode({
        id: nodeId,
        offsetX: e.nativeEvent.offsetX,
        offsetY: e.nativeEvent.offsetY
      });
    }
  };

  const handleNodeContextMenu = (e: React.MouseEvent, nodeId: string) => {
      e.preventDefault(); // Prevent browser context menu
      e.stopPropagation();

      const node = nodes.find(n => n.id === nodeId);
      if (node) {
          setActiveItem({
              id: nodeId,
              type: 'node',
              x: node.x + NODE_WIDTH / 2,
              y: node.y - 10,
              data: node
          });
      }
  };

  // --- Connection Logic (Ports & Canvas) ---

  // 1. Start Drawing from Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // Close context menu if clicking canvas
    setActiveItem(null);
    setEditModalOpen(false);

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
    }
  };

  // 2. Start Drawing from Port
  const handlePortMouseDown = (e: React.MouseEvent, nodeId: string, portId: string) => {
    e.stopPropagation();
    // Close menu
    setActiveItem(null);

    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return;

    const portPos = getAbsolutePortPosition(nodeId, portId);
    const startX = portPos ? portPos.x : e.clientX - bounds.left;
    const startY = portPos ? portPos.y : e.clientY - bounds.top;

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
        if (drawingLine.fromNode === nodeId) {
            setDrawingLine(null);
            return;
        }

        const newConn: Connection = {
            id: `conn_${Date.now()}`,
            fromNode: drawingLine.fromNode,
            fromPort: drawingLine.fromPort,
            fromX: drawingLine.fromNode ? undefined : drawingLine.startX,
            fromY: drawingLine.fromNode ? undefined : drawingLine.startY,
            toNode: nodeId,
            toPort: portId,
            parameters: { flowRate: 0, solidsPct: 0 } // Default stream data
        };

        const exists = connections.some(c => 
           c.fromNode === newConn.fromNode && c.fromPort === newConn.fromPort && 
           c.toNode === newConn.toNode && c.toPort === newConn.toPort
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
        
        // If dragging, hide the context menu
        if (activeItem) setActiveItem(null);
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
                toY: drawingLine.currY,
                parameters: { flowRate: 0, solidsPct: 0 }
            };
            setConnections(prev => [...prev, newConn]);
        }
        setDrawingLine(null);
    }
  };

  // --- Connection Interaction ---
  const handleConnectionContextMenu = (e: React.MouseEvent, conn: Connection) => {
      e.preventDefault(); // Prevent browser context menu
      e.stopPropagation();
      
      // Calculate center of line for menu position (approx)
      let x = 0, y = 0;
      if (conn.toX && conn.fromX) {
          x = (conn.fromX + conn.toX) / 2;
          y = (conn.fromY! + conn.toY!) / 2;
      } else if (conn.toNode && conn.fromNode) {
          const from = nodes.find(n => n.id === conn.fromNode);
          const to = nodes.find(n => n.id === conn.toNode);
          if (from && to) {
            x = (from.x + NODE_WIDTH + to.x) / 2;
            y = (from.y + NODE_HEIGHT/2 + to.y + NODE_HEIGHT/2) / 2;
          }
      } else {
          x = e.nativeEvent.offsetX;
          y = e.nativeEvent.offsetY;
      }

      setActiveItem({
          id: conn.id,
          type: 'connection',
          x,
          y,
          data: conn
      });
  };

  // --- Actions (Delete, Edit) ---

  const handleDeleteActive = () => {
    if (!activeItem) return;
    if (activeItem.type === 'node') {
      setNodes(nodes.filter(n => n.id !== activeItem.id));
      setConnections(connections.filter(c => c.fromNode !== activeItem.id && c.toNode !== activeItem.id));
    } else {
      setConnections(connections.filter(c => c.id !== activeItem.id));
    }
    setActiveItem(null);
  };

  const handleEditActive = () => {
      if (!activeItem) return;
      
      let initialData = {};
      if (activeItem.type === 'node') {
          const node = nodes.find(n => n.id === activeItem.id);
          initialData = node?.parameters || {};
      } else {
          const conn = connections.find(c => c.id === activeItem.id);
          initialData = conn?.parameters || {};
      }
      
      setEditFormData(initialData);
      setEditModalOpen(true);
      // Keep activeItem set so we know what we are editing
  };

  const handleSaveEdit = () => {
      if (!activeItem) return;

      if (activeItem.type === 'node') {
          setNodes(nds => nds.map(n => {
              if (n.id === activeItem.id) {
                  return { ...n, parameters: editFormData };
              }
              return n;
          }));
      } else {
          setConnections(conns => conns.map(c => {
              if (c.id === activeItem.id) {
                  return { ...c, parameters: editFormData };
              }
              return c;
          }));
      }
      setEditModalOpen(false);
      setActiveItem(null);
  };

  const confirmClearCanvas = () => {
      setNodes([]);
      setConnections([]);
      setActiveItem(null);
      setShowClearModal(false);
  };

  // Generate Bezier Path
  const getPath = (x1: number, y1: number, x2: number, y2: number) => {
     const dist = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * 0.4;
     const controlDist = Math.min(Math.max(dist, 20), 150);
     return `M ${x1} ${y1} C ${x1 + controlDist} ${y1}, ${x2 - controlDist} ${y2}, ${x2} ${y2}`;
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 relative">
      <header className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold text-slate-900">Flowsheet Designer</h1>
            <p className="text-slate-500">
                Right-click equipment or lines to edit/delete. Drag to move. Use "Linha" tool to connect.
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

      <div className="flex-1 flex bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden select-none relative">
        
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
                        <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
                        </marker>
                    </defs>

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
                        
                        const isActive = activeItem?.id === conn.id;

                        return (
                            <g 
                                key={conn.id} 
                                onContextMenu={(e) => handleConnectionContextMenu(e, conn)} 
                                className="pointer-events-auto cursor-pointer group"
                            >
                                {/* Fat transparent path for hit detection */}
                                <path d={getPath(start.x, start.y, end.x, end.y)} stroke="transparent" strokeWidth="25" fill="none" />
                                {/* Visible Path */}
                                <path 
                                    d={getPath(start.x, start.y, end.x, end.y)} 
                                    stroke={isActive ? "#2563eb" : "#64748b"} 
                                    strokeWidth={isActive ? "3" : "2"} 
                                    fill="none"
                                    markerEnd={isActive ? "url(#arrowhead-active)" : "url(#arrowhead)"}
                                    className="transition-all group-hover:stroke-slate-600"
                                />
                            </g>
                        );
                    })}

                    {drawingLine && (
                        <path 
                            d={getPath(drawingLine.startX, drawingLine.startY, drawingLine.currX, drawingLine.currY)}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeDasharray="5,5"
                            fill="none"
                            markerEnd="url(#arrowhead-active)"
                            pointerEvents="none" 
                        />
                    )}
                </svg>

                {/* Render Nodes */}
                {nodes.map((node) => {
                    const config = EQUIPMENT_CONFIGS[node.type];
                    const isActive = activeItem?.id === node.id;
                    
                    return (
                        <div
                            key={node.id}
                            onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                            onContextMenu={(e) => handleNodeContextMenu(e, node.id)}
                            style={{ 
                                left: node.x, 
                                top: node.y,
                                width: NODE_WIDTH,
                                height: NODE_HEIGHT,
                                position: 'absolute',
                            }}
                            className={`
                                group rounded-lg border-2 bg-white shadow-sm transition-all z-10 flex flex-col cursor-pointer
                                ${config.color}
                                ${isActive ? 'ring-2 ring-blue-500 shadow-lg scale-105 z-20' : 'hover:shadow-md'}
                            `}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-center p-2 border-b border-black/5 bg-white/50 rounded-t-md">
                                <config.icon className="w-4 h-4 mr-2 opacity-75" />
                                <span className="text-xs font-bold truncate">{node.label}</span>
                            </div>
                            
                            {/* Body */}
                            <div className="flex-1 relative">
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
                
                {/* Context Menu (Popup) */}
                {activeItem && !draggingNode && (
                   <div 
                      className="absolute z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex flex-col min-w-[120px] animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                      style={{ left: activeItem.x + 10, top: activeItem.y }}
                   >
                      <button 
                        onClick={handleEditActive}
                        className="flex items-center px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-md transition-colors text-left"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </button>
                      <button 
                        onClick={handleDeleteActive}
                        className="flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors text-left"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </button>
                   </div>
                )}
            </div>
        </div>
      </div>

      {/* --- Edit Modal (Suspended Screen) --- */}
      {editModalOpen && activeItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
                  <div className="flex items-center justify-between p-6 border-b border-slate-100">
                      <div className="flex items-center">
                          <div className="p-2 bg-blue-100 rounded-lg mr-3">
                              {activeItem.type === 'node' 
                                ? <Settings2 className="w-5 h-5 text-blue-600" /> 
                                : <ArrowUpRight className="w-5 h-5 text-blue-600" />
                              }
                          </div>
                          <div>
                              <h3 className="font-bold text-xl text-slate-900">
                                  Edit {activeItem.type === 'node' ? activeItem.data.label : 'Connection'}
                              </h3>
                              <p className="text-sm text-slate-500">Configure simulation parameters</p>
                          </div>
                      </div>
                      <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="p-6 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-4">
                          {Object.keys(editFormData).length > 0 ? (
                             Object.entries(editFormData).map(([key, value]) => (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-700 mb-1 capitalize">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </label>
                                    <input 
                                        type={typeof value === 'number' ? 'number' : 'text'}
                                        value={value}
                                        onChange={(e) => setEditFormData(prev => ({
                                            ...prev,
                                            [key]: typeof value === 'number' ? parseFloat(e.target.value) : e.target.value
                                        }))}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    />
                                </div>
                             ))
                          ) : (
                              <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-lg">
                                  <MoreHorizontal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p>No configurable parameters available for this item.</p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
                      <button 
                        onClick={() => setEditModalOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
                      >
                          Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm flex items-center transition-colors"
                      >
                          <Check className="w-4 h-4 mr-2" />
                          Save Changes
                      </button>
                  </div>
              </div>
          </div>
      )}

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
