import React from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase } from '../types';
import type { Player } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Zap, Users } from 'lucide-react';

export const SpectatorView: React.FC = () => {
  const { gameState, questions, teams, players, buzzQueue } = useGame();
  const currentQ = questions[gameState.currentQuestionIndex];

  // Helper to get formatted leaderboard data
  const leaderboardData = [...teams].sort((a, b) => b.score - a.score);
  
  const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];

  // Helper for YouTube ID extraction
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const renderContent = () => {
    switch (gameState.phase) {
      case GamePhase.LOBBY:
        return (
          <div className="text-center animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8">
              JOIN THE QUIZ
            </h1>
            <div className="bg-white p-4 inline-block rounded-xl mb-8">
               <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://quiz-app-demo.com" alt="QR Code" className="w-48 h-48" />
            </div>
            <p className="text-2xl text-slate-300 mb-8">Scan to Join</p>
            
            <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
              {players.filter(p => p.isApproved).map(p => (
                <div key={p.id} className="bg-slate-800 border border-slate-600 px-6 py-3 rounded-full text-xl font-bold text-white animate-bounce-in">
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        );

      case GamePhase.COUNTDOWN:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-[20rem] font-black text-white animate-ping">
              {gameState.countdownValue}
            </div>
          </div>
        );

      case GamePhase.QUESTION_DISPLAY:
      case GamePhase.BUZZER_OPEN:
      case GamePhase.ADJUDICATION:
        return (
          <div className="w-full max-w-6xl mx-auto p-8 flex flex-col h-full">
            <div className="mb-4 flex justify-between items-center text-slate-400 text-2xl font-mono uppercase tracking-widest shrink-0">
              <span>{currentQ?.category || 'General'}</span>
              <span>{currentQ?.points} PTS</span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center">
                <h2 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8 text-center drop-shadow-xl">
                  {currentQ?.text}
                </h2>

                {/* Media Display */}
                {currentQ?.mediaUrl && (
                    <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-slate-700 mb-8">
                        {currentQ.mediaType === 'video' ? (
                            <iframe 
                                className="w-full h-full"
                                src={`https://www.youtube.com/embed/${getYoutubeId(currentQ.mediaUrl)}?autoplay=1&mute=0`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <img src={currentQ.mediaUrl} alt="Question Media" className="w-full h-full object-contain" />
                        )}
                    </div>
                )}
            </div>
            
            {/* Buzzer Status for Audience */}
            <div className="flex justify-center gap-4 min-h-[100px] shrink-0 mt-8">
              {buzzQueue.map((buzz, idx) => {
                 const player = players.find(p => p.id === buzz.playerId);
                 let bg = 'bg-slate-700';
                 if (buzz.status === 'CORRECT') bg = 'bg-green-600';
                 if (buzz.status === 'WRONG') bg = 'bg-red-600';
                 if (buzz.status === 'PENDING' && idx === 0) bg = 'bg-yellow-500 animate-pulse';

                 return (
                   <div key={buzz.playerId} className={`${bg} transition-all duration-300 px-8 py-4 rounded-xl flex items-center gap-4 border-2 border-white/20`}>
                      <span className="text-3xl font-black text-white">#{idx + 1}</span>
                      <span className="text-2xl text-white font-bold">{player?.name}</span>
                   </div>
                 );
              })}
            </div>
          </div>
        );

      case GamePhase.ANSWER_REVEAL:
        return (
          <div className="text-center max-w-5xl mx-auto">
             <h3 className="text-4xl text-slate-400 mb-8">The answer is...</h3>
             <div className="text-6xl md:text-8xl font-black text-green-400 bg-slate-800/50 p-12 rounded-3xl border border-green-500/30 backdrop-blur-sm animate-fade-in-up">
               {currentQ?.answer}
             </div>
          </div>
        );

      case GamePhase.LEADERBOARD:
        return (
          <div className="w-full max-w-6xl mx-auto h-[80vh] flex flex-col">
            <h2 className="text-5xl font-bold text-white text-center mb-8">LEADERBOARD</h2>
            <div className="flex-1 w-full bg-slate-800/50 rounded-2xl p-8 border border-slate-700">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={leaderboardData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={150} tick={{fill: 'white', fontSize: 20}} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#1e293b', color: '#fff', border: 'none'}} />
                    <Bar dataKey="score" radius={[0, 10, 10, 0]}>
                      {leaderboardData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        );

      case GamePhase.FINAL_STATS:
        const sortedTeams = [...teams].sort((a,b) => b.score - a.score);
        const winningTeam = sortedTeams[0];
        const otherTeams = sortedTeams.slice(1);

        // Top 5 Players
        const topPlayers = [...players].sort((a,b) => b.score - a.score).slice(0, 5);

        // Fastest Buzzer Calculation
        let fastestPlayer: Player | null = null;
        let fastestTime = Infinity;
        players.forEach(p => {
            if (p.stats.bestReactionTime && p.stats.bestReactionTime < fastestTime) {
                fastestTime = p.stats.bestReactionTime;
                fastestPlayer = p;
            }
        });

        return (
          <div className="text-center w-full max-w-6xl mx-auto pb-10 overflow-y-auto h-full">
             <h1 className="text-5xl font-black text-white mb-8 tracking-widest uppercase opacity-50">Game Over</h1>
             
             {/* 1. Grand Champion Section */}
             <div className="flex justify-center mb-12">
                 <div className="bg-gradient-to-b from-yellow-500/20 to-slate-900 px-20 py-10 rounded-3xl border-t-8 border-yellow-400 transform scale-110 shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden">
                   <div className="absolute top-0 inset-x-0 h-px bg-yellow-300 opacity-50"></div>
                   <Trophy className="w-24 h-24 text-yellow-400 mx-auto mb-6 drop-shadow-lg" />
                   <div className="text-yellow-200 font-bold uppercase tracking-[0.2em] mb-2 text-xl">Grand Champion</div>
                   <div className="text-6xl font-black text-white mb-4">{winningTeam?.name || 'No Winner'}</div>
                   <div className="text-4xl text-yellow-400 font-bold font-mono">{winningTeam?.score || 0} PTS</div>
                </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 {/* 2. Remaining Teams Leaderboard */}
                 <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700">
                    <h3 className="text-white text-xl font-bold uppercase tracking-wider mb-6 flex items-center justify-center gap-2">
                         <Users className="text-slate-400" /> Team Standings
                    </h3>
                    <div className="space-y-3">
                        {otherTeams.length > 0 ? (
                            otherTeams.map((team, idx) => (
                                <div key={team.id} className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border-l-4 border-slate-600">
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl font-black text-slate-500">#{idx + 2}</span>
                                        <span className="text-xl font-bold text-white">{team.name}</span>
                                    </div>
                                    <span className="text-xl font-mono text-slate-300">{team.score}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-slate-500 italic p-4">No other teams participated.</div>
                        )}
                    </div>
                 </div>

                 {/* 3. Player Accolades */}
                 <div className="flex flex-col gap-6">
                     {/* Fastest Buzzer Card */}
                     <div className="bg-gradient-to-r from-blue-900/50 to-slate-800/50 rounded-2xl p-6 border border-blue-500/30 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="bg-blue-600 p-4 rounded-full text-white shadow-lg">
                                 <Zap size={32} />
                             </div>
                             <div className="text-left">
                                 <div className="text-blue-300 font-bold uppercase tracking-wider text-sm">Fastest Finger</div>
                                 <div className="text-2xl font-bold text-white">{(fastestPlayer as Player)?.name || '-'}</div>
                             </div>
                         </div>
                         <div className="text-4xl font-mono font-bold text-blue-400">
                             {fastestPlayer && fastestTime !== Infinity ? (fastestTime / 1000).toFixed(2) : '-'}s
                         </div>
                     </div>

                     {/* Top 5 Players Table */}
                     <div className="bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-700">
                        <div className="bg-slate-900/50 p-4 border-b border-slate-700">
                            <h3 className="text-white font-bold uppercase tracking-wider text-center">Top 5 Players</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead className="text-slate-500 text-xs uppercase bg-slate-900/30">
                                <tr>
                                    <th className="px-6 py-3">Rank</th>
                                    <th className="px-6 py-3">Player</th>
                                    <th className="px-6 py-3 text-right">Score</th>
                                    <th className="px-6 py-3 text-right">Acc</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700 text-white text-sm">
                                {topPlayers.map((p, i) => (
                                    <tr key={p.id} className="hover:bg-slate-700/30">
                                        <td className="px-6 py-4 font-mono text-slate-400">#{i + 1}</td>
                                        <td className="px-6 py-4 font-bold">{p.name}</td>
                                        <td className="px-6 py-4 text-right font-mono text-lg">{p.score}</td>
                                        <td className="px-6 py-4 text-right text-slate-400">
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

      default:
        return null;
    }
  };

  return (
    <div className="h-full bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
       {/* Ambient Background Elements */}
       <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[150px]" />
       </div>

       <div className="z-10 w-full h-full flex flex-col justify-center">
        {renderContent()}
       </div>
    </div>
  );
};