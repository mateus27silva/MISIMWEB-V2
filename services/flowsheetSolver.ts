

import { NodeData, Connection, StreamData, Mineral } from '../types';
import { calculateStreamProperties, calculateStreamAssays } from './miningMath';

// --- Constants ---
const MAX_ITERATIONS = 500;
const TOLERANCE_ABS = 1e-4; // 0.0001 t/h absolute tolerance
const TOLERANCE_REL = 1e-4; // 0.01% relative tolerance

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

// --- 1. Topological Validation (Pre-Flight Check) ---
const validateFlowsheet = (nodes: NodeData[], connections: Connection[]): string[] => {
    const errors: string[] = [];
    
    // Check 1: Must have Feed
    const feeds = nodes.filter(n => n.type === 'Feed');
    if (feeds.length === 0) errors.push("ERRO CRÍTICO: O fluxograma não possui nenhuma alimentação ('Feed'). Adicione pelo menos uma.");

    // Check 2: Connections Validity
    connections.forEach(conn => {
        if (!conn.fromNode || !conn.toNode) {
            errors.push(`ERRO: A conexão '${conn.label || conn.id}' está solta. Conecte ambas as pontas.`);
        }
    });

    // Check 3: Node Connectivity (Islands & Dead ends)
    nodes.forEach(node => {
        const inputConns = connections.filter(c => c.toNode === node.id);
        const outputConns = connections.filter(c => c.fromNode === node.id);
        
        if (node.type !== 'Feed' && inputConns.length === 0) {
            errors.push(`ERRO: O equipamento '${node.label}' não tem entrada de material.`);
        }
        if (node.type !== 'Product' && outputConns.length === 0) {
            errors.push(`ERRO: O equipamento '${node.label}' não tem saída.`);
        }
        
        // Check 4: Specific Logic Parameters
        if (node.type === 'Splitter' && !node.parameters.splitRatio) {
            errors.push(`AVISO: Splitter '${node.label}' sem razão de corte definida. Usando padrão 50/50.`);
        }

        // Check 5: Strict Feed Parameter Validation (MANDATORY USER INPUT)
        if (node.type === 'Feed') {
            // Find the outgoing connection for this feed to get params
            const feedConn = connections.find(c => c.fromNode === node.id);
            if (feedConn) {
                // Priority: Connection params (user edited stream) > Node params
                const p = { ...node.parameters, ...feedConn.parameters };
                
                // Parse values safely
                const tph = parseFloat(String(p.solidsTph || 0));
                const vol = parseFloat(String(p.volumetricFlow || 0));
                const pct = parseFloat(String(p.percentSolids || 0));

                // Validation A: Flow Rate exists (Must be > 0)
                if (tph <= 0 && vol <= 0) {
                    errors.push(`ERRO DE INPUT: A alimentação '${node.label}' (Corrente: ${feedConn.label || 'Sem Nome'}) não possui vazão definida. Edite a corrente e informe 'Vazão Volumétrica' ou 'Tonalgem Sólida' maior que zero.`);
                }
                
                // Validation B: % Solids exists
                if (pct <= 0 || pct > 100) {
                    errors.push(`ERRO DE INPUT: A alimentação '${node.label}' (Corrente: ${feedConn.label || 'Sem Nome'}) deve ter % Sólidos entre 0.1 e 100.`);
                }

                // Validation C: Minerals exist (Chemistry check)
                // Check if any 'mineral_<id>' param > 0
                let hasMinerals = false;
                Object.keys(p).forEach(key => {
                    if (key.startsWith('mineral_')) {
                        const val = parseFloat(p[key]);
                        if (val > 0) hasMinerals = true;
                    }
                });
                
                if (!hasMinerals) {
                     errors.push(`ERRO DE COMPONENTES: A alimentação '${node.label}' (Corrente: ${feedConn.label || 'Sem Nome'}) não possui composição mineralógica definida. Edite a corrente e informe a % dos minerais selecionados.`);
                }
            } else {
                errors.push(`ERRO: O Alimentador '${node.label}' não está conectado a nada.`);
            }
        }
    });

    return errors;
};

// --- 2. Solver Engine (Iterative) ---
export const solveFlowsheet = (nodes: NodeData[], connections: Connection[], mineralsDb: Mineral[]): SimulationResult => {
  // A. Validation
  const topologyErrors = validateFlowsheet(nodes, connections);
  
  // Strict Block: If any errors exist, do not run simulation logic.
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
  
  // Initialize user-defined Feeds
  connections.forEach(conn => {
      // Logic: If connection comes from a 'Feed' node, use node/conn params to init
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

  // C. Iteration Loop (Successive Substitution)
  for (iter = 0; iter < MAX_ITERATIONS; iter++) {
    maxError = 0;

    // Topological sort approximation: Process Feed first, then others
    const sortedNodes = [
        ...nodes.filter(n => n.type === 'Feed'),
        ...nodes.filter(n => n.type !== 'Feed' && n.type !== 'Product'),
        ...nodes.filter(n => n.type === 'Product')
    ];

    for (const node of sortedNodes) {
      if (node.type === 'Feed') continue; // Feeds are constant boundary conditions

      // 1. Sum Inputs
      const inputConns = connections.filter(c => c.toNode === node.id);
      const inputStreams = inputConns.map(c => streamState[c.id]);
      
      // 2. Calculate Model
      const outputStreamsData = calculateNodeModel(node, inputStreams, connections.filter(c => c.fromNode === node.id), mineralsDb);

      // 3. Update Outputs & Check Convergence
      const outputConns = connections.filter(c => c.fromNode === node.id);
      
      outputConns.forEach((conn, idx) => {
        let newStream = outputStreamsData[idx] || createEmptyStream();
        let oldStream = streamState[conn.id];

        // Error Calculation (on Total Mass Flow)
        const diff = Math.abs(newStream.totalTph - oldStream.totalTph);
        if (diff > maxError) maxError = diff;

        // Update State
        streamState[conn.id] = newStream;
      });
    }

    // Check Convergence
    // We check absolute error on Mass Flow.
    if (maxError < TOLERANCE_ABS) break;
  }

  // D. Global Balance Check (Zero Error verification)
  let inputsTotal = 0;
  let outputsTotal = 0;

  // Inputs = Sum of streams leaving Feed nodes
  nodes.filter(n => n.type === 'Feed').forEach(n => {
      connections.filter(c => c.fromNode === n.id).forEach(c => inputsTotal += streamState[c.id].totalTph);
  });
  
  // Outputs = Sum of streams entering Product nodes
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
    error: errorPct < 1e-4 ? 0 : errorPct, // Snap to zero if negligible
    streams: streamState,
    globalBalance: { inputs: inputsTotal, outputs: outputsTotal, error: errorPct < 1e-4 ? 0 : errorPct },
    diagnostics: [...new Set(diagnostics)],
    activeMinerals: mineralsDb.filter(m => m.selected)
  };
};

// --- 3. Node Models (Physics Engines) ---

const initializeFeedStream = (node: NodeData, conn: Connection, mineralsDb: Mineral[]): StreamData => {
    // Priority: Connection Params > Node Params > Defaults
    const p = { ...node.parameters, ...conn.parameters }; 
    
    // Check if user entered Volumetric or Mass
    let totalTph = 0;
    let solidsTph = 0;
    let waterTph = 0;
    
    // Strict Input Parsing (No defaults here, relying on validation)
    const pct = parseFloat(p.percentSolids) || 0; 
    const sg = parseFloat(p.sg) || 2.7; // Default SG, usually overwritten by mineral SG

    if (p.volumetricFlow && parseFloat(p.volumetricFlow) > 0) {
        const vol = parseFloat(p.volumetricFlow);
        // Calc density
        // Prevent division by zero if pct is 0 (though validation should catch this)
        if (pct > 0) {
            const slurryDensity = 100 / ((pct/sg) + ((100-pct)/1));
            totalTph = vol * slurryDensity;
        }
    } else {
        solidsTph = parseFloat(p.solidsTph) || 0;
        if (pct > 0) {
            totalTph = solidsTph / (pct/100);
        }
    }
    
    // Recalculate based on total to ensure consistency
    if (totalTph > 0 && pct > 0) {
        solidsTph = totalTph * (pct/100);
        waterTph = totalTph - solidsTph;
    }
    
    // Initialize Component Vectors based on user input (Mineral %)
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
                
                // For SG Weighted Average
                const mineralDef = mineralsDb.find(m => m.id === mineralId);
                if (mineralDef) {
                    weightedSgSum += valPct * mineralDef.density;
                } else {
                    weightedSgSum += valPct * 2.7; // Fallback
                }
            }
        }
    });
    
    // Normalize Mass: If mineral % doesn't sum to 100%, we shouldn't create or destroy mass.
    // BUT, for the solver to be component-based, we define solidsTph = sum(components)
    // If user entered 60% Silica + 20% Gold = 80% total, we assume the rest is unaccounted or user error.
    // To be robust: We trust the mass sum.
    
    const massFromComponents = Object.values(mineralFlows).reduce((a, b) => a + b, 0);
    
    // Update solidsTph to match sum of components (Prevents component balance drift)
    if (Math.abs(massFromComponents - solidsTph) > 0.001 && massFromComponents > 0) {
        solidsTph = massFromComponents;
        // Recalculate total based on fixed solids and %Cw
        if (pct > 0) {
             totalTph = solidsTph / (pct/100);
             waterTph = totalTph - solidsTph;
        }
    }

    // Calc Average SG of Solids
    const avgSg = totalMineralPct > 0 ? weightedSgSum / totalMineralPct : sg;

    // Calculate Elemental Assays from Minerals
    const assays = calculateStreamAssays(mineralFlows, mineralsDb);

    const slurryDensity = pct > 0 ? 100 / ((pct/avgSg) + ((100-pct)/1)) : 1;

    return {
        totalTph, solidsTph, waterTph, percentSolids: pct, slurryDensity, sgSolids: avgSg,
        mineralFlows,
        elementalAssays: {
            Cu: assays.Cu || 0,
            Fe: assays.Fe || 0,
            Au: assays.Au || 0,
            S: assays.S || 0,
        }
    };
};

