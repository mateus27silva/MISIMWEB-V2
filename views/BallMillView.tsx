import React, { useState, useEffect } from 'react';
import { BallMillInputs } from '../types';
import { calculateBondPower } from '../services/miningMath';
import { AIAnalysis } from '../components/AIAnalysis';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calculator, Settings, Zap } from 'lucide-react';

export const BallMillView: React.FC = () => {
  const [inputs, setInputs] = useState<BallMillInputs>({
    workIndex: 12.5,
    throughput: 250,
    feedSizeF80: 12000,
    productSizeP80: 105,
    millDiameter: 4.5,
    millLength: 6.0,
    fillingDegree: 35,
    dischargeSolidsTarget: 70
  });

  const [results, setResults] = useState<{ specificEnergy: number; totalPower: number }>({ specificEnergy: 0, totalPower: 0 });

  useEffect(() => {
    setResults(calculateBondPower(inputs));
  }, [inputs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const chartData = [
    { name: 'Required Power', value: results.totalPower, unit: 'kW' },
    { name: 'Motor Size (Rec)', value: results.totalPower * 1.2, unit: 'kW' } // 20% safety factor
  ];

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <Settings className="w-8 h-8 mr-3 text-blue-600" />
          Ball Mill Sizing
        </h1>
        <p className="text-slate-500 mt-2">Calculate power requirements based on Bond's Work Index theory.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Section */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
            <Calculator className="w-5 h-5 mr-2 text-slate-500" />
            Parameters
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bond Work Index (kWh/t)</label>
              <input
                type="number"
                name="workIndex"
                value={inputs.workIndex}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Throughput (t/h)</label>
              <input
                type="number"
                name="throughput"
                value={inputs.throughput}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Feed Size F80 (µm)</label>
              <input
                type="number"
                name="feedSizeF80"
                value={inputs.feedSizeF80}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product Size P80 (µm)</label>
              <input
                type="number"
                name="productSizeP80"
                value={inputs.productSizeP80}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-100 font-medium">Total Power Required</span>
                <Zap className="w-5 h-5 text-yellow-300" />
              </div>
              <div className="text-4xl font-bold mb-1">
                {results.totalPower.toLocaleString(undefined, { maximumFractionDigits: 0 })} <span className="text-xl font-normal text-blue-200">kW</span>
              </div>
              <div className="text-sm text-blue-200">At pinion shaft</div>
            </div>
            
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 font-medium">Specific Energy</span>
                <Activity className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-4xl font-bold mb-1 text-slate-800">
                {results.specificEnergy.toFixed(2)} <span className="text-xl font-normal text-slate-400">kWh/t</span>
              </div>
              <div className="text-sm text-slate-400">Bond Method</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-80">
             <h3 className="text-md font-semibold text-slate-800 mb-4">Power Requirement Analysis</h3>
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                 <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                 <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={60}>
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === 0 ? '#2563eb' : '#94a3b8'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
          </div>

          <AIAnalysis 
            context="Ball Mill Sizing (Bond Method)"
            data={{ inputs, results }}
          />
        </div>
      </div>
    </div>
  );
};

// Helper component for icons that wasn't imported at top to keep file small, 
// assuming Activity is used from lucide-react generally.
import { Activity } from 'lucide-react';