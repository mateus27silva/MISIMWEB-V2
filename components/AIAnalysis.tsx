import React, { useState } from 'react';
import { analyzeSimulationResults } from '../services/geminiService';
import { Bot, Loader2, Sparkles } from 'lucide-react';

interface AIAnalysisProps {
  context: string;
  data: any;
}

export const AIAnalysis: React.FC<AIAnalysisProps> = ({ context, data }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeSimulationResults(context, data);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-600 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-indigo-900">AI Process Consultant</h3>
        </div>
        {!analysis && (
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 text-sm font-medium"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Results
              </>
            )}
          </button>
        )}
      </div>

      {analysis && (
        <div className="prose prose-sm prose-indigo max-w-none bg-white p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="text-slate-700 whitespace-pre-line leading-relaxed">
            {analysis}
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              onClick={() => setAnalysis(null)}
              className="text-xs text-slate-400 hover:text-indigo-600 transition-colors"
            >
              Clear Analysis
            </button>
          </div>
        </div>
      )}
      
      {!analysis && !loading && (
        <p className="text-sm text-slate-500">
          Click the button to generate an AI-powered interpretation of your simulation results using Google Gemini.
        </p>
      )}
    </div>
  );
};