const mixStreams = (streams: StreamData[]): StreamData => {
    let water = 0;
    let combinedMineralFlows: Record<string, number> = {};

    streams.forEach(s => {
        water += s.waterTph;
        
        // Combine minerals
        if (s.mineralFlows) {
            Object.entries(s.mineralFlows).forEach(([mid, mass]) => {
                combinedMineralFlows[mid] = (combinedMineralFlows[mid] || 0) + mass;
            });
        }
    });
    
    // Derive solids from component sum
    const solids = Object.values(combinedMineralFlows).reduce((a, b) => a + b, 0);
    
    // Recalculate SG
    let momSg = 0;
    streams.forEach(s => {
         momSg += s.solidsTph * s.sgSolids;
    });
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
        elementalAssays: {} // Will be calculated later if needed, strictly mixing mass for now
    };
};

const calculateNodeModel = (node: NodeData, inputs: StreamData[], outputConns: Connection[], mineralsDb: Mineral[]): StreamData[] => {
    const p = node.parameters || {};

    // Base: Mix everything first (perfect mixing assumption for feed to unit)
    const feed = mixStreams(inputs);
    
    // -- MODEL: PRODUCT --
    if (node.type === 'Product') {
        return [feed];
    }

    // -- MODEL: MIXER / CRUSHER / CONDITIONER --
    if (node.type === 'Mixer' || node.type === 'Conditioner' || node.type === 'Britador') {
        return [feed];
    }

    // -- MODEL: SPLITTER (Mass Split, Isosample) --
    if (node.type === 'Splitter') {
        const ratio = parseFloat(p.splitRatio || 50) / 100;
        
        // Output 1
        const s1Minerals: Record<string, number> = {};
        Object.keys(feed.mineralFlows).forEach(k => s1Minerals[k] = feed.mineralFlows[k] * ratio);
        
        const s1Solids = Object.values(s1Minerals).reduce((a, b) => a + b, 0);
        const s1Water = feed.waterTph * ratio;
        
        const s1 = createStreamFromMass(s1Solids, s1Water, feed.sgSolids, {}, s1Minerals);
        
        // Output 2 (Conservation: Out2 = In - Out1)
        const s2Minerals: Record<string, number> = {};
        Object.keys(feed.mineralFlows).forEach(k => s2Minerals[k] = feed.mineralFlows[k] - s1Minerals[k]);
        
        const s2Solids = Object.values(s2Minerals).reduce((a, b) => a + b, 0);
        const s2Water = feed.waterTph - s1Water;
        
        const s2 = createStreamFromMass(s2Solids, s2Water, feed.sgSolids, {}, s2Minerals);
        
        return [s1, s2];
    }

    // -- MODEL: BALL MILL (Water Addition Only) --
    if (node.type === 'Moinho') {
        const targetDischarge = parseFloat(p.targetDischargeSolids || 70);
        
        let water = feed.waterTph;
        const solids = feed.solidsTph;
        
        // Water Addition Logic (Control Loop)
        const currentPct = (solids + water) > 0 ? (solids / (solids + water)) * 100 : 0;
        
        // Only add water, never remove
        if (currentPct > targetDischarge && solids > 0) {
            const reqWater = (solids * (100 - targetDischarge)) / targetDischarge;
            water = reqWater; 
        }
        
        return [{
            ...feed,
            waterTph: water,
            totalTph: solids + water,
            percentSolids: (solids + water) > 0 ? (solids / (solids + water)) * 100 : 0,
            slurryDensity: 100 / ((targetDischarge/feed.sgSolids) + ((100-targetDischarge)/1)) // Approx update
        }];
    }

    // -- MODEL: HYDROCYCLONE (Component-Based Classification) --
    if (node.type === 'Hydrocyclone') {
        const Rf = parseFloat(p.waterRecoveryToUnderflow || 40) / 100;
        const baseSolidsSplit = 0.75; // Target split to UF
        
        const ufMinerals: Record<string, number> = {};
        const ofMinerals: Record<string, number> = {};
        
        // Density-based Separation Adjustment
        Object.keys(feed.mineralFlows).forEach(k => {
             const mineral = mineralsDb.find(m => m.id === k);
             const sg = mineral ? mineral.density : 2.7;
             const massIn = feed.mineralFlows[k];
             
             // Heavier than 2.7 -> Increase split to UF
             // Lighter than 2.7 -> Decrease split to UF
             let splitToUf = baseSolidsSplit + ((sg - 2.7) * 0.05);
             splitToUf = Math.max(0.05, Math.min(0.95, splitToUf)); 

             const massUf = massIn * splitToUf;
             
             ufMinerals[k] = massUf;
             ofMinerals[k] = massIn - massUf; // Strict Balance
        });

        // Sum up solids from components
        const ufSolids = Object.values(ufMinerals).reduce((a, b) => a + b, 0);
        const ofSolids = Object.values(ofMinerals).reduce((a, b) => a + b, 0);
        
        const ufWater = feed.waterTph * Rf;
        const ofWater = feed.waterTph * (1 - Rf);
        
        // Recalculate SG for streams based on new composition
        const ufStream = createStreamFromMass(ufSolids, ufWater, feed.sgSolids, {}, ufMinerals); 
        const ofStream = createStreamFromMass(ofSolids, ofWater, feed.sgSolids, {}, ofMinerals);
        
        return [ofStream, ufStream]; // [Overflow, Underflow]
    }

    // -- MODEL: FLOTATION (Recovery-Based Enrichment) --
    if (node.type === 'FlotationCell') {
        // User Inputs
        const targetRecovery = parseFloat(p.mineralRecovery || 90) / 100; // Target for Valuable Minerals
        const waterPull = parseFloat(p.waterPull || 15) / 100;
        // Mass Pull is treated as a loose constraint or result in this logic to ensure component balance closes.
        // We use an entrainment factor for Gangue to simulate realistic separation.
        const gangueEntrainment = 0.10; // 10% of gangue follows water/conc by default
        
        const concMinerals: Record<string, number> = {};
        const tailMinerals: Record<string, number> = {};
        
        Object.keys(feed.mineralFlows).forEach(mid => {
            const mineral = mineralsDb.find(m => m.id === mid);
            const massIn = feed.mineralFlows[mid];
            const isTarget = mineral && (mineral.class === 'Sulfide' || mineral.class === 'Native Element' || mineral.selected); // Simplified selection logic
            
            let splitToConc = 0;
            if (isTarget) {
                splitToConc = targetRecovery;
            } else {
                splitToConc = gangueEntrainment;
            }
            
            const massConc = massIn * splitToConc;
            concMinerals[mid] = massConc;
            tailMinerals[mid] = massIn - massConc; // Strict Conservation
        });

        const concSolids = Object.values(concMinerals).reduce((a, b) => a + b, 0);
        const tailSolids = Object.values(tailMinerals).reduce((a, b) => a + b, 0);
        
        const concWater = feed.waterTph * waterPull;
        const tailWater = feed.waterTph - concWater;

        const conc = createStreamFromMass(concSolids, concWater, feed.sgSolids, {}, concMinerals);
        const tail = createStreamFromMass(tailSolids, tailWater, feed.sgSolids, {}, tailMinerals);
        
        return [conc, tail];
    }

    // Default fallback
    return [feed];
};

const createStreamFromMass = (solids: number, water: number, defaultSg: number, assays: any, minerals: Record<string, number> = {}): StreamData => {
    const total = solids + water;
    const pct = total > 0 ? (solids/total)*100 : 0;
    
    // Recalculate SG based on component mix if possible
    let weightedVolume = 0;
    // Need density of each mineral. Since we don't pass mineralsDb easily here without prop drilling, 
    // we use a simplified assumption or rely on the passed SG if minerals are empty.
    // Ideally, calculateNodeModel computes the new SG and passes it here.
    // For now, we use defaultSg to maintain stability, as SG changes in float/cyclone are minor relative to flow errors.
    
    const den = 100 / ((pct/defaultSg) + ((100-pct)/1));
    
    return {
        totalTph: total, solidsTph: solids, waterTph: water, percentSolids: pct, slurryDensity: den, sgSolids: defaultSg,
        mineralFlows: minerals, elementalAssays: assays
    };
};
