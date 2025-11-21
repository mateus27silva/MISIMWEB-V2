import React, { useState, useEffect } from 'react';
import { CircuitInputs, solveClosedCircuit, CircuitResult } from '../services/circuitSolver';
import { AIAnalysis } from '../components/AIAnalysis';
import { Workflow, PlayCircle, Download, BarChart2 } from 'lucide-react';
import { StreamData } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const MineSimView: React.FC = () => {
  const [inputs, setInputs] = useState<CircuitInputs>({
    freshFeedTph: 250,
    freshFeedSolids: 60,
    workIndex: 14.5,
    targetP80: 105,
    circulatingLoadTarget: 350,
    sgSolids: 2.8
  });

  const [result, setResult] = useState<CircuitResult | null>(null);

  const runSimulation = () => {
    const res = solveClosedCircuit(inputs);
    setResult(res);
  };

  // Run once on mount
  useEffect(() => {
    runSimulation();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const StreamTable = ({ label, data }: { label: string, data: StreamData }) => (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
        <h4 className="font-bold text-slate-800 mb-2">{label}</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">Solids:</span>
            <span className="font-mono text-slate-700">{data.tph.toFixed(1)} t/h</span>
            <span className="text-slate-500">Water:</span>
            <span className="font-mono text-slate-700">{data.waterTph.toFixed(1)} m³/h</span>
            <span className="text-slate-500">% Solids:</span>
            <span className="font-mono text-slate-700">{data.percentSolids.toFixed(1)}%</span>
            <span className="text-slate-500">Density:</span>
            <span className="font-mono text-slate-700">{data.slurryDensity.toFixed(2)} t/m³</span>
        </div>
    </div>
  );

  // Prepare Chart Data
  const chartData = result ? [
    { name: 'Fresh Feed', solids: result.streams.freshFeed.tph, water: result.streams.freshFeed.waterTph },
    { name: 'Mill Feed', solids: result.streams.millFeed.tph, water: result.streams.millFeed.waterTph },
    { name: 'Recycle (UF)', solids: result.streams.cycloneUnderflow.tph, water: result.streams.cycloneUnderflow.waterTph },
    { name: 'Product (OF)', solids: result.streams.cycloneOverflow.tph, water: result.streams.cycloneOverflow.waterTph },
  ] : [];

  return (
    <div className="space-y-6">
      <header className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg">
                <Workflow className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
                Circuit Simulator (Rv02)
            </h1>
        </div>
        <p className="text-slate-500">
            Integrated closed-circuit simulation from MINESIMRV02. Models the interaction between Ball Mill and Hydrocyclone Classifier.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Configuration Panel (Left) */}
        <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                    <BarChart2 className="w-5 h-5 mr-2 text-slate-500" />
                    Input Parameters
                </h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fresh Feed Rate (t/h)</label>
                        <input type="number" name="freshFeedTph" value={inputs.freshFeedTph} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Feed % Solids</label>
                        <input type="number" name="freshFeedSolids" value={inputs.freshFeedSolids} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bond Work Index (kWh/t)</label>
                        <input type="number" name="workIndex" value={inputs.workIndex} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target P80 (microns)</label>
                        <input type="number" name="targetP80" value={inputs.targetP80} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Circulating Load (%)</label>
                        <input type="number" name="circulatingLoadTarget" value={inputs.circulatingLoadTarget} onChange={handleChange} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-purple-500 outline-none" />
                    </div>
                    
                    <button 
                        onClick={runSimulation}
                        className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center transition-all"
                    >
                        <PlayCircle className="w-5 h-5 mr-2" />
                        Run Simulation
                    </button>
                </div>
            </div>

            {/* Key KPIs */}
            {result && (
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-bold">Mill Power</div>
                        <div className="text-2xl font-bold text-purple-700">{result.millPowerKw.toFixed(0)} kW</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs text-slate-500 uppercase font-bold">Total Mill Feed</div>
                        <div className="text-2xl font-bold text-purple-700">{result.totalSystemTph.toFixed(0)} t/h</div>
                    </div>
                </div>
            )}
        </div>

        {/* Visualization Panel (Right) */}
        <div className="xl:col-span-8 space-y-6">
            {result ? (
                <>
                    {/* Graphical Flow */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-6">Circuit Mass Balance</h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                    <YAxis axisLine={false} tickLine={false} label={{ value: 'Mass Flow (t/h)', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                    <Legend />
                                    <Bar dataKey="solids" stackId="a" fill="#7c3aed" name="Solids (t/h)" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="water" stackId="a" fill="#3b82f6" name="Water (t/h)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed Streams */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-slate-800">Detailed Stream Data</h3>
                            <button className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center">
                                <Download className="w-4 h-4 mr-1" /> Export CSV
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StreamTable label="1. Fresh Feed" data={result.streams.freshFeed} />
                            <StreamTable label="2. Mill Feed (Total)" data={result.streams.millFeed} />
                            <StreamTable label="3. Cyclone Feed" data={result.streams.cycloneFeed} />
                            <StreamTable label="4. Product (Overflow)" data={result.streams.cycloneOverflow} />
                            <StreamTable label="5. Recycle (Underflow)" data={result.streams.cycloneUnderflow} />
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <AIAnalysis 
                        context="Closed Circuit Grinding Simulation (Rv02)" 
                        data={{ inputs, results: result }} 
                    />
                </>
            ) : (
                <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                    Press "Run Simulation" to calculate mass balance.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};