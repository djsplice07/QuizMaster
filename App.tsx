import React, { useState, useEffect, Suspense } from 'react';
import { GameProvider, useGame } from './context/GameContext';
import { Monitor, Smartphone, LayoutDashboard, Loader2, RefreshCw } from 'lucide-react';

// Lazy load components to reduce initial bundle size
const HostView = React.lazy(() => import('./components/HostView').then(module => ({ default: module.HostView })));
const PlayerView = React.lazy(() => import('./components/PlayerView').then(module => ({ default: module.PlayerView })));
const SpectatorView = React.lazy(() => import('./components/SpectatorView').then(module => ({ default: module.SpectatorView })));

// Inner Component to access Context
const AppContent: React.FC = () => {
  const { setIsHost, isSyncing, isHost } = useGame();
  const [view, setView] = useState<'HOST' | 'PLAYER' | 'SPECTATOR'>('SPECTATOR');

  // Simple hash routing for demo purposes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#host') {
        setView('HOST');
        setIsHost(true); // Promote this session to Host Authority
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
      case 'HOST': return <HostView />;
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
