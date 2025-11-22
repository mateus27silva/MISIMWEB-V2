
import { NodeData, Connection, StreamData } from '../types';
import { calculateStreamProperties } from './miningMath';

// --- Constants ---
const MAX_ITERATIONS = 200;
const TOLERANCE = 1e-6; // Precision threshold for convergence

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
}

// --- Helper: Initialize empty stream ---
const createEmptyStream = (): StreamData => ({
  totalTph: 0, solidsTph: 0, waterTph: 0, percentSolids: 0, slurryDensity: 1, sgSolids: 2.7, 
  mineralFlows: {}, 
  elementalAssays: { Cu: 0, Fe: 0, Au: 0, S: 0 }
});

// --- Topological Validation ---
const validateFlowsheet = (nodes: NodeData[], connections: Connection[]): string[] => {
    const errors: string[] = [];
    
    const feeds = nodes.filter(n => n.type === 'Feed');
    if (feeds.length === 0) errors.push("O fluxograma deve ter pelo menos uma alimentação ('Feed').");

    connections.forEach(conn => {
        if (!conn.fromNode || !conn.toNode) {
            errors.push(`A conexão (Stream) não está conectada a dois equipamentos.`);
        }
    });

    nodes.forEach(node => {
        const hasInput = connections.some(c => c.toNode === node.id);
        const hasOutput = connections.some(c => c.fromNode === node.id);
        
        if (node.type !== 'Feed' && !hasInput) {
            errors.push(`O equipamento '${node.label}' não tem entrada de material.`);
        }
        if (node.type !== 'Product' && !hasOutput) {
            errors.push(`O equipamento '${node.label}' não tem saída.`);
        }
    });

    return errors;
};

// --- Solver Engine ---
export const solveFlowsheet = (nodes: NodeData[], connections: Connection[]): SimulationResult => {
  // 1. Validate
  const topologyErrors = validateFlowsheet(nodes, connections);
  if (topologyErrors.length > 0) {
      return {
          converged: false, iterations: 0, error: 100, streams: {},
          globalBalance: { inputs: 0, outputs: 0, error: 100 },
          diagnostics: topologyErrors
      };
  }

  // 2. Init State
  let streamState: Record<string, StreamData> = {};
  connections.forEach(conn => {
      // Initialize with connection parameters if available (User Input for Streams)
      // This allows "Feed" streams to carry initial values if defined by user on the line
      const userParams = conn.parameters || {};
      let initialStream = createEmptyStream();
      
      if (userParams.volumetricFlow && userParams.percentSolids) {
          const vol = parseFloat(userParams.volumetricFlow);
          const solidsPct = parseFloat(userParams.percentSolids);
          // Approximate initialization
          if (vol > 0 && solidsPct > 0) {
              // Simplified mass calc from volume for init
              // Assuming SG=2.7 initially
              const sg = 2.7;
              const waterSg = 1.0;
              const solidsVolFraction = 1 / (1 + ((100-solidsPct)/solidsPct) * sg);
              const solidsTph = vol * solidsVolFraction * sg;
              const waterTph = vol * (1 - solidsVolFraction) * waterSg;
              
              initialStream = {
                  ...initialStream,
                  solidsTph, waterTph, totalTph: solidsTph + waterTph,
                  percentSolids: solidsPct,
                  elementalAssays: {
                      Cu: parseFloat(userParams.assay_Cu || 0),
                      Fe: parseFloat(userParams.assay_Fe || 0),
                      Au: parseFloat(userParams.assay_Au || 0),
                      S: parseFloat(userParams.assay_S || 0),
                  }
              };
          }
      }
      streamState[conn.id] = initialStream;
  });

  let diagnostics: string[] = [];
  let maxError = 0;
  let iter = 0;

  // 3. Iteration Loop
  for (iter = 0; iter < MAX_ITERATIONS; iter++) {
    maxError = 0;

    // Sort Nodes: Feed -> Others (Approximate topological sort helps convergence)
    const sortedNodes = [...nodes].sort((a, b) => (a.type === 'Feed' ? -1 : 1));

    for (const node of sortedNodes) {
      // Gather Inputs
      const inputConns = connections.filter(c => c.toNode === node.id);
      const inputStreams = inputConns.map(c => streamState[c.id]);
      
      // Calculate Output Streams
      const outputStreamsData = calculateNodeModel(node, inputStreams, connections.filter(c => c.fromNode === node.id), diagnostics);

      // Distribute to Output Connections
      const outputConns = connections.filter(c => c.fromNode === node.id);
      
      outputConns.forEach((conn, idx) => {
        // Find corresponding output stream from model
        let calculatedStream = outputStreamsData[idx] || createEmptyStream();

        // If node is Feed, and Connection has User Overrides, use them?
        // For now, standard simulation uses Node Parameters for Feed.
        // But we sync if possible.

        // Convergence Check
        const prevSolids = streamState[conn.id].solidsTph;
        const currSolids = calculatedStream.solidsTph;
        if (Math.abs(currSolids - prevSolids) > maxError) {
            maxError = Math.abs(currSolids - prevSolids);
        }

        streamState[conn.id] = calculatedStream;
      });
    }

    if (maxError < TOLERANCE) break;
  }

  // 4. Global Balance
  let inputsTotal = 0;
  let outputsTotal = 0;

  nodes.filter(n => n.type === 'Feed').forEach(n => {
      // Inputs to system are the outputs of Feed nodes
      connections.filter(c => c.fromNode === n.id).forEach(c => inputsTotal += streamState[c.id].totalTph);
  });
  
  nodes.filter(n => n.type === 'Product').forEach(n => {
       // Outputs of system are inputs to Product nodes
       connections.filter(c => c.toNode === n.id).forEach(c => outputsTotal += streamState[c.id].totalTph);
  });

  const closureError = Math.abs(inputsTotal - outputsTotal);
  const errorPct = inputsTotal > 0 ? (closureError / inputsTotal) * 100 : 0;

  return {
    converged: maxError < TOLERANCE,
    iterations: iter,
    error: errorPct < 1e-4 ? 0 : errorPct, // Snap to zero if tiny
    streams: streamState,
    globalBalance: { inputs: inputsTotal, outputs: outputsTotal, error: errorPct < 1e-4 ? 0 : errorPct },
    diagnostics: [...new Set(diagnostics)]
  };
};

