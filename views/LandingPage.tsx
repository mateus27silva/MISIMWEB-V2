import React, { useState } from 'react';
import { 
  Cpu, 
  Zap, 
  BarChart3, 
  CheckCircle, 
  ArrowRight, 
  Menu, 
  X,
  Layers,
  Globe,
  ShieldCheck
} from 'lucide-react';

interface LandingPageProps {
  onNavigateToAuth: (mode: 'login' | 'register') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigateToAuth }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg mr-3">
                M
              </div>
              <span className="font-bold text-2xl tracking-tight text-slate-900">MISIM<span className="text-orange-600">WEB</span></span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <button onClick={() => scrollToSection('features')} className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Features</button>
              <button onClick={() => scrollToSection('how-it-works')} className="text-slate-600 hover:text-orange-600 font-medium transition-colors">How it Works</button>
              <button onClick={() => scrollToSection('pricing')} className="text-slate-600 hover:text-orange-600 font-medium transition-colors">Pricing</button>
              <div className="h-6 w-px bg-slate-200 mx-2"></div>
              <button 
                onClick={() => onNavigateToAuth('login')}
                className="text-slate-900 font-semibold hover:text-orange-600 transition-colors"
              >
                Log In
              </button>
              <button 
                onClick={() => onNavigateToAuth('register')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-full font-semibold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5"
              >
                Get Started
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left px-3 py-3 text-slate-600 font-medium hover:bg-orange-50 hover:text-orange-600 rounded-lg">Features</button>
              <button onClick={() => scrollToSection('pricing')} className="block w-full text-left px-3 py-3 text-slate-600 font-medium hover:bg-orange-50 hover:text-orange-600 rounded-lg">Pricing</button>
              <button onClick={() => onNavigateToAuth('login')} className="block w-full text-left px-3 py-3 text-slate-900 font-bold hover:bg-slate-50 rounded-lg">Log In</button>
              <button onClick={() => onNavigateToAuth('register')} className="block w-full text-center mt-4 bg-orange-600 text-white px-3 py-3 rounded-lg font-bold">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-orange-100 rounded-full blur-3xl opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-50"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-700 font-semibold text-sm mb-6 animate-fade-in-up">
              <span className="flex h-2 w-2 rounded-full bg-orange-600 mr-2"></span>
              New AI-Powered Analysis Available
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-tight">
              Optimize Mining with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">Precision Simulation</span>
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Advanced mass balance simulation for Ball Mills and Hydrocyclones. 
              Reduce uncertainty, optimize throughput, and make data-driven decisions.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button 
                onClick={() => onNavigateToAuth('register')}
                className="px-8 py-4 bg-slate-900 text-white rounded-full font-bold text-lg shadow-xl hover:bg-slate-800 hover:scale-105 transition-all flex items-center justify-center"
              >
                Start Simulating <ArrowRight className="ml-2 w-5 h-5" />
              </button>
              <button 
                onClick={() => scrollToSection('how-it-works')}
                className="px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-full font-bold text-lg shadow-sm hover:bg-slate-50 transition-all"
              >
                Learn More
              </button>
            </div>
          </div>

          {/* Hero Image / Dashboard Preview */}
          <div className="mt-16 relative rounded-2xl bg-slate-900 p-2 shadow-2xl transform rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-blue-600 rounded-2xl blur opacity-20"></div>
            <div className="relative bg-slate-50 rounded-xl overflow-hidden border border-slate-200 aspect-[16/9] flex items-center justify-center">
                {/* Abstract UI Representation */}
                <div className="w-full h-full p-8 grid grid-cols-12 gap-4 bg-slate-100">
                    <div className="col-span-3 bg-white rounded-lg shadow-sm h-full hidden md:block"></div>
                    <div className="col-span-12 md:col-span-9 grid grid-rows-3 gap-4">
                        <div className="bg-white rounded-lg shadow-sm p-6 flex items-center justify-between">
                            <div className="h-8 w-1/3 bg-slate-200 rounded animate-pulse"></div>
                            <div className="h-10 w-10 bg-blue-100 rounded-full"></div>
                        </div>
                        <div className="row-span-2 bg-white rounded-lg shadow-sm p-6 grid grid-cols-2 gap-4">
                             <div className="bg-slate-50 rounded h-full border border-slate-100 flex items-center justify-center">
                                <BarChart3 className="w-16 h-16 text-slate-300" />
                             </div>
                             <div className="space-y-3">
                                <div className="h-4 w-full bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse"></div>
                                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse"></div>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                    <p className="bg-white/80 backdrop-blur px-6 py-3 rounded-full font-semibold text-slate-600 shadow-lg border border-white/50">
                        Interactive Simulation Dashboard
                    </p>
                </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Why Choose MISIMWEB?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We combine classic metallurgical models with modern computational power to deliver fast, accurate results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Cpu className="w-8 h-8 text-orange-600" />,
                title: "Precise Algorithms",
                desc: "Built on Bond's Law and Plitt's Model for industry-standard accuracy in sizing and classification."
              },
              {
                icon: <Zap className="w-8 h-8 text-blue-600" />,
                title: "AI-Powered Insights",
                desc: "Get instant analysis of your simulation results using integrated Gemini AI to identify bottlenecks."
              },
              {
                icon: <Layers className="w-8 h-8 text-purple-600" />,
                title: "Mass Balance",
                desc: "Visualize flow rates, solid percentages, and water balance across your entire circuit layout."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Start Simulating in Minutes</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-orange-200 via-blue-200 to-orange-200 -z-10"></div>

            {[
              { title: "Create Account", desc: "Register for free to access the basic dashboard." },
              { title: "Buy Credits", desc: "Purchase simulation credits tailored to your project needs." },
              { title: "Run Simulation", desc: "Input your parameters and get instant results." }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-white border-4 border-orange-100 rounded-full flex items-center justify-center text-2xl font-bold text-orange-600 shadow-sm mb-6 z-10">
                  {idx + 1}
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Flexible Credit Packages</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Pay only for what you need. No monthly subscriptions required for basic usage.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 flex flex-col">
              <div className="mb-4">
                <span className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Starter</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">$49</h3>
              <p className="text-slate-400 mb-6">100 Simulation Credits</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> Basic Ball Mill Sizing</li>
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> Standard Export</li>
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> Email Support</li>
              </ul>
              <button onClick={() => onNavigateToAuth('register')} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors">Buy Credits</button>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-orange-600 to-orange-700 rounded-2xl p-8 border border-orange-500 transform md:-translate-y-4 shadow-2xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white/20 px-3 py-1 rounded-bl-xl text-xs font-bold">MOST POPULAR</div>
              <div className="mb-4">
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Professional</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">$199</h3>
              <p className="text-orange-100 mb-6">500 Simulation Credits</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-white"><CheckCircle className="w-5 h-5 text-white mr-3" /> All Equipment Models</li>
                <li className="flex items-center text-white"><CheckCircle className="w-5 h-5 text-white mr-3" /> AI-Powered Analysis</li>
                <li className="flex items-center text-white"><CheckCircle className="w-5 h-5 text-white mr-3" /> Priority Support</li>
                <li className="flex items-center text-white"><CheckCircle className="w-5 h-5 text-white mr-3" /> Advanced Reports (PDF)</li>
              </ul>
              <button onClick={() => onNavigateToAuth('register')} className="w-full py-3 bg-white text-orange-700 hover:bg-slate-50 rounded-xl font-bold transition-colors shadow-lg">Get Pro Access</button>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700 flex flex-col">
              <div className="mb-4">
                <span className="bg-slate-700 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Enterprise</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">Custom</h3>
              <p className="text-slate-400 mb-6">Unlimited Access</p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> Dedicated Server</li>
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> Custom Model Integration</li>
                <li className="flex items-center text-slate-300"><CheckCircle className="w-5 h-5 text-orange-500 mr-3" /> 24/7 Engineering Support</li>
              </ul>
              <button className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-semibold transition-colors">Contact Sales</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-12 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-bold mr-2">M</div>
                <span className="font-bold text-xl text-white">MISIMWEB</span>
              </div>
              <p className="text-sm max-w-xs">
                Empowering mining engineers with accessible, high-precision process simulation tools.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-orange-500">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-orange-500">Pricing</button></li>
                <li><span className="opacity-50 cursor-not-allowed">API (Coming Soon)</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-orange-500">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-orange-500">Terms of Service</a></li>
                <li><a href="#" className="hover:text-orange-500">Contact Us</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2024 MISIMWEB. All rights reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
               <Globe className="w-5 h-5 hover:text-white cursor-pointer" />
               <ShieldCheck className="w-5 h-5 hover:text-white cursor-pointer" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
