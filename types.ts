

export enum EquipmentType {
  DASHBOARD = 'DASHBOARD',
  PROJECT = 'PROJECT',
  PARAMETERS = 'PARAMETERS',
  RESULTS = 'RESULTS',
  ECONOMICS = 'ECONOMICS',
  CHARTS = 'CHARTS',
  OPTIMIZATION = 'OPTIMIZATION',
  REPORTS = 'REPORTS',
  HELP = 'HELP',
  ADMIN = 'ADMIN'
}

// --- Global Simulation Definitions ---

export interface GlobalSimulationConfig {
  projectTitle: string;
  simulationBasis: 'Dry' | 'Wet';
  globalWaterDensity: number; // t/m3 (usually 1.0)
  // Feed definition moved to 'Feed' Node Type
}

// --- Stream Definitions (The "Blood" of the Mass Balance) ---

export interface StreamData {
  // State Variables
  totalTph: number;        // Total Mass Flow (Solids + Water)
  solidsTph: number;       // Solids Mass Flow
  waterTph: number;        // Water Mass Flow
  percentSolids: number;   // %Cw
  slurryDensity: number;   // t/m3
  
  // Component Vectors (Essential for Component Balance)
  mineralFlows: Record<string, number>; // Mineral ID -> t/h
  elementalAssays: Record<string, number>; // Element Symbol -> % (Calculated via Stoichiometry)
  
  // Properties
  sgSolids: number;        // Weighted Average SG
  p80?: number;            // 80% passing size (microns)
}

// --- Mineralogy & Chemistry ---

export interface Mineral {
  id: string;
  name: string;
  formula: string;
  density: number; // g/cm3 (SG)
  abrasionIndex: number; // AI
  workIndex: number; // WI (kWh/t)
  class: string; // e.g. Sulfide, Silicate
  selected?: boolean;
  molecularWeight?: number;
  elementalComposition?: string; // e.g. "Fe: 69.9%, O: 30.1%"
  
  // Stoichiometry Helper (Parsed from elementalComposition)
  stoichiometry?: Record<string, number>; // Element -> Fraction (0-1)
  
  color?: string;
  luster?: string;
  fracture?: string;
  cleavage?: string;
}

// --- Unit Operation Parameters (Degrees of Freedom) ---

export interface FeedInputs {
  totalTph: number;
  percentSolids: number;
  mineralComposition: Record<string, number>; // Mineral ID -> % in Feed
}

export interface BallMillInputs {
  workIndex: number; // kWh/t
  throughput: number; // t/h
  feedSizeF80: number; // microns
  productSizeP80: number; // microns
  millDiameter: number; // m
  millLength: number; // m
  fillingDegree: number; // %
  // Balance Specific
  dischargeSolidsTarget: number; // % (Water addition control)
}

export interface HydrocycloneInputs {
  pressure: number; // kPa
  feedDensity: number; // % Solids
  d50Req: number; // microns
  numberOfCyclones: number;
  // Balance Specific
  waterRecoveryToUnderflow: number; // Rf (%) - Key split parameter
  shortCircuit: number; // Bypass fraction
}

export interface FlotationInputs {
  residenceTime: number; // min
  airFlow: number; // m3/h
  // Balance Specific
  massPull: number; // % Mass to concentrate (Global estimate)
  waterPull: number; // % Water to concentrate
  targetRecovery: Record<string, number>; // Mineral ID -> Recovery % (Component Split)
}

// --- Project Flowsheet Types ---

export type NodeType = 'Feed' | 'Product' | 'Mixer' | 'Splitter' | 'Moinho' | 'Britador' | 'Hydrocyclone' | 'FlotationCell' | 'Conditioner' | 'Thickener';

export interface Port {
  id: string;
  type: 'input' | 'output';
  label?: string;
}

export interface EquipmentConfig {
  type: NodeType;
  icon: any; 
  label: string;
  color: string;
  inputs: Port[];
  outputs: Port[];
  // Defined Simulation Parameters (Default values)
  defaultParameters?: Record<string, any>; 
}

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
  parameters: Record<string, any>; // Stores the instance specific config
}

export interface Connection {
  id: string;
  label?: string; // User defined name for the stream
  fromNode?: string; 
  fromPort?: string; 
  fromX?: number;    
  fromY?: number;    
  toNode?: string;   
  toPort?: string;   
  toX?: number;      
  toY?: number;      
  
  parameters?: Record<string, any>;
  // Calculated State (The result of the balance)
  streamState?: StreamData; 
}

// --- Logging System ---
export type LogType = 'info' | 'success' | 'warning' | 'error';

export interface LogEntry {
  id: number;
  timestamp: string;
  type: LogType;
  message: string;
}