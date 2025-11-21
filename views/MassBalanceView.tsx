import React, { useState } from 'react';
import { calculateStreamProperties } from '../services/miningMath';
import { RefreshCcw, ArrowRight } from 'lucide-react';
import { StreamData } from '../types';

export const MassBalanceView: React.FC = () => {
  const [feedTph, setFeedTph] = useState(500);
  const [feedSolids, setFeedSolids] = useState(65);
  const [sg, setSg] = useState(2.7);
  
  // Simple separation logic for demo
  const [recovery, setRecovery] = useState(95); // % Recovery to product

  const feedStream: StreamData = calculateStreamProperties(feedTph, feedSolids, sg);
  
  const concTph = feedTph * (recovery / 100);
  const concSolids = 60; // Assumed for demo
  const concStream: StreamData = calculateStreamProperties(concTph, concSolids, sg);
  
  const tailsTph = feedTph - concTph;
  // Water balance: Feed water = Conc water + Tails water
  // Tails water = Feed water - Conc water
  const tailsWaterTph = feedStream.waterTph - concStream.waterTph;
  const tailsTotalTph = tailsTph + tailsWaterTph;
  const tailsSolids = tailsTotalTph > 0 ? (tailsTph / tailsTotalTph) * 100 : 0;
  const tailsStream: StreamData = {
      tph: tailsTph,
      waterTph: tailsWaterTph,
      percentSolids: tailsSolids,
      slurryDensity: 100 / ((tailsSolids / sg) + ((100 - tailsSolids) / 1)),
      sgSolids: sg
  };

  const StreamCard = ({ title, data, color }: { title: string, data: StreamData, color: string }) => (
    <div className={`bg-white rounded-xl p-6 border-l-4 shadow-sm ${color}`}>
      <h3 className="text-lg font-bold text-slate-800 mb-4">{title}</h3>
      <div className="space-y-3">
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">Solids Flow</span>
          <span className="font-semibold">{data.tph.toFixed(1)} t/h</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">Water Flow</span>
          <span className="font-semibold">{data.waterTph.toFixed(1)} m³/h</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">Total Mass</span>
          <span className="font-semibold">{(data.tph + data.waterTph).toFixed(1)} t/h</span>
        </div>
        <div className="flex justify-between border-b border-slate-100 pb-2">
          <span className="text-slate-500">% Solids</span>
          <span className="font-semibold">{data.percentSolids.toFixed(1)} %</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Slurry SG</span>
          <span className="font-semibold">{data.slurryDensity.toFixed(2)} t/m³</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center">
          <RefreshCcw className="w-8 h-8 mr-3 text-green-600" />
          Mass Balance Simulator
        </h1>
        <p className="text-slate-500 mt-2">Simple 2-Product Separator Balance (Concentrate/Tailings)</p>
      </header>

      {/* Controls */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed Rate (t/h)</label>
                <input type="number" value={feedTph} onChange={(e) => setFeedTph(Number(e.target.value))} className="w-full border border-slate-300 rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Feed % Solids</label>
                <input type="number" value={feedSolids} onChange={(e) => setFeedSolids(Number(e.target.value))} className="w-full border border-slate-300 rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Solid SG</label>
                <input type="number" value={sg} onChange={(e) => setSg(Number(e.target.value))} className="w-full border border-slate-300 rounded p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recovery to Conc (%)</label>
                <input type="number" value={recovery} onChange={(e) => setRecovery(Number(e.target.value))} className="w-full border border-slate-300 rounded p-2" />
            </div>
        </div>
      </div>

      {/* Flowsheet Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
         <StreamCard title="Feed" data={feedStream} color="border-l-blue-500" />
         
         <div className="hidden lg:flex justify-center">
            <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 bg-slate-800 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                    SEPARATOR
                </div>
                <div className="flex space-x-12 text-slate-400">
                    <ArrowRight className="transform rotate-45" />
                    <ArrowRight className="transform -rotate-45" />
                </div>
            </div>
         </div>

         <div className="space-y-8">
            <StreamCard title="Concentrate (Product)" data={concStream} color="border-l-green-500" />
            <StreamCard title="Tailings (Waste)" data={tailsStream} color="border-l-red-500" />
         </div>
      </div>
    </div>
  );
};
