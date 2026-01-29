import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase } from '../types';
import { Trophy, Zap, Target, LogOut, Image as ImageIcon } from 'lucide-react';

export const PlayerView: React.FC = () => {
  const { gameState, players, teams, currentPlayerId, addPlayer, removePlayer, buzzQueue, handleBuzz, questions } = useGame();
  
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Auto-detect join state if currentPlayerId is set externally
  useEffect(() => {
    if (currentPlayerId) {
        setHasJoined(true);
    }
  }, [currentPlayerId]);

  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const currentTeam = teams.find(t => t.id === currentPlayer?.teamId);

  // Handle case where player was removed (kicked or hard reset)
  useEffect(() => {
      if (hasJoined && !currentPlayer) {
          setHasJoined(false);
          setName('');
          setTeam('');
      }
  }, [currentPlayer, hasJoined]);
  
  const myBuzz = buzzQueue.find(b => b.playerId === currentPlayerId);
  const isLockedOut = myBuzz && (myBuzz.status === 'WRONG' || (buzzQueue.length > 0 && buzzQueue[0].playerId !== currentPlayerId && myBuzz.status === 'PENDING'));
  const isMyTurn = myBuzz && myBuzz.status === 'PENDING' && buzzQueue[0].playerId === currentPlayerId;
  const isCorrect = myBuzz && myBuzz.status === 'CORRECT';
  const isWrong = myBuzz && myBuzz.status === 'WRONG';

  // Calculate Rank
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const myRank = currentTeam ? sortedTeams.findIndex(t => t.id === currentTeam.id) + 1 : '-';

  const currentQ = questions[gameState.currentQuestionIndex];

  // Helper for YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && team) {
      addPlayer(name, team);
      setHasJoined(true);
    }
  };

  const handleLeave = () => {
      if (currentPlayerId) {
          removePlayer(currentPlayerId);
          setHasJoined(false);
          setName('');
          setTeam('');
      }
  };

  if (!hasJoined) {
    return (
      <div className="h-full bg-slate-900 p-6 flex flex-col justify-center overflow-y-auto">
        <div className="max-w-md mx-auto w-full bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-black text-slate-800 mb-2">Join Quiz</h1>
          <p className="text-slate-500 mb-6">Enter your details to enter the lobby.</p>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Your Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg text-black bg-white"
                placeholder="e.g. Maverick"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Team Name</label>
              <input 
                type="text" 
                value={team}
                onChange={(e) => setTeam(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg text-black bg-white"
                placeholder="e.g. Top Guns"
                required
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl rounded-lg transition-colors shadow-lg"
            >
              ENTER LOBBY
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (currentPlayer && !currentPlayer.isApproved) {
    return (
      <div className="h-full bg-slate-900 flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
        <div className="animate-pulse mb-6 text-6xl">⏳</div>
        <h2 className="text-2xl font-bold text-white mb-2">Waiting for Host...</h2>
        <p className="text-slate-400 mb-8">Sit tight! You'll be in shortly.</p>
        <button onClick={handleLeave} className="text-slate-500 text-sm underline hover:text-white">Cancel & Leave</button>
      </div>
    );
  }

  // --- EXPLICIT FEEDBACK SCREENS ---

  if (isCorrect) {
    return (
        <div className="h-full bg-green-600 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-white/20 p-8 rounded-full mb-6">
                <span className="text-6xl">🎉</span>
            </div>
            <h1 className="text-5xl font-black text-white mb-2">CORRECT!</h1>
            <p className="text-green-100 text-xl font-medium">You got the points!</p>
            <div className="mt-8 text-white/80 font-mono text-sm">Wait for next question...</div>
        </div>
    );
  }

  if (isWrong) {
    return (
        <div className="h-full bg-red-600 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="bg-white/20 p-8 rounded-full mb-6">
                <span className="text-6xl">❌</span>
            </div>
            <h1 className="text-5xl font-black text-white mb-2">WRONG!</h1>
            <p className="text-red-100 text-xl font-medium">Better luck next time.</p>
            <div className="mt-8 text-white/80 font-mono text-sm">You are locked out for this question.</div>
        </div>
    );
  }

  // --- FINAL STATS VIEW ---
  if (gameState.phase === GamePhase.FINAL_STATS) {
      const winningTeam = sortedTeams[0];
      
      let fastestPlayer = null;
      let fastestTime = Infinity;
      players.forEach(p => {
          if (p.stats.bestReactionTime && p.stats.bestReactionTime < fastestTime) {
              fastestTime = p.stats.bestReactionTime;
              fastestPlayer = p;
          }
      });

      const topPlayers = [...players].sort((a,b) => b.score - a.score).slice(0, 5);

      return (
        <div className="h-full bg-slate-900 flex flex-col overflow-y-auto">
            {/* Header */}
            <div className="bg-slate-800 p-4 shadow-md text-center shrink-0 flex justify-between items-center">
                <h1 className="text-white font-black text-xl tracking-widest uppercase flex-1">Game Over</h1>
                <button onClick={handleLeave} className="text-slate-400 p-2"><LogOut size={20} /></button>
            </div>

            <div className="flex-1 p-6 flex flex-col gap-6 items-center">
                {/* Winning Team Trophy */}
                <div className="bg-gradient-to-b from-yellow-500/20 to-slate-800 w-full max-w-sm rounded-2xl p-6 border border-yellow-500/30 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
                    <Trophy className="text-yellow-400 w-16 h-16 mb-4 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
                    <div className="text-yellow-100 text-sm font-bold uppercase tracking-wider mb-1">Winning Team</div>
                    <div className="text-3xl font-black text-white mb-2">{winningTeam?.name || "No Winner"}</div>
                    <div className="bg-yellow-500/20 px-4 py-1 rounded-full text-yellow-300 font-mono font-bold text-lg border border-yellow-500/50">
                        {winningTeam?.score || 0} PTS
                    </div>
                </div>

                {/* Fastest Finger */}
                {fastestPlayer && (
                    <div className="bg-slate-800 w-full max-w-sm rounded-xl p-4 border border-slate-700 flex items-center gap-4 shadow-md">
                        <div className="bg-blue-900/50 p-3 rounded-lg text-blue-400">
                            <Zap className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="text-slate-400 text-xs font-bold uppercase">Fastest Buzzer</div>
                            <div className="text-white font-bold text-lg">{fastestPlayer.name}</div>
                            <div className="text-blue-400 font-mono text-sm">{(fastestTime / 1000).toFixed(2)}s reaction</div>
                        </div>
                    </div>
                )}

                {/* Top Players Table */}
                <div className="w-full max-w-sm">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Top 5 Players</h3>
                    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-900/50 text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Rank</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3 text-right">Score</th>
                                    <th className="px-4 py-3 text-right">Acc</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-white">
                                {topPlayers.map((p, i) => (
                                    <tr key={p.id} className={p.id === currentPlayerId ? 'bg-indigo-900/30' : ''}>
                                        <td className="px-4 py-3 font-mono text-slate-400">#{i + 1}</td>
                                        <td className="px-4 py-3 font-medium truncate max-w-[100px]">{p.name}</td>
                                        <td className="px-4 py-3 text-right font-mono">{p.score}</td>
                                        <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                            {p.stats.correctAnswers}/{p.stats.totalBuzzes}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- REGULAR GAMEPLAY UI ---
  return (
    <div className="h-full bg-slate-800 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="bg-slate-900 p-4 shadow-md flex justify-between items-center z-10 shrink-0 sticky top-0">
        <div>
          <div className="text-white font-bold text-lg">{currentPlayer?.name}</div>
          <div className="text-slate-400 text-sm font-bold">{currentTeam?.name || 'No Team'}</div>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex flex-col items-end">
                <div className="bg-blue-900 px-3 py-1 rounded text-blue-200 font-mono font-bold text-sm mb-1">
                    {currentTeam?.score || 0} PTS
                </div>
                <div className="text-xs text-slate-400 font-bold uppercase">
                    Rank #{myRank}
                </div>
            </div>
            <button 
                onClick={handleLeave} 
                className="bg-slate-800 p-2 rounded text-slate-400 hover:text-red-400 ml-2"
                title="Leave Game"
            >
                <LogOut size={16} />
            </button>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        
        {/* Dynamic Question Text & Media on Mobile */}
        {gameState.phase !== GamePhase.LOBBY && gameState.phase !== GamePhase.LEADERBOARD && gameState.phase !== GamePhase.FINAL_STATS && currentQ && (
           <div className="absolute top-4 left-4 right-4 text-center">
              <p className="text-slate-300 text-sm uppercase tracking-widest mb-2">Current Question</p>
              
              {/* Media Preview on Player Device */}
              {currentQ.mediaUrl && (
                  <div className="mb-4 w-full max-w-[200px] mx-auto rounded-lg overflow-hidden shadow-lg border border-slate-600 bg-black">
                       {currentQ.mediaType === 'video' ? (
                            <div className="aspect-video">
                                <iframe 
                                    className="w-full h-full"
                                    src={`https://www.youtube.com/embed/${getYoutubeId(currentQ.mediaUrl)}?autoplay=0`}
                                    frameBorder="0"
                                    allowFullScreen
                                />
                            </div>
                       ) : (
                           <img src={currentQ.mediaUrl} alt="Visual Clue" className="w-full h-auto object-contain" />
                       )}
                  </div>
              )}

              <p className="text-white font-medium leading-snug">
                {currentQ.text}
              </p>
           </div>
        )}

        {/* The Buzzer Logic */}
        {gameState.phase === GamePhase.BUZZER_OPEN ? (
           <button 
             onClick={() => currentPlayerId && handleBuzz(currentPlayerId)}
             className="w-64 h-64 rounded-full bg-red-600 shadow-[0_10px_0_rgb(153,27,27)] active:shadow-none active:translate-y-2 transition-all flex items-center justify-center border-8 border-red-800 z-20 mt-32"
           >
             <span className="text-4xl font-black text-white tracking-widest">BUZZ!</span>
           </button>
        ) : gameState.phase === GamePhase.ADJUDICATION ? (
            // State during adjudication
            myBuzz ? (
                isMyTurn ? (
                    <div className="w-full h-full bg-green-600 absolute inset-0 flex flex-col items-center justify-center animate-pulse z-30">
                        <span className="text-9xl mb-4">🎤</span>
                        <h2 className="text-4xl font-black text-white uppercase">Your Turn!</h2>
                        <p className="text-green-200 mt-2">Answer the host now.</p>
                    </div>
                ) : isLockedOut ? (
                     <div className="flex flex-col items-center text-slate-500 mt-32">
                        <div className="text-6xl mb-4">🔒</div>
                        <span className="text-xl font-bold">LOCKED OUT</span>
                        <span className="text-sm mt-2">Another player is answering...</span>
                     </div>
                ) : (
                    <div className="flex flex-col items-center mt-32">
                        <div className="text-6xl text-yellow-500 mb-4 font-bold">#{myBuzz.order}</div>
                        <span className="text-white text-xl">In Queue...</span>
                    </div>
                )
            ) : (
                <div className="text-slate-500 font-bold text-xl mt-32">Locked</div>
            )
        ) : (gameState.phase === GamePhase.LEADERBOARD) ? (
            // Leaderboard View for Players
            <div className="w-full max-w-sm">
                <h3 className="text-white text-center font-bold text-xl mb-4 uppercase tracking-wider">Top Teams</h3>
                <div className="bg-slate-700 rounded-xl overflow-hidden shadow-lg border border-slate-600">
                    {sortedTeams.slice(0, 5).map((t, idx) => (
                        <div key={t.id} className={`flex justify-between items-center p-4 border-b border-slate-600 ${t.id === currentTeam?.id ? 'bg-indigo-900/50' : ''}`}>
                            <div className="flex items-center gap-3">
                                <span className={`font-black w-6 ${idx === 0 ? 'text-yellow-400' : 'text-slate-400'}`}>#{idx + 1}</span>
                                <span className={`font-bold ${t.id === currentTeam?.id ? 'text-white' : 'text-slate-300'}`}>{t.name}</span>
                            </div>
                            <span className="font-mono text-white">{t.score}</span>
                        </div>
                    ))}
                </div>
            </div>
        ) : (
            // Default Idle State
            <div className="text-slate-500 text-center mt-32">
               {gameState.phase === GamePhase.LOBBY && <p>Waiting for game to start...</p>}
               {gameState.phase === GamePhase.COUNTDOWN && <p className="text-6xl text-white font-mono animate-ping">{gameState.countdownValue}</p>}
               {gameState.phase === GamePhase.QUESTION_DISPLAY && <p>Listen carefully...</p>}
            </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="p-4 text-center text-slate-500 text-xs shrink-0">
         Phase: {gameState.phase}
      </div>
    </div>
  );
};