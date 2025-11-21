import React, { useState, useEffect } from 'react';
import { HydrocycloneInputs } from '../types';
import { calculateCyclonePerformance } from '../services/miningMath';
import { AIAnalysis } from '../components/AIAnalysis';
import { Activity, Filter, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export const HydrocycloneView: React.FC = () => {
  const [inputs, setInputs] = useState<HydrocycloneInputs>({
    pressure: 100,
    feedDensity: 55,
    d50Req: 150,
    numberOfCyclones: 4
  });

  const [results, setResults] = useState<{ cutPoint: number; waterRecovery: number }>({ cutPoint: 0, waterRecovery: 0 });
  const [efficiencyCurve, setEfficiencyCurve] = useState<any[]>([]);

  useEffect(() => {
    const calc = calculateCyclonePerformance(inputs);
    setResults(calc);

    // Generate simplified efficiency curve (Tromp curve)
    // E = 1 - exp(-0.693 * (d / d50)^m)
    const m = 2.5; // Sharpness of separation
    const data = [];
    for (let d = 0; d <= calc.cutPoint * 3; d += calc.cutPoint / 10) {
        const efficiency = 100 * (1 - Math.exp(-0.693 * Math.pow(d / (calc.cutPoint || 1), m)));
        data.push({
            size: Math.round(d),
            efficiency: parseFloat(efficiency.toFixed(1))
        });
    }
    setEfficiencyCurve(data);
  }, [inputs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <Filter className="w-8 h-8 mr-3 text-indigo-600" />
          Hydrocyclone Cluster
        </h1>
        <p className="text-slate-500 mt-2">Simulate classification efficiency and water split using Plitt's Model.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inputs */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Operating Conditions</h2>
            <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Operating Pressure (kPa)</label>
                <input
                type="number"
                name="pressure"
                value={inputs.pressure}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed Solids (% w/w)</label>
                <input
                type="number"
                name="feedDensity"
                value={inputs.feedDensity}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Number of Cyclones</label>
                <input
                type="number"
                name="numberOfCyclones"
                value={inputs.numberOfCyclones}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                />
            </div>
            </div>
            
            <div className="mt-6 bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">
                    High feed density ({'>'}60%) may induce roping conditions, reducing separation efficiency drastically.
                </p>
            </div>
        </div>

        {/* Main Display */}
        <div className="lg:col-span-2 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Cut Point (d50c)</div>
                    <div className="text-3xl font-bold text-slate-900">{results.cutPoint} <span className="text-lg text-slate-400">µm</span></div>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wider mb-1">Water to UF (Rf)</div>
                    <div className="text-3xl font-bold text-slate-900">{results.waterRecovery} <span className="text-lg text-slate-400">%</span></div>
                 </div>
            </div>

            {/* Efficiency Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Tromp Partition Curve</h3>
                <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={efficiencyCurve} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="size" 
                                type="number" 
                                label={{ value: 'Particle Size (microns)', position: 'insideBottom', offset: -5, fill: '#64748b' }} 
                                tick={{ fill: '#64748b' }}
                            />
                            <YAxis 
                                label={{ value: 'Efficiency to UF (%)', angle: -90, position: 'insideLeft', fill: '#64748b' }} 
                                tick={{ fill: '#64748b' }}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <ReferenceLine x={results.cutPoint} stroke="red" strokeDasharray="3 3" label="d50c" />
                            <Line 
                                type="monotone" 
                                dataKey="efficiency" 
                                stroke="#4f46e5" 
                                strokeWidth={3} 
                                dot={false} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <AIAnalysis context="Hydrocyclone Separation" data={{ inputs, results }} />
        </div>
      </div>
    </div>
  );
};
