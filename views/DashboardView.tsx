import React from 'react';
import { EquipmentType } from '../types';
import { 
  CreditCard, 
  Clock, 
  FileText, 
  Plus,
  ArrowUpRight,
  TrendingUp,
  Database,
  Sliders,
  ClipboardList,
  BarChart3,
  Zap,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  onNavigate: (view: EquipmentType) => void;
  user?: { email: string; isAdmin: boolean } | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate, user }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Mock Data for recent activity
  const recentActivity = [
    { id: 1, name: 'Iron Ore Circuit A', type: 'Optimization', date: '2 hours ago', status: 'Completed' },
    { id: 2, name: 'Plant Expansion 2025', type: 'Project', date: '5 hours ago', status: 'Saved' },
    { id: 3, name: 'Q3 Report', type: 'Reports', date: 'Yesterday', status: 'Draft' },
  ];

  const tools = [
    {
      id: EquipmentType.PARAMETERS,
      title: "Parâmetros",
      description: "Configure simulation inputs and global variables.",
      icon: Sliders,
      color: "bg-purple-600",
      lightColor: "bg-purple-50 text-purple-600"
    },
    {
      id: EquipmentType.RESULTS,
      title: "Resultados",
      description: "View detailed simulation outputs and mass balances.",
      icon: ClipboardList,
      color: "bg-blue-600",
      lightColor: "bg-blue-50 text-blue-600"
    },
    {
      id: EquipmentType.CHARTS,
      title: "Gráficos",
      description: "Visual analysis of process performance trends.",
      icon: BarChart3,
      color: "bg-orange-600",
      lightColor: "bg-orange-50 text-orange-600"
    },
    {
      id: EquipmentType.OPTIMIZATION,
      title: "Otimização",
      description: "AI-driven suggestions for process improvement.",
      icon: Zap,
      color: "bg-green-600",
      lightColor: "bg-green-50 text-green-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {user?.email.split('@')[0] || 'Engineer'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{currentDate}</p>
        </div>
        <div className="flex space-x-3">
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
             <CreditCard className="w-4 h-4 mr-2 text-slate-400" />
             Add Credits
          </button>
          <button 
            onClick={() => onNavigate(EquipmentType.PROJECT)}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 shadow-sm transition-colors"
          >
             <Plus className="w-4 h-4 mr-2" />
             New Project
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Credits</span>
            <div className="p-2 bg-orange-50 rounded-lg">
                <Database className="w-4 h-4 text-orange-600" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="text-2xl font-bold text-slate-900">2,450</span>
            <span className="text-xs text-slate-400 ml-2">Available</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Simulations</span>
            <div className="p-2 bg-blue-50 rounded-lg">
                <Activity className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="text-2xl font-bold text-slate-900">48</span>
            <span className="text-xs text-green-600 ml-2 flex items-center inline-flex">
               <ArrowUpRight className="w-3 h-3 mr-1" /> +12%
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Projects</span>
            <div className="p-2 bg-purple-50 rounded-lg">
                <FileText className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="mt-auto">
            <span className="text-2xl font-bold text-slate-900">12</span>
            <span className="text-xs text-slate-400 ml-2">Active</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm flex flex-col text-white">
           <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pro Plan</span>
            <TrendingUp className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-sm text-slate-300 mt-2">Your subscription is active until Dec 2025.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Access Tools */}
        <div className="lg:col-span-2 space-y-6">
           <h2 className="text-lg font-bold text-slate-900">Project Management</h2>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tools.map((tool) => (
                <button
                  key={tool.id}
                  onClick={() => onNavigate(tool.id)}
                  className="group relative flex items-start p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-left"
                >
                  <div className={`p-3 rounded-lg mr-4 ${tool.lightColor}`}>
                    <tool.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{tool.title}</h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{tool.description}</p>
                  </div>
                  <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-4 h-4 text-slate-400" />
                  </div>
                </button>
              ))}
           </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center justify-between">
             <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
             <button className="text-sm text-orange-600 hover:text-orange-700 font-medium">View All</button>
          </div>
          
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {recentActivity.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                   <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mr-3">
                         <Clock className="w-4 h-4 text-slate-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.type}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        item.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'Saved' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                      <p className="text-xs text-slate-400 mt-1">{item.date}</p>
                   </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
               <button className="text-xs text-slate-500 hover:text-slate-800 font-medium">Show older history</button>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-5 text-white shadow-md">
             <h3 className="font-bold text-lg mb-1">New Feature!</h3>
             <p className="text-sm text-orange-50 opacity-90 mb-3">
               Otimização com IA agora disponível para análise de circuitos completos.
             </p>
             <button 
               onClick={() => onNavigate(EquipmentType.OPTIMIZATION)}
               className="text-xs font-bold bg-white text-orange-600 px-3 py-1.5 rounded shadow-sm hover:bg-orange-50 transition-colors"
             >
               Testar Agora
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};