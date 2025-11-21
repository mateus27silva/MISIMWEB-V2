import { BallMillInputs, HydrocycloneInputs, StreamData } from '../types';

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
 * Simplified Plitt's Model approximation for demonstration.
 * Estimates d50c based on pressure and geometry (simplified factors).
 */
export const calculateCyclonePerformance = (inputs: HydrocycloneInputs): { cutPoint: number; waterRecovery: number } => {
  const { pressure, feedDensity } = inputs;
  
  // Empirical approximation factors for demo purposes
  // d50c proportional to (Pressure)^-0.5 and (PercentSolids)^0.5 exponent factor
  const baseCutPoint = 15; // arbitrary base for standard cyclone
  const pressureFactor = Math.pow(100 / (pressure || 1), 0.5);
  const densityFactor = Math.exp(0.01 * feedDensity);
  
  const cutPoint = baseCutPoint * pressureFactor * densityFactor;
  
  // Water recovery to underflow (Rf) often approximated by linear relation to solids or constant
  const waterRecovery = 30 + (feedDensity * 0.5); // % Water to underflow (Simplified)

  return { 
    cutPoint: parseFloat(cutPoint.toFixed(2)), 
    waterRecovery: parseFloat(Math.min(waterRecovery, 90).toFixed(2)) 
  };
};

export const calculateStreamProperties = (tphSolids: number, percentSolids: number, sgSolids: number): StreamData => {
  const fractionSolids = percentSolids / 100;
  const tphTotal = tphSolids / fractionSolids;
  const tphWater = tphTotal - tphSolids;
  
  // Density calculation: 100 / ( (%S/SGs) + (%W/SGw) )
  // SGw = 1.0
  const slurryDensity = 100 / ((percentSolids / sgSolids) + ((100 - percentSolids) / 1));

  return {
    tph: tphSolids,
    waterTph: tphWater,
    percentSolids,
    slurryDensity,
    sgSolids
  };
};
