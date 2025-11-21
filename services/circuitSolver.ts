import { StreamData } from '../types';
import { calculateBondPower } from './miningMath';

export interface CircuitInputs {
  freshFeedTph: number;
  freshFeedSolids: number;
  workIndex: number;
  targetP80: number;
  circulatingLoadTarget: number; // e.g., 300%
  sgSolids: number;
}

export interface CircuitResult {
  millPowerKw: number;
  totalSystemTph: number;
  circulatingLoadActual: number;
  streams: {
    freshFeed: StreamData;
    millFeed: StreamData; // Combined Feed
    millDischarge: StreamData;
    cycloneFeed: StreamData;
    cycloneOverflow: StreamData; // Product
    cycloneUnderflow: StreamData; // Recirculation
  };
  efficiency: number;
}

/**
 * Simulates a standard SABC or Closed Circuit Ball Mill (Feed -> Mill -> Sump -> Cyclone -> (Over/Under))
 * Logic adapted from MINESIMRV02 standard mass balance solvers.
 */
export const solveClosedCircuit = (inputs: CircuitInputs): CircuitResult => {
  const { freshFeedTph, freshFeedSolids, workIndex, targetP80, circulatingLoadTarget, sgSolids } = inputs;

  // 1. Fresh Feed Stream
  const freshFeed: StreamData = {
    tph: freshFeedTph,
    waterTph: freshFeedTph * ( (100 - freshFeedSolids) / freshFeedSolids ),
    percentSolids: freshFeedSolids,
    sgSolids: sgSolids,
    slurryDensity: 100 / ((freshFeedSolids / sgSolids) + ((100 - freshFeedSolids) / 1))
  };

  // 2. Calculate Target Recirculation (Underflow) based on CL Ratio
  // CL = Underflow / FreshFeed
  const underflowTph = freshFeedTph * (circulatingLoadTarget / 100);
  
  // Assumption: Cyclone Underflow is usually denser (e.g., 75% solids)
  const underflowSolidsPct = 75; 
  const underflowWaterTph = underflowTph * ( (100 - underflowSolidsPct) / underflowSolidsPct );
  
  const cycloneUnderflow: StreamData = {
    tph: underflowTph,
    waterTph: underflowWaterTph,
    percentSolids: underflowSolidsPct,
    sgSolids: sgSolids,
    slurryDensity: 100 / ((underflowSolidsPct / sgSolids) + ((100 - underflowSolidsPct) / 1))
  };

  // 3. Calculate Mill Feed (Fresh + Underflow)
  const millFeedTph = freshFeedTph + underflowTph;
  const millFeedWater = freshFeed.waterTph + cycloneUnderflow.waterTph;
  const millFeedSolidsPct = (millFeedTph / (millFeedTph + millFeedWater)) * 100;

  const millFeed: StreamData = {
    tph: millFeedTph,
    waterTph: millFeedWater,
    percentSolids: millFeedSolidsPct,
    sgSolids: sgSolids,
    slurryDensity: 100 / ((millFeedSolidsPct / sgSolids) + ((100 - millFeedSolidsPct) / 1))
  };

  // 4. Mill Discharge (Usually water is added at sump, but assuming mill discharge is same mass as feed)
  const millDischarge = { ...millFeed }; 

  // 5. Cyclone Feed (Mill Discharge + Dilution Water usually, simplifying to = Mill Discharge for basic demo)
  const cycloneFeed = { ...millDischarge };

  // 6. Cyclone Overflow (Product) = Cyclone Feed - Underflow
  const overflowTph = cycloneFeed.tph - cycloneUnderflow.tph;
  const overflowWater = cycloneFeed.waterTph - cycloneUnderflow.waterTph;
  const overflowSolidsPct = (overflowTph / (overflowTph + overflowWater)) * 100;

  const cycloneOverflow: StreamData = {
    tph: overflowTph,
    waterTph: overflowWater,
    percentSolids: overflowSolidsPct,
    sgSolids: sgSolids,
    slurryDensity: 100 / ((overflowSolidsPct / sgSolids) + ((100 - overflowSolidsPct) / 1))
  };

  // 7. Power Calculation (Bond)
  // We calculate power based on NEW FEED usually for circuit specific energy, 
  // or TOTAL FEED for mill sizing. 
  // Bond formula typically applies to the reduction of the specific stream.
  // Here we estimate power required to grind fresh feed to target P80 given an F80.
  const assumedF80 = 12000; // microns
  const { totalPower } = calculateBondPower({
    workIndex,
    throughput: freshFeedTph, // Using Fresh Feed for Specific Energy calc basis
    feedSizeF80: assumedF80,
    productSizeP80: targetP80,
    millDiameter: 5, 
    millLength: 7, 
    fillingDegree: 35 
  });

  // Adjustment factor for efficiency of closed circuit (simulated)
  const efficiencyFactor = 1.0 + (Math.abs(circulatingLoadTarget - 250) / 1000); 

  return {
    millPowerKw: totalPower * efficiencyFactor,
    totalSystemTph: millFeedTph,
    circulatingLoadActual: circulatingLoadTarget,
    streams: {
        freshFeed,
        millFeed,
        millDischarge,
        cycloneFeed,
        cycloneOverflow,
        cycloneUnderflow
    },
    efficiency: (1 / efficiencyFactor) * 100
  };
};