import React, { useState } from 'react';
import { EquipmentType } from '../types';
import { 
  LayoutDashboard, 
  Menu,
  X,
  LogOut,
  Shield,
  FolderKanban,
  Sliders,
  ClipboardList,
  DollarSign,
  BarChart3,
  Zap,
  FileText,
  HelpCircle
} from 'lucide-react';

interface LayoutProps {
  currentView: EquipmentType;
  onNavigate: (view: EquipmentType) => void;
  onLogout: () => void;
  isAdmin: boolean;
  children: React.ReactNode;
}

interface SidebarItemProps {
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ 
  icon: Icon, 
  label, 
  isActive, 
  onClick 
}) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full px-4 py-3 mb-1 transition-colors rounded-lg ${
      isActive 
        ? 'bg-blue-600 text-white shadow-md' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon className="w-5 h-5 mr-3" />
    <span className="font-medium">{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ currentView, onNavigate, onLogout, isAdmin, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check if the current view requires full screen (no padding/max-width)
  const isFullWidthView = currentView === EquipmentType.PROJECT;

  const navItems = [
    { id: EquipmentType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: EquipmentType.PROJECT, label: 'Project Flowsheet', icon: FolderKanban },
    { id: EquipmentType.PARAMETERS, label: 'Parâmetros', icon: Sliders },
    { id: EquipmentType.RESULTS, label: 'Resultados', icon: ClipboardList },
    { id: EquipmentType.ECONOMICS, label: 'Economia', icon: DollarSign },
    { id: EquipmentType.CHARTS, label: 'Gráficos', icon: BarChart3 },
    { id: EquipmentType.OPTIMIZATION, label: 'Otimização', icon: Zap },
    { id: EquipmentType.REPORTS, label: 'Relatórios', icon: FileText },
    { id: EquipmentType.HELP, label: 'Help', icon: HelpCircle },
  ];

  // Add Admin Item if user is admin
  if (isAdmin) {
    navItems.push({ id: EquipmentType.ADMIN, label: 'Admin Panel', icon: Shield });
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 flex items-center justify-between px-4 z-50">
        <div className="text-white font-bold text-xl">MISIMWEB</div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-800 hidden lg:flex">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
              <span className="font-bold text-white">M</span>
            </div>
            <span className="font-bold text-xl tracking-wider">MISIMWEB</span>
          </div>

          <div className="flex-1 px-3 py-6 space-y-1 overflow-y-auto mt-16 lg:mt-0">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
              Menu
            </div>
            {navItems.map((item) => (
              <SidebarItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                isActive={currentView === item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMobileMenuOpen(false);
                }}
              />
            ))}
          </div>

          <div className="p-4 border-t border-slate-800">
            <button 
              onClick={onLogout}
              className="flex items-center w-full px-4 py-2 mb-4 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
                <LogOut className="w-5 h-5 mr-3" />
                <span className="font-medium">Sign Out</span>
            </button>
            <div className="bg-slate-800 rounded-lg p-3 text-xs text-slate-400">
              <p className="font-semibold text-slate-300 mb-1">Version 3.0.0</p>
              <p>Platform Update</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto relative pt-16 lg:pt-0 ${isFullWidthView ? 'overflow-hidden' : ''}`}>
        <div className={isFullWidthView ? "w-full h-full" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full"}>
          {children}
        </div>
      </main>
      
      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};