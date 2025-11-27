
import { BallMillInputs, HydrocycloneInputs, StreamData, Mineral } from '../types';

// --- Database Constant ---

export const WEBMINERAL_DB: Mineral[] = [
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
