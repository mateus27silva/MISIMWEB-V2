

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
      const outputStreamsData = calculateNodeModel(node, inputStreams, connections.filter(c => c.fromNode === node.id));

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
    let solids = 0, water = 0, momSg = 0;
    let momCu = 0, momFe = 0, momAu = 0, momS = 0;
    let combinedMineralFlows: Record<string, number> = {};

    streams.forEach(s => {
        solids += s.solidsTph;
        water += s.waterTph;
        momSg += s.solidsTph * s.sgSolids;
        momCu += s.solidsTph * (s.elementalAssays.Cu || 0);
        momFe += s.solidsTph * (s.elementalAssays.Fe || 0);
        momAu += s.solidsTph * (s.elementalAssays.Au || 0);
        momS += s.solidsTph * (s.elementalAssays.S || 0);
        
        // Combine minerals
        if (s.mineralFlows) {
            Object.entries(s.mineralFlows).forEach(([mid, mass]) => {
                combinedMineralFlows[mid] = (combinedMineralFlows[mid] || 0) + mass;
            });
        }
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
        elementalAssays: {
            Cu: solids > 0 ? momCu / solids : 0,
            Fe: solids > 0 ? momFe / solids : 0,
            Au: solids > 0 ? momAu / solids : 0,
            S: solids > 0 ? momS / solids : 0,
        }
    };
};

const calculateNodeModel = (node: NodeData, inputs: StreamData[], outputConns: Connection[]): StreamData[] => {
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
        const s1 = { ...feed };
        s1.solidsTph *= ratio;
        s1.waterTph *= ratio;
        s1.totalTph *= ratio;
        // Deep copy mineral flows for split
        s1.mineralFlows = {};
        Object.keys(feed.mineralFlows).forEach(k => s1.mineralFlows[k] = feed.mineralFlows[k] * ratio);
        
        // Output 2
        const s2 = { ...feed };
        s2.solidsTph *= (1-ratio);
        s2.waterTph *= (1-ratio);
        s2.totalTph *= (1-ratio);
        s2.mineralFlows = {};
        Object.keys(feed.mineralFlows).forEach(k => s2.mineralFlows[k] = feed.mineralFlows[k] * (1-ratio));
        
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
        
        const total = solids + water;
        const pct = total > 0 ? (solids / total) * 100 : 0;
        
        return [{
            ...feed, totalTph: total, solidsTph: solids, waterTph: water, percentSolids: pct,
            slurryDensity: 100 / ((pct/feed.sgSolids) + ((100-pct)/1))
        }];
    }

    // -- MODEL: HYDROCYCLONE (Classification) --
    if (node.type === 'Hydrocyclone') {
        // Model: Mass Split based on Water Recovery to UF (Rf)
        // This is a simplified Plitt's model proxy for mass balance
        const Rf = parseFloat(p.waterRecoveryToUnderflow || 40) / 100;
        
        // Coarse solids split (simplified)
        const solidSplitToUf = 0.75; // 75% mass to Underflow (Coarse)

        const ufSolids = feed.solidsTph * solidSplitToUf;
        const ufWater = feed.waterTph * Rf;
        const ofSolids = feed.solidsTph * (1 - solidSplitToUf);
        const ofWater = feed.waterTph * (1 - Rf);
        
        // Distribute minerals (assuming no segregation for simple mass balance, 
        // normally specific gravity affects classification)
        const ufMinerals: Record<string, number> = {};
        const ofMinerals: Record<string, number> = {};
        
        Object.keys(feed.mineralFlows).forEach(k => {
             ufMinerals[k] = feed.mineralFlows[k] * solidSplitToUf;
             ofMinerals[k] = feed.mineralFlows[k] * (1 - solidSplitToUf);
        });
        
        const ufStream = createStreamFromMass(ufSolids, ufWater, feed.sgSolids, feed.elementalAssays, ufMinerals);
        const ofStream = createStreamFromMass(ofSolids, ofWater, feed.sgSolids, feed.elementalAssays, ofMinerals);
        
        return [ofStream, ufStream]; // [Overflow, Underflow]
    }

    // -- MODEL: FLOTATION (Enrichment) --
    if (node.type === 'FlotationCell') {
        const massPull = parseFloat(p.massPull || 10) / 100;
        
        // 1. Calculate Solids Split
        const concSolids = feed.solidsTph * massPull;
        const tailSolids = feed.solidsTph - concSolids;
        
        // 2. Calculate Water Split (Concentrate is usually frothy/wetter)
        const waterPull = parseFloat(p.waterPull || 15) / 100;
        const concWater = feed.waterTph * waterPull;
        const tailWater = feed.waterTph - concWater;

        // 3. Component Split (Grade Balance)
        // Simplified: Assume global mass pull for now, 
        // OR if we had recovery by Mineral Class, we would iterate minerals.
        // Let's iterate minerals and apply simple recoveries based on class
        
        const concMinerals: Record<string, number> = {};
        const tailMinerals: Record<string, number> = {};
        
        Object.keys(feed.mineralFlows).forEach(mid => {
             // Logic: If mineral is Sulfide or Gold, High recovery. Else Low.
             // We don't have the mineral class here easily without looking up in DB.
             // For Mass Balance simplicity in this version, split minerals same as global Mass Pull
             // unless user specified recovery map (advanced).
             
             // Fallback: Isosample split (Warning: this implies no enrichment!)
             // TODO: Access Mineral DB inside node model to check class (Sulfide vs Silicate)
             // For now, assuming perfect split proportional to mass pull (Not realistic for Flotation but keeps mass balance closed)
             
             concMinerals[mid] = feed.mineralFlows[mid] * massPull;
             tailMinerals[mid] = feed.mineralFlows[mid] * (1 - massPull);
        });

        const conc = createStreamFromMass(concSolids, concWater, feed.sgSolids, feed.elementalAssays, concMinerals);
        const tail = createStreamFromMass(tailSolids, tailWater, feed.sgSolids, feed.elementalAssays, tailMinerals);
        
        return [conc, tail];
    }

    // Default fallback
    return [feed];
};

const createStreamFromMass = (solids: number, water: number, sg: number, assays: any, minerals: Record<string, number> = {}): StreamData => {
    const total = solids + water;
    const pct = total > 0 ? (solids/total)*100 : 0;
    const den = 100 / ((pct/sg) + ((100-pct)/1));
    return {
        totalTph: total, solidsTph: solids, waterTph: water, percentSolids: pct, slurryDensity: den, sgSolids: sg,
        mineralFlows: minerals, elementalAssays: assays
    };
};