
import { BallMillInputs, HydrocycloneInputs, StreamData, Mineral } from '../types';

// --- Stoichiometry Helpers ---

/**
 * Parses the elemental composition string (e.g., "Fe: 69.9%, O: 30.1%") 
 * into a usable dictionary { "Fe": 0.699, "O": 0.301 }
 */
export const parseStoichiometry = (compositionStr: string): Record<string, number> => {
  const result: Record<string, number> = {};
  if (!compositionStr) return result;

  const parts = compositionStr.split(',').map(s => s.trim());
  parts.forEach(part => {
    const [element, percentage] = part.split(':').map(s => s.trim());
    if (element && percentage) {
      const value = parseFloat(percentage.replace('%', ''));
      if (!isNaN(value)) {
        result[element] = value / 100; // Store as fraction
      }
    }
  });
  return result;
};

/**
 * Calculates the weighted elemental assay of a stream based on its mineral flows.
 */
export const calculateStreamAssays = (
  mineralFlowsTph: Record<string, number>, 
  mineralsDb: Mineral[]
): Record<string, number> => {
  const totalSolidsTph = Object.values(mineralFlowsTph).reduce((a, b) => a + b, 0);
  if (totalSolidsTph === 0) return {};

  const elementMassFlows: Record<string, number> = {};

  // Iterate through each mineral in the stream
  Object.entries(mineralFlowsTph).forEach(([mineralId, massTph]) => {
    const mineralDef = mineralsDb.find(m => m.id === mineralId);
    if (mineralDef && mineralDef.elementalComposition) {
      const stoichiometry = parseStoichiometry(mineralDef.elementalComposition);
      
      // Add elemental mass contribution
      Object.entries(stoichiometry).forEach(([element, fraction]) => {
        elementMassFlows[element] = (elementMassFlows[element] || 0) + (massTph * fraction);
      });
    }
  });

  // Convert mass flow to percentage
  const assays: Record<string, number> = {};
  Object.entries(elementMassFlows).forEach(([element, mass]) => {
    assays[element] = (mass / totalSolidsTph) * 100;
  });

  return assays;
};

// --- Equipment Models ---

/**
 * Calculates the power required for a ball mill using Bond's Law.
 * W = 10 * Wi * (1/sqrt(P80) - 1/sqrt(F80))
 */
export const calculateBondPower = (inputs: BallMillInputs): { specificEnergy: number; totalPower: number } => {
  const { workIndex, throughput, feedSizeF80, productSizeP80 } = inputs;
  
  if (feedSizeF80 <= 0 || productSizeP80 <= 0) return { specificEnergy: 0, totalPower: 0 };

  const p80Term = 10 / Math.sqrt(productSizeP80);
  const f80Term = 10 / Math.sqrt(feedSizeF80);
  
  const specificEnergy = workIndex * (p80Term - f80Term); // kWh/t
  const totalPower = specificEnergy * throughput; // kW

  return { specificEnergy, totalPower };
};

/**
 * Simplified Plitt's Model approximation.
 */
export const calculateCyclonePerformance = (inputs: HydrocycloneInputs): { cutPoint: number; waterRecovery: number } => {
  const { pressure, feedDensity } = inputs;
  
  const baseCutPoint = 15; 
  const pressureFactor = Math.pow(100 / (pressure || 1), 0.5);
  const densityFactor = Math.exp(0.01 * feedDensity);
  
  const cutPoint = baseCutPoint * pressureFactor * densityFactor;
  const waterRecovery = 30 + (feedDensity * 0.5); 

  return { 
    cutPoint: parseFloat(cutPoint.toFixed(2)), 
    waterRecovery: parseFloat(Math.min(waterRecovery, 90).toFixed(2)) 
  };
};

/**
 * Basic Stream Property Calculation
 */
export const calculateStreamProperties = (tphSolids: number, percentSolids: number, sgSolids: number): Partial<StreamData> => {
  const fractionSolids = percentSolids / 100;
  if (fractionSolids === 0) return { totalTph: 0, solidsTph: 0, waterTph: 0 };

  const tphTotal = tphSolids / fractionSolids;
  const tphWater = tphTotal - tphSolids;
  
  // Density calculation: 100 / ( (%S/SGs) + (%W/SGw) )
  const slurryDensity = 100 / ((percentSolids / sgSolids) + ((100 - percentSolids) / 1));

  return {
    totalTph: tphTotal,
    solidsTph: tphSolids,
    waterTph: tphWater,
    percentSolids,
    slurryDensity,
    sgSolids
  };
};