// --- Node Models ---

const mixStreams = (streams: StreamData[]): StreamData => {
    let solids = 0, water = 0, momSg = 0;
    let momCu = 0, momFe = 0, momAu = 0, momS = 0;

    streams.forEach(s => {
        solids += s.solidsTph;
        water += s.waterTph;
        momSg += s.solidsTph * s.sgSolids;
        momCu += s.solidsTph * (s.elementalAssays.Cu || 0);
        momFe += s.solidsTph * (s.elementalAssays.Fe || 0);
        momAu += s.solidsTph * (s.elementalAssays.Au || 0);
        momS += s.solidsTph * (s.elementalAssays.S || 0);
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
        mineralFlows: {},
        elementalAssays: {
            Cu: solids > 0 ? momCu / solids : 0,
            Fe: solids > 0 ? momFe / solids : 0,
            Au: solids > 0 ? momAu / solids : 0,
            S: solids > 0 ? momS / solids : 0,
        }
    };
};

const calculateNodeModel = (node: NodeData, inputs: StreamData[], outputConns: Connection[], diagnostics: string[]): StreamData[] => {
    const p = node.parameters || {};

    // 1. FEED
    if (node.type === 'Feed') {
        // Check if the output connection has user overrides (The "Stream Screen" inputs)
        const outputConn = outputConns[0];
        if (outputConn && outputConn.parameters && outputConn.parameters.volumetricFlow) {
            // User defined the stream directly
            const vol = parseFloat(outputConn.parameters.volumetricFlow) || 0;
            const pct = parseFloat(outputConn.parameters.percentSolids) || 60;
            const sg = 2.7; // Default SG
            
            // Convert Volumetric (m3/h) to Mass (t/h)
            // Slurry SG = 100 / (Cw/SGs + (100-Cw)/SGw)
            const slurryDensity = 100 / ((pct/sg) + ((100-pct)/1));
            const totalTph = vol * slurryDensity;
            const solidsTph = totalTph * (pct/100);
            const waterTph = totalTph - solidsTph;

            return [{
                totalTph, solidsTph, waterTph, percentSolids: pct, slurryDensity, sgSolids: sg, mineralFlows: {},
                elementalAssays: {
                    Cu: parseFloat(outputConn.parameters.assay_Cu || 0),
                    Fe: parseFloat(outputConn.parameters.assay_Fe || 0),
                    Au: parseFloat(outputConn.parameters.assay_Au || 0),
                    S: parseFloat(outputConn.parameters.assay_S || 0),
                }
            }];
        } 
        
        // Fallback to Node Parameters
        const solids = parseFloat(p.solidsTph || 100);
        const pct = parseFloat(p.percentSolids || 60);
        const props = calculateStreamProperties(solids, pct, 2.7);
        return [{
            ...createEmptyStream(), ...props as StreamData,
            elementalAssays: { Cu: parseFloat(p.assay_Cu || 0), Fe: parseFloat(p.assay_Fe || 0), Au: parseFloat(p.assay_Au || 0), S: parseFloat(p.assay_S || 0) }
        }];
    }

    // 2. PRODUCT
    if (node.type === 'Product') {
        return inputs; // Just pass through
    }

    // 3. MIXER / GENERAL
    if (node.type === 'Mixer' || node.type === 'Conditioner' || node.type === 'Britador') {
        // Mass Conservation (Sum inputs)
        return [mixStreams(inputs)];
    }

    // 4. SPLITTER
    if (node.type === 'Splitter') {
        const mixed = mixStreams(inputs);
        const ratio = parseFloat(p.splitRatio || 50) / 100;
        
        const s1 = { ...mixed, solidsTph: mixed.solidsTph * ratio, waterTph: mixed.waterTph * ratio, totalTph: mixed.totalTph * ratio };
        const s2 = { ...mixed, solidsTph: mixed.solidsTph * (1-ratio), waterTph: mixed.waterTph * (1-ratio), totalTph: mixed.totalTph * (1-ratio) };
        return [s1, s2];
    }

    // 5. MOINHO (Ball Mill)
    if (node.type === 'Moinho') {
        const mixed = mixStreams(inputs);
        const targetDischarge = parseFloat(p.targetDischargeSolids || 70);
        
        let water = mixed.waterTph;
        let solids = mixed.solidsTph;
        
        // Water Addition Logic
        const currentPct = (solids + water) > 0 ? (solids / (solids + water)) * 100 : 0;
        if (currentPct > targetDischarge && solids > 0) {
            const reqWater = (solids * (100 - targetDischarge)) / targetDischarge;
            water = reqWater; // Set water to required level (Simulates addition)
        }
        
        const total = solids + water;
        const pct = total > 0 ? (solids / total) * 100 : 0;
        
        return [{
            ...mixed, totalTph: total, solidsTph: solids, waterTph: water, percentSolids: pct,
            slurryDensity: 100 / ((pct/mixed.sgSolids) + ((100-pct)/1))
        }];
    }

    // 6. HYDROCYCLONE
    if (node.type === 'Hydrocyclone') {
        const feed = mixStreams(inputs);
        
        // Model: Mass Split based on Water Recovery to UF
        const Rf = parseFloat(p.waterRecoveryToUnderflow || 40) / 100;
        // Simple solid split assumption (coarse goes to UF)
        const solidSplit = 0.75; // 75% solids to UF

        const ufSolids = feed.solidsTph * solidSplit;
        const ufWater = feed.waterTph * Rf;
        const ofSolids = feed.solidsTph * (1 - solidSplit);
        const ofWater = feed.waterTph * (1 - Rf);
        
        // Calculate properties for outputs
        const ufStream = { ...feed, solidsTph: ufSolids, waterTph: ufWater, totalTph: ufSolids + ufWater };
        ufStream.percentSolids = ufStream.totalTph > 0 ? (ufSolids/ufStream.totalTph)*100 : 0;
        ufStream.slurryDensity = 100 / ((ufStream.percentSolids/feed.sgSolids) + ((100-ufStream.percentSolids)/1));
        
        const ofStream = { ...feed, solidsTph: ofSolids, waterTph: ofWater, totalTph: ofSolids + ofWater };
        ofStream.percentSolids = ofStream.totalTph > 0 ? (ofSolids/ofStream.totalTph)*100 : 0;
        ofStream.slurryDensity = 100 / ((ofStream.percentSolids/feed.sgSolids) + ((100-ofStream.percentSolids)/1));
        
        return [ofStream, ufStream]; // Order matches config: [Overflow, Underflow]
    }

    // 7. FLOTATION
    if (node.type === 'FlotationCell') {
        const feed = mixStreams(inputs);
        const massPull = parseFloat(p.massPull || 10) / 100;
        const rec = parseFloat(p.mineralRecovery || 90) / 100;
        
        // Conc
        const concSolids = feed.solidsTph * massPull;
        const concWater = feed.waterTph * 0.2; // Typical water pull
        
        // Tails
        const tailSolids = feed.solidsTph - concSolids;
        const tailWater = feed.waterTph - concWater;

        // Component Split (Enrichment)
        const concAssays = { ...feed.elementalAssays };
        const tailAssays = { ...feed.elementalAssays };
        
        ['Cu', 'Au', 'S'].forEach(el => {
            const massIn = feed.solidsTph * (feed.elementalAssays[el] || 0);
            const massConc = massIn * rec;
            const massTail = massIn - massConc;
            concAssays[el] = concSolids > 0 ? massConc / concSolids : 0;
            tailAssays[el] = tailSolids > 0 ? massTail / tailSolids : 0;
        });
        
        // Fe (Depressed)
        const feMass = feed.solidsTph * (feed.elementalAssays.Fe || 0);
        const feConc = feMass * 0.15; // Low recovery
        const feTail = feMass - feConc;
        concAssays.Fe = concSolids > 0 ? feConc / concSolids : 0;
        tailAssays.Fe = tailSolids > 0 ? feTail / tailSolids : 0;

        const conc = { ...feed, solidsTph: concSolids, waterTph: concWater, totalTph: concSolids+concWater, elementalAssays: concAssays };
        conc.percentSolids = conc.totalTph > 0 ? (concSolids/conc.totalTph)*100 : 0;

        const tail = { ...feed, solidsTph: tailSolids, waterTph: tailWater, totalTph: tailSolids+tailWater, elementalAssays: tailAssays };
        tail.percentSolids = tail.totalTph > 0 ? (tailSolids/tail.totalTph)*100 : 0;
        
        return [conc, tail];
    }

    return [mixStreams(inputs)];
};
