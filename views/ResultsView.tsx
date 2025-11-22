

import React from 'react';
import { FileText, AlertTriangle, CheckSquare, Download, Activity, ArrowRight } from 'lucide-react';
import { SimulationResult } from '../services/flowsheetSolver';
import { EquipmentType, Connection } from '../types';

interface ResultsViewProps {
  results: SimulationResult | null;
  connections: Connection[];
  onNavigate: (view: EquipmentType) => void;
}

export const ResultsView: React.FC<ResultsViewProps> = ({ results, connections, onNavigate }) => {
  if (!results) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Activity className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Nenhum resultado disponível</h2>
        <p className="text-slate-500 max-w-md mb-6">
          Execute uma simulação na aba "Project Flowsheet" para gerar o balanço de massa e visualizar o relatório técnico aqui.
        </p>
        <button 
          onClick={() => onNavigate(EquipmentType.PROJECT)}
          className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          Ir para o Fluxograma <ArrowRight className="ml-2 w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-blue-600" />
            Relatório de Simulação
          </h1>
          <p className="text-slate-500 mt-2">Balanço de massa global e por componente em regime permanente.</p>
        </div>
        <button 
          onClick={() => window.print()} 
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 flex items-center shadow-sm"
        >
          <Download className="w-4 h-4 mr-2" /> Exportar PDF
        </button>
      </header>

      {/* 1. Resumo do Balanço Global */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">1. Resumo Operacional</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Entradas Totais</p>
            <p className="text-3xl font-bold text-slate-900">{results.globalBalance.inputs.toFixed(1)} <span className="text-lg text-slate-500 font-normal">t/h</span></p>
          </div>
          <div className="bg-green-50 p-5 rounded-xl border border-green-100">
            <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-1">Saídas Totais</p>
            <p className="text-3xl font-bold text-slate-900">{results.globalBalance.outputs.toFixed(1)} <span className="text-lg text-slate-500 font-normal">t/h</span></p>
          </div>
          <div className={`p-5 rounded-xl border ${results.error < 1 ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200'}`}>
            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${results.error < 1 ? 'text-slate-500' : 'text-red-600'}`}>Erro de Fechamento</p>
            <p className="text-3xl font-bold text-slate-900">{results.error.toFixed(4)} <span className="text-lg text-slate-500 font-normal">%</span></p>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 inline-block">
            <strong>Status:</strong> {results.converged ? `Simulação convergiu em ${results.iterations} iterações.` : "Atenção: Simulação não convergiu completamente. Verifique reciclos."}
        </div>
      </div>

      {/* 2. Tabela das Correntes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <h3 className="text-lg font-bold text-slate-800">2. Detalhamento das Correntes</h3>
           <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">Todas as vazões em t/h</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-3 font-bold uppercase text-xs tracking-wider">Corrente</th>
                        <th className="px-6 py-3 font-bold text-right uppercase text-xs tracking-wider">Vazão Total</th>
                        <th className="px-6 py-3 font-bold text-right uppercase text-xs tracking-wider">Sólidos</th>
                        <th className="px-6 py-3 font-bold text-right uppercase text-xs tracking-wider">Água (m³/h)</th>
                        <th className="px-6 py-3 font-bold text-right uppercase text-xs tracking-wider">% Sólidos</th>
                        <th className="px-6 py-3 font-bold text-right uppercase text-xs tracking-wider">Densidade (t/m³)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {Object.entries(results.streams).map(([id, stream]) => {
                        const connection = connections.find(c => c.id === id);
                        const label = connection?.label || id.split('_')[1] || id;
                        
                        return (
                          <tr key={id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">
                                {label}
                                {connection?.label && <span className="block text-xs text-slate-400 font-mono font-normal">{id.split('_')[1]}</span>}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-900">{stream.totalTph.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stream.solidsTph.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right text-slate-600">{stream.waterTph.toFixed(2)}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${stream.percentSolids > 65 ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'}`}>
                                  {stream.percentSolids.toFixed(1)}%
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-600">{stream.slurryDensity.toFixed(2)}</td>
                          </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* 3. Diagnóstico Técnico */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-slate-500" /> 
            3. Diagnóstico Técnico e Alertas
          </h3>
          {results.diagnostics.length > 0 ? (
              <ul className="space-y-3">
                  {results.diagnostics.map((diag, idx) => (
                      <li key={idx} className="flex items-start text-sm text-slate-800 bg-orange-50 p-4 rounded-lg border border-orange-100">
                          <AlertTriangle className="w-5 h-5 text-orange-600 mr-3 flex-shrink-0 mt-0.5" />
                          {diag}
                      </li>
                  ))}
              </ul>
          ) : (
              <div className="flex items-center text-green-700 bg-green-50 p-4 rounded-lg border border-green-100">
                  <CheckSquare className="w-5 h-5 mr-2" /> Nenhuma anomalia operacional crítica detectada nos modelos simulados.
              </div>
          )}
      </div>
    </div>
  );
};