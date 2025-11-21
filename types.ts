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

export interface StreamData {
  tph: number; // Tonnes per hour (Solids)
  waterTph: number; // Tonnes per hour (Water)
  percentSolids: number; // % Solids by weight
  slurryDensity: number; // t/m3
  sgSolids: number; // Specific Gravity of Solids
}

export interface BallMillInputs {
  workIndex: number; // Bond Work Index (kWh/t)
  throughput: number; // t/h
  feedSizeF80: number; // microns
  productSizeP80: number; // microns
  millDiameter: number; // meters
  millLength: number; // meters
  fillingDegree: number; // % volume
}

export interface HydrocycloneInputs {
  pressure: number; // kPa
  feedDensity: number; // % Solids
  d50Req: number; // Target cut point (microns)
  numberOfCyclones: number;
}

// --- Project Flowsheet Types ---

export type NodeType = 'Mixer' | 'Moinho' | 'Britador' | 'Rougher' | 'Cleaner' | 'Reacleanner';

export interface Port {
  id: string;
  type: 'input' | 'output';
  label?: string;
}

export interface EquipmentConfig {
  type: NodeType;
  icon: any; // React.ElementType is difficult to type strictly in pure TS without React import, using any or generic
  label: string;
  color: string;
  inputs: Port[];
  outputs: Port[];
}

export interface NodeData {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  label: string;
}

export interface Connection {
  id: string;
  fromNode?: string; // Optional: can start from space
  fromPort?: string; // Optional
  fromX?: number;    // Used if fromNode is undefined
  fromY?: number;    // Used if fromNode is undefined
  toNode?: string;   // Optional: can end in space
  toPort?: string;   // Optional
  toX?: number;      // Used if toNode is undefined
  toY?: number;      // Used if toNode is undefined
}