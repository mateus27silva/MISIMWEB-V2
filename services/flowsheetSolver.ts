
import { NodeData, Connection, StreamData, Mineral } from '../types';
import { calculateStreamProperties, calculateStreamAssays } from './miningMath';

// --- Constants ---
const MAX_ITERATIONS = 500;
const TOLERANCE_ABS = 1e-4; // 0.0001 t/h absolute tolerance

export interface SimulationResult {
  converged: boolean;
  iterations: number;
  error: number;
  streams: Record<string, StreamData>; // Connection ID -> Stream Data
  globalBalance: {
    inputs: number;
    outputs: number;
    error: number;
  };
  diagnostics: string[];
  activeMinerals?: Mineral[]; // List of minerals used in this simulation
}

// --- Helper: Initialize empty stream ---
const createEmptyStream = (): StreamData => ({
  totalTph: 0, solidsTph: 0, waterTph: 0, percentSolids: 0, slurryDensity: 1, sgSolids: 2.7, 
  mineralFlows: {}, 
  elementalAssays: { Cu: 0, Fe: 0, Au: 0, S: 0 }
});

// --- 1. Topological Validation ---
const validateFlowsheet = (nodes: NodeData[], connections: Connection[]): string[] => {
    const errors: string[] = [];
    const feeds = nodes.filter(n => n.type === 'Feed');
    if (feeds.length === 0) errors.push("ERRO CRÍTICO: O fluxograma não possui nenhuma alimentação ('Feed'). Adicione pelo menos uma.");

    connections.forEach(conn => {
        if (!conn.fromNode || !conn.toNode) {
            errors.push(`ERRO: A conexão '${conn.label || conn.id}' está solta. Conecte ambas as pontas.`);
        }
    });

    nodes.forEach(node => {
        const inputConns = connections.filter(c => c.toNode === node.id);
        const outputConns = connections.filter(c => c.fromNode === node.id);
        
        if (node.type !== 'Feed' && inputConns.length === 0) {
            errors.push(`ERRO: O equipamento '${node.label}' não tem entrada de material.`);
        }
        if (node.type !== 'Product' && outputConns.length === 0) {
            errors.push(`ERRO: O equipamento '${node.label}' não tem saída.`);
        }

        // Strict Feed Parameter Validation
        if (node.type === 'Feed') {
            const feedConn = connections.find(c => c.fromNode === node.id);
            if (feedConn) {
                const p = { ...node.parameters, ...feedConn.parameters };
                let hasMinerals = false;
                Object.keys(p).forEach(key => {
                    if (key.startsWith('mineral_') && parseFloat(p[key]) > 0) hasMinerals = true;
                });
                if (!hasMinerals) {
                     errors.push(`ERRO DE COMPONENTES: A alimentação '${node.label}' não possui composição mineralógica definida. Defina as % dos minerais na conexão de saída.`);
                }
            }
        }
    });

    return errors;
};

// --- 2. Solver Engine (Iterative Component Balance) ---
export const solveFlowsheet = (nodes: NodeData[], connections: Connection[], mineralsDb: Mineral[]): SimulationResult => {
  // A. Validation
  const topologyErrors = validateFlowsheet(nodes, connections);
  if (topologyErrors.length > 0) {
      return {
          converged: false, iterations: 0, error: 100, streams: {},
          globalBalance: { inputs: 0, outputs: 0, error: 100 },
          diagnostics: topologyErrors,
          activeMinerals: mineralsDb.filter(m => m.selected)
      };
  }

  // B. Initialization
  let streamState: Record<string, StreamData> = {};
  
  connections.forEach(conn => {
      const sourceNode = nodes.find(n => n.id === conn.fromNode);
      if (sourceNode?.type === 'Feed') {
          streamState[conn.id] = initializeFeedStream(sourceNode, conn, mineralsDb);
      } else {
          streamState[conn.id] = createEmptyStream();
      }
  });

  let diagnostics: string[] = [];
  let maxError = 0;
  let iter = 0;

  // C. Iteration Loop
  for (iter = 0; iter < MAX_ITERATIONS; iter++) {
    maxError = 0;

    const sortedNodes = [
        ...nodes.filter(n => n.type === 'Feed'),
        ...nodes.filter(n => n.type !== 'Feed' && n.type !== 'Product'),
        ...nodes.filter(n => n.type === 'Product')
    ];

    for (const node of sortedNodes) {
      if (node.type === 'Feed') continue; 

      // 1. Sum Inputs
      const inputConns = connections.filter(c => c.toNode === node.id);
      const inputStreams = inputConns.map(c => streamState[c.id]);
      
      // 2. Calculate Model
      const outputStreamsData = calculateNodeModel(node, inputStreams, mineralsDb);

      // 3. Update Outputs & Check Convergence
      const outputConns = connections.filter(c => c.fromNode === node.id);
      
      outputConns.forEach((conn, idx) => {
        let newStream = outputStreamsData[idx] || createEmptyStream();
        let oldStream = streamState[conn.id];

        const diff = Math.abs(newStream.totalTph - oldStream.totalTph);
        if (diff > maxError) maxError = diff;

        streamState[conn.id] = newStream;
      });
    }

    if (maxError < TOLERANCE_ABS) break;
  }

  // D. Global Balance Check
  let inputsTotal = 0;
  let outputsTotal = 0;

  nodes.filter(n => n.type === 'Feed').forEach(n => {
      connections.filter(c => c.fromNode === n.id).forEach(c => inputsTotal += streamState[c.id].totalTph);
  });
  
  nodes.filter(n => n.type === 'Product').forEach(n => {
       connections.filter(c => c.toNode === n.id).forEach(c => outputsTotal += streamState[c.id].totalTph);
  });

  const closureError = Math.abs(inputsTotal - outputsTotal);
  const errorPct = inputsTotal > 0 ? (closureError / inputsTotal) * 100 : 0;
  
  if (iter >= MAX_ITERATIONS) {
      diagnostics.push(`ALERTA: Número máximo de iterações (${MAX_ITERATIONS}) atingido. O balanço pode não estar fechado.`);
  }

  return {
    converged: maxError < TOLERANCE_ABS,
    iterations: iter,
    error: errorPct < 1e-4 ? 0 : errorPct,
    streams: streamState,
    globalBalance: { inputs: inputsTotal, outputs: outputsTotal, error: errorPct < 1e-4 ? 0 : errorPct },
    diagnostics: [...new Set(diagnostics)],
    activeMinerals: mineralsDb.filter(m => m.selected)
  };
};

// --- 3. Node Models (Physics Engines) ---

const initializeFeedStream = (node: NodeData, conn: Connection, mineralsDb: Mineral[]): StreamData => {
    const p = { ...node.parameters, ...conn.parameters }; 
    
    let solidsTph = parseFloat(p.solidsTph) || 0;
    const pct = parseFloat(p.percentSolids) || 0; 
    
    // Volumetric override
    if (p.volumetricFlow && parseFloat(p.volumetricFlow) > 0) {
        // Approximate initial calc, refined later by component sum
        const vol = parseFloat(p.volumetricFlow);
        const approxSg = 2.7;
        const slurryDensity = 100 / ((pct/approxSg) + ((100-pct)/1));
        const totalTph = vol * slurryDensity;
        solidsTph = totalTph * (pct/100);
    }
    
    const mineralFlows: Record<string, number> = {};
    let totalMineralPct = 0;
    let weightedSgSum = 0;
    
    Object.keys(p).forEach(key => {
        if (key.startsWith('mineral_')) {
            const mineralId = key.replace('mineral_', '');
            const valPct = parseFloat(p[key]) || 0;
            if (valPct > 0) {
                const mineralMass = solidsTph * (valPct / 100);
                mineralFlows[mineralId] = mineralMass;
                totalMineralPct += valPct;
                
                const mineralDef = mineralsDb.find(m => m.id === mineralId);
                if (mineralDef) {
                    weightedSgSum += valPct * mineralDef.density;
                } else {
                    weightedSgSum += valPct * 2.7; 
                }
            }
        }
    });
    
    // RE-CALCULATE SOLIDS FROM COMPONENT SUM TO ENSURE CONSISTENCY
    const massFromComponents = Object.values(mineralFlows).reduce((a, b) => a + b, 0);
    if (massFromComponents > 0) {
        solidsTph = massFromComponents;
    }

    let totalTph = 0;
    let waterTph = 0;
    if (pct > 0) {
         totalTph = solidsTph / (pct/100);
         waterTph = totalTph - solidsTph;
    }

    const avgSg = totalMineralPct > 0 ? weightedSgSum / totalMineralPct : 2.7;
    const slurryDensity = pct > 0 ? 100 / ((pct/avgSg) + ((100-pct)/1)) : 1;

    return {
        totalTph, solidsTph, waterTph, percentSolids: pct, slurryDensity, sgSolids: avgSg,
        mineralFlows,
        elementalAssays: {}
    };
};

const mixStreams = (streams: StreamData[]): StreamData => {
    let water = 0;
    let combinedMineralFlows: Record<string, number> = {};

    streams.forEach(s => {
        water += s.waterTph;
        if (s.mineralFlows) {
            Object.entries(s.mineralFlows).forEach(([mid, mass]) => {
                combinedMineralFlows[mid] = (combinedMineralFlows[mid] || 0) + mass;
            });
        }
    });
    
    const solids = Object.values(combinedMineralFlows).reduce((a, b) => a + b, 0);
    
    // SG Calc
    let momSg = 0;
    streams.forEach(s => { momSg += s.solidsTph * s.sgSolids; });
    const avgSg = solids > 0 ? momSg / solids : 2.7;
    
    const pct = (solids + water) > 0 ? (solids / (solids + water)) * 100 : 0;

    return {
        totalTph: solids + water,
        solidsTph: solids,
        waterTph: water,
        percentSolids: pct,
        sgSolids: avgSg,
        slurryDensity: 100 / ((pct/avgSg) + ((100-pct)/1)),
        mineralFlows: combinedMineralFlows,
        elementalAssays: {} 
    };
};

const calculateNodeModel = (node: NodeData, inputs: StreamData[], mineralsDb: Mineral[]): StreamData[] => {
    const p = node.parameters || {};
    const feed = mixStreams(inputs);
    
    if (node.type === 'Product' || node.type === 'Mixer' || node.type === 'Conditioner' || node.type === 'Britador') {
        return [feed];
    }

    // -- SPLITTER --
    if (node.type === 'Splitter') {
        const ratio = parseFloat(p.splitRatio || 50) / 100;
        
        const s1Minerals: Record<string, number> = {};
        Object.keys(feed.mineralFlows).forEach(k => s1Minerals[k] = feed.mineralFlows[k] * ratio);
        const s1 = createStreamFromComponents(s1Minerals, feed.waterTph * ratio, feed.sgSolids);
        
        const s2Minerals: Record<string, number> = {};
        Object.keys(feed.mineralFlows).forEach(k => s2Minerals[k] = feed.mineralFlows[k] * (1 - ratio));
        const s2 = createStreamFromComponents(s2Minerals, feed.waterTph * (1 - ratio), feed.sgSolids);
        
        return [s1, s2];
    }

    // -- BALL MILL --
    if (node.type === 'Moinho') {
        const targetDischarge = parseFloat(p.targetDischargeSolids || 70);
        let water = feed.waterTph;
        const solids = feed.solidsTph;
        
        // Water Addition Logic
        const currentPct = (solids + water) > 0 ? (solids / (solids + water)) * 100 : 0;
        if (currentPct > targetDischarge && solids > 0) {
            water = (solids * (100 - targetDischarge)) / targetDischarge;
        }
        
        // Return feed with adjusted water (Components pass through)
        return [createStreamFromComponents(feed.mineralFlows, water, feed.sgSolids)];
    }

    // -- HYDROCYCLONE (Physics: Density & Water Split) --
    if (node.type === 'Hydrocyclone') {
        const Rf = parseFloat(p.waterRecoveryToUnderflow || 40) / 100;
        const baseSolidsSplit = 0.75; // Typical solids split to UF
        
        const ufMinerals: Record<string, number> = {};
        const ofMinerals: Record<string, number> = {};
        
        Object.keys(feed.mineralFlows).forEach(k => {
             const mineral = mineralsDb.find(m => m.id === k);
             const sg = mineral ? mineral.density : 2.7;
             const massIn = feed.mineralFlows[k];
             
             // Density Effect: Higher SG -> Higher chance to go UF
             // Adjustment factor k = 0.05 per SG unit diff from 2.7
             let splitToUf = baseSolidsSplit + ((sg - 2.7) * 0.08); 
             splitToUf = Math.max(0.01, Math.min(0.99, splitToUf)); 

             const massUf = massIn * splitToUf;
             
             ufMinerals[k] = massUf;
             ofMinerals[k] = massIn - massUf; // Strict Mass Conservation
        });

        const ufStream = createStreamFromComponents(ufMinerals, feed.waterTph * Rf, feed.sgSolids); 
        const ofStream = createStreamFromComponents(ofMinerals, feed.waterTph * (1 - Rf), feed.sgSolids);
        
        return [ofStream, ufStream]; // [Overflow, Underflow]
    }

    // -- FLOTATION (Recovery Based) --
    if (node.type === 'FlotationCell') {
        const targetRecovery = parseFloat(p.mineralRecovery || 90) / 100;
        const waterPull = parseFloat(p.waterPull || 15) / 100;
        const gangueEntrainment = 0.05; // 5% of non-target goes to conc
        
        const concMinerals: Record<string, number> = {};
        const tailMinerals: Record<string, number> = {};
        
        Object.keys(feed.mineralFlows).forEach(mid => {
            const mineral = mineralsDb.find(m => m.id === mid);
            const massIn = feed.mineralFlows[mid];
            
            // Determine if mineral is hydrophobic (Target)
            // Logic: Sulfides and Native Elements float. Silicates/Oxides depress.
            const isTarget = mineral && (mineral.class === 'Sulfide' || mineral.class === 'Native Element' || mineral.selected); 
            
            const splitToConc = isTarget ? targetRecovery : gangueEntrainment;
            
            const massConc = massIn * splitToConc;
            concMinerals[mid] = massConc;
            tailMinerals[mid] = massIn - massConc;
        });

        const conc = createStreamFromComponents(concMinerals, feed.waterTph * waterPull, feed.sgSolids);
        const tail = createStreamFromComponents(tailMinerals, feed.waterTph * (1 - waterPull), feed.sgSolids);
        
        return [conc, tail];
    }

    return [feed];
};

const createStreamFromComponents = (minerals: Record<string, number>, water: number, defaultSg: number): StreamData => {
    const solids = Object.values(minerals).reduce((a, b) => a + b, 0);
    const total = solids + water;
    const pct = total > 0 ? (solids/total)*100 : 0;
    
    // In a full implementation, we would re-calculate SG here based on the new mix of minerals
    // For this iteration, we keep the parent SG to avoid instability unless we pass the DB everywhere strictly
    const den = 100 / ((pct/defaultSg) + ((100-pct)/1));
    
    return {
        totalTph: total, solidsTph: solids, waterTph: water, percentSolids: pct, slurryDensity: den, sgSolids: defaultSg,
        mineralFlows: minerals, elementalAssays: {}
    };
};
