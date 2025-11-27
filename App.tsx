
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { EquipmentType, NodeData, Connection, Mineral, LogEntry } from './types';
import { DashboardView } from './views/DashboardView';
import { AuthView } from './views/AuthView';
import { AdminView } from './views/AdminView';
import { LandingPage } from './views/LandingPage';
import { ProjectView } from './views/ProjectView';
import { ResultsView } from './views/ResultsView';
import { Construction } from 'lucide-react';
import { SimulationResult } from './services/flowsheetSolver';
import { WEBMINERAL_DB } from './services/miningMath';

interface User {
  email: string;
  isAdmin: boolean;
}

const PlaceholderView: React.FC<{ title: string; description: string }> = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Construction className="w-10 h-10 text-slate-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 max-w-md">{description}</p>
        <button className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Notify when ready
        </button>
    </div>
);

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<EquipmentType>(EquipmentType.DASHBOARD);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // --- Persistent State for Project Flowsheet ---
  // Lifted up so it doesn't reset on navigation
  const [projectNodes, setProjectNodes] = useState<NodeData[]>([]);
  const [projectConnections, setProjectConnections] = useState<Connection[]>([]);
  const [projectMinerals, setProjectMinerals] = useState<Mineral[]>(WEBMINERAL_DB);
  const [projectLogs, setProjectLogs] = useState<LogEntry[]>([]);
  
  // --- Simulation Results State ---
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const handleLogin = (email: string, isAdmin: boolean) => {
    setUser({ email, isAdmin });
    setShowAuth(false); // Hide auth screen
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(EquipmentType.DASHBOARD);
    setShowAuth(false); // Go back to landing page
  };

  const navigateToAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  // Atalho para login de administrador (Dev Mode)
  const handleAdminShortcut = () => {
      setUser({ email: 'eng.mateusgsilva@gmail.com', isAdmin: true });
      setShowAuth(false);
  };

  const handleSimulationComplete = (results: SimulationResult) => {
      setSimulationResult(results);
      // We keep the user in Project View to see visuals, but data is ready for Results View
  };

  const renderView = () => {
    switch (currentView) {
      case EquipmentType.PROJECT:
        return (
          <ProjectView 
            nodes={projectNodes}
            setNodes={setProjectNodes}
            connections={projectConnections}
            setConnections={setProjectConnections}
            minerals={projectMinerals}
            setMinerals={setProjectMinerals}
            logs={projectLogs}
            setLogs={setProjectLogs}
            onSimulationComplete={handleSimulationComplete}
            onNavigateToResults={() => setCurrentView(EquipmentType.RESULTS)}
          />
        );
      case EquipmentType.PARAMETERS:
        return <PlaceholderView title="Parâmetros de Simulação" description="Configuração detalhada de variáveis de processo, constantes de minério e setpoints operacionais." />;
      case EquipmentType.RESULTS:
        return (
          <ResultsView 
            results={simulationResult} 
            connections={projectConnections}
            onNavigate={setCurrentView}
          />
        );
      case EquipmentType.ECONOMICS:
        return <PlaceholderView title="Análise Econômica" description="Estimativas de OPEX, CAPEX e análise de viabilidade financeira do projeto." />;
      case EquipmentType.CHARTS:
        return <PlaceholderView title="Gráficos de Performance" description="Visualização de curvas de eficiência, distribuição granulométrica e tendências." />;
      case EquipmentType.OPTIMIZATION:
        return <PlaceholderView title="Otimização de Processo" description="Ferramentas de IA para sugerir melhorias operacionais e ajustes de circuito." />;
      case EquipmentType.REPORTS:
        return <PlaceholderView title="Relatórios Técnicos" description="Geração e exportação de relatórios em PDF/Excel para stakeholders." />;
      case EquipmentType.HELP:
        return <PlaceholderView title="Central de Ajuda" description="Documentação, tutoriais e suporte técnico." />;
      case EquipmentType.ADMIN:
        if (!user?.isAdmin) return <DashboardView onNavigate={setCurrentView} user={user} />;
        return <AdminView />;
      case EquipmentType.DASHBOARD:
      default:
        return <DashboardView onNavigate={setCurrentView} user={user} />;
    }
  };

  // 1. If user is logged in, show the App Layout
  if (user) {
    return (
      <Layout 
        currentView={currentView} 
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        isAdmin={user.isAdmin}
      >
        {renderView()}
      </Layout>
    );
  }

  // 2. If user clicked Login/Register, show Auth View
  if (showAuth) {
    return (
      <AuthView 
        onLogin={handleLogin} 
        initialMode={authMode} 
        onBack={() => setShowAuth(false)}
      />
    );
  }

  // 3. Default: Show Landing Page
  return <LandingPage onNavigateToAuth={navigateToAuth} onAdminShortcut={handleAdminShortcut} />;
};

export default App;