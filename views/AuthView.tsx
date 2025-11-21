import React, { useState, useEffect } from 'react';
import { Lock, Mail, User, ArrowRight, AlertCircle, ArrowLeft } from 'lucide-react';

interface AuthViewProps {
  onLogin: (email: string, isAdmin: boolean) => void;
  initialMode?: 'login' | 'register';
  onBack: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, initialMode = 'login', onBack }) => {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Admin Credential Check
    const adminEmail = "eng.mateusgsilva@gmail.com";
    const adminPass = "M260667s*";

    if (isLogin) {
        if (email === adminEmail) {
            if (password === adminPass) {
                // Successful Admin Login
                onLogin(email, true);
            } else {
                setError("Invalid credentials.");
            }
        } else {
            // Regular User Mock Login (Accepts any other email/password for demo)
            if (email && password) {
                onLogin(email, false);
            } else {
                setError("Please enter email and password.");
            }
        }
    } else {
        // Registration Logic (Mock)
        if (email && password) {
            onLogin(email, false);
        }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative">
      
      <button 
        onClick={onBack}
        className="absolute top-8 left-8 flex items-center text-slate-500 hover:text-slate-900 transition-colors font-medium"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Back to Home
      </button>

      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-8 text-center relative overflow-hidden">
          {/* Decorative background circle */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white opacity-5 rounded-full"></div>
          
          <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg relative z-10">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wider relative z-10">MISIMWEB</h1>
          <p className="text-slate-400 mt-2 relative z-10">Mining Process Simulator</p>
        </div>
        
        <div className="p-8">
          <div className="flex space-x-4 mb-8 border-b border-slate-200">
             <button 
                className={`flex-1 pb-4 text-sm font-medium transition-colors ${isLogin ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                onClick={() => { setIsLogin(true); setError(''); }}
             >
                Login
             </button>
             <button 
                className={`flex-1 pb-4 text-sm font-medium transition-colors ${!isLogin ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
                onClick={() => { setIsLogin(false); setError(''); }}
             >
                Register
             </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                    {error}
                </div>
            )}

            {!isLogin && (
              <div className="animate-in fade-in slide-in-from-top-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    placeholder="John Doe"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 rounded-lg shadow-md transition-transform active:scale-95 flex items-center justify-center"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>
          </form>

          <div className="mt-6 text-center">
             <p className="text-sm text-slate-500">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="ml-1 text-orange-600 font-medium hover:underline"
                >
                   {isLogin ? 'Sign up' : 'Log in'}
                </button>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
