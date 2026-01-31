import React, { useState, useEffect, Suspense } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Monitor, Smartphone, LayoutDashboard, Loader2, RefreshCw, Lock } from 'lucide-react';

const HostView = React.lazy(() => import('./components/HostView').then(module => ({ default: module.HostView })));
const PlayerView = React.lazy(() => import('./components/PlayerView').then(module => ({ default: module.PlayerView })));
const SpectatorView = React.lazy(() => import('./components/SpectatorView').then(module => ({ default: module.SpectatorView })));

const LoginScreen: React.FC = () => {
    const { login } = useGame();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const success = await login(password);
        if (!success) {
            setError('Invalid Password');
        }
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center h-full bg-slate-900">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-sm w-full">
                <div className="flex justify-center mb-6 text-indigo-600">
                    <Lock size={48} />
                </div>
                <h2 className="text-2xl font-bold text-center text-slate-800 mb-6">Host Access</h2>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-lg mb-4 text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Enter Admin Password"
                        autoFocus
                    />
                    {error && <p className="text-red-500 text-sm mb-4 text-center font-bold">{error}</p>}
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Verifying...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const AppContent: React.FC = () => {
  const { setIsHost, isSyncing, isAuthenticated } = useGame();
  const [view, setView] = useState<'HOST' | 'PLAYER' | 'SPECTATOR'>('SPECTATOR');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#host') {
        setView('HOST');
        setIsHost(true);
      }
      else if (hash === '#player') {
        setView('PLAYER');
        setIsHost(false);
      }
      else {
        setView('SPECTATOR');
        setIsHost(false);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [setIsHost]);

  const navigate = (newView: 'HOST' | 'PLAYER' | 'SPECTATOR') => {
    setView(newView);
    window.location.hash = newView.toLowerCase();
  };

  const renderView = () => {
    switch (view) {
      case 'HOST': 
        return isAuthenticated ? <HostView /> : <LoginScreen />;
      case 'PLAYER': return <PlayerView />;
      case 'SPECTATOR': return <SpectatorView />;
      default: return <SpectatorView />;
    }
  };

  return (
      <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
        {/* Top Navigation Bar */}
        <nav className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shadow-md shrink-0 z-50">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center font-black italic text-white shadow-lg border border-white/10">Q</div>
              <span className="font-bold text-lg tracking-wide text-slate-100 hidden sm:block">QuizMaster Live</span>
              {isSyncing && (
                  <RefreshCw size={14} className="text-slate-500 animate-spin ml-2" />
              )}
           </div>
           
           <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <NavButton 
                active={view === 'SPECTATOR'} 
                onClick={() => navigate('SPECTATOR')} 
                icon={<Monitor size={16} />} 
                label="Spectator" 
              />
              <NavButton 
                active={view === 'HOST'} 
                onClick={() => navigate('HOST')} 
                icon={<LayoutDashboard size={16} />} 
                label="Host" 
              />
              <NavButton 
                active={view === 'PLAYER'} 
                onClick={() => navigate('PLAYER')} 
                icon={<Smartphone size={16} />} 
                label="Player" 
              />
           </div>
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 relative w-full h-full overflow-hidden">
          <Suspense fallback={
            <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 gap-4">
              <Loader2 className="animate-spin w-12 h-12 text-indigo-500" />
              <p>Loading Quiz Module...</p>
            </div>
          }>
            {renderView()}
          </Suspense>
        </div>
      </div>
  );
};

const App: React.FC = () => {
  return (
    <GameProvider>
        <AppContent />
    </GameProvider>
  );
};

interface NavButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const NavButton: React.FC<NavButtonProps> = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
      active 
      ? 'bg-indigo-600 text-white shadow-sm' 
      : 'text-slate-400 hover:text-white hover:bg-slate-700'
    }`}
  >
    {icon}
    <span className="hidden md:inline">{label}</span>
  </button>
);

export default App;