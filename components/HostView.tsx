import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GamePhase, Game, Question } from '../types';
import { Soundboard } from './Soundboard';
import { Play, SkipForward, CheckCircle, XCircle, Users, Library, Sparkles, Plus, Trash2, Edit, Save, ArrowLeft, Upload, RefreshCw, Image as ImageIcon, List, Trophy, RotateCcw } from 'lucide-react';
import { generateQuestions } from '../services/geminiService';

export const HostView: React.FC = () => {
  const { 
    gameState, activeGameName, players, teams, buzzQueue, questions, games,
    approvePlayer, startGame, startCountdown, openBuzzers, 
    resolveBuzz, rectifyBuzz, skipQuestion, nextPhase, resetGame,
    createGame, updateGame, deleteGame, loadGameToLive
  } = useGame();

  const [activeTab, setActiveTab] = useState<'GAME' | 'PLAYERS' | 'LIBRARY'>('GAME');
  
  // Library State
  const [editingGameId, setEditingGameId] = useState<string | null>(null);
  const [newGameName, setNewGameName] = useState('');
  
  // Editor State
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [manualQ, setManualQ] = useState({ text: '', answer: '', points: 10, category: '', mediaUrl: '' });

  const currentQ = questions[gameState.currentQuestionIndex];
  const isPreGame = gameState.currentQuestionIndex === -1;
  const isGameOver = gameState.currentQuestionIndex >= questions.length;
  // Correctly identify if we have finished all questions and are just lingering on the last leaderboard
  const isLastQuestionPhase = gameState.currentQuestionIndex === questions.length - 1;

  // --- Handlers ---

  const handleCreateGame = () => {
      if (newGameName.trim()) {
          createGame(newGameName);
          setNewGameName('');
      }
  };

  const handleAiGenerate = async (gameId: string) => {
    if (!aiTopic) return;
    setIsGenerating(true);
    const newQuestions = await generateQuestions(aiTopic);
    if (newQuestions.length > 0) {
      const game = games.find(g => g.id === gameId);
      if (game) {
          updateGame(gameId, { questions: [...game.questions, ...newQuestions] });
      }
      alert(`Added ${newQuestions.length} questions!`);
      setAiTopic('');
    } else {
      alert("Failed to generate. Check API Key or try again.");
    }
    setIsGenerating(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setManualQ(prev => ({ ...prev, mediaUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddManualQuestion = (gameId: string) => {
      if (!manualQ.text || !manualQ.answer) return;
      const game = games.find(g => g.id === gameId);
      if (game) {
          // Detect Media Type
          let mediaType: 'image' | 'video' | undefined = undefined;
          if (manualQ.mediaUrl) {
              if (manualQ.mediaUrl.startsWith('data:image') || manualQ.mediaUrl.match(/\.(jpeg|jpg|gif|png)$/i)) {
                  mediaType = 'image';
              } else if (manualQ.mediaUrl.includes('youtube') || manualQ.mediaUrl.includes('youtu.be')) {
                  mediaType = 'video';
              } else {
                  // Fallback assumption for uploads vs links
                  mediaType = 'image';
              }
          }

          const newQuestion: Question = {
              id: crypto.randomUUID(),
              text: manualQ.text,
              answer: manualQ.answer,
              points: Number(manualQ.points),
              category: manualQ.category || 'General',
              mediaUrl: manualQ.mediaUrl,
              mediaType
          };
          updateGame(gameId, { questions: [...game.questions, newQuestion] });
          setManualQ({ text: '', answer: '', points: 10, category: '', mediaUrl: '' });
          setIsAddingQuestion(false);
      }
  };

  const handleDeleteQuestion = (gameId: string, qId: string) => {
      const game = games.find(g => g.id === gameId);
      if (game) {
          updateGame(gameId, { questions: game.questions.filter(q => q.id !== qId) });
      }
  };

  const handleLoadGame = (gameId: string) => {
      // Removed confirm() as it can block execution or be annoying
      loadGameToLive(gameId);
      setActiveTab('GAME');
  };

  // Find the winner of the current round (if any)
  const currentWinnerBuzz = buzzQueue.find(b => b.status === 'CORRECT');
  const currentWinner = currentWinnerBuzz ? players.find(p => p.id === currentWinnerBuzz.playerId) : null;

  return (
    <div className="h-full bg-slate-100 flex flex-col overflow-hidden text-slate-800">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex justify-between items-center shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
                <div className="bg-indigo-600 text-white font-black px-2 py-1 rounded text-xl">QM</div>
                <h1 className="font-bold text-lg text-slate-700">Host Dashboard</h1>
           </div>
           {/* Active Game Display */}
           <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full shadow-sm">
                <Library size={16} className="text-indigo-600" />
                <span className="text-xs text-indigo-400 font-bold uppercase">ACTIVE GAME:</span>
                <span className="text-sm font-bold text-indigo-900">{activeGameName}</span>
           </div>
        </div>
        
        <div className="flex gap-4 items-center">
            {isGameOver && (
                <div className="bg-red-600 text-white px-3 py-1 rounded font-bold animate-pulse">
                    GAME OVER
                </div>
            )}
            <div className="px-3 py-1 bg-slate-100 rounded text-xs font-mono border border-slate-300">
                STATUS: <span className="font-bold text-indigo-600">{gameState.phase}</span>
            </div>
            <button 
                onClick={resetGame} 
                className="flex items-center gap-1 text-red-600 text-sm hover:underline hover:bg-red-50 px-2 py-1 rounded transition-colors"
                title="Resets scores and game phase, keeps players"
            >
                <RotateCcw size={14} /> Restart Game
            </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Navigation & Soundboard */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col overflow-y-auto">
           <nav className="p-4 space-y-2">
              <button 
                onClick={() => setActiveTab('GAME')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === 'GAME' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
              >
                 <Play className="w-4 h-4" /> Game Control
              </button>
              <button 
                onClick={() => setActiveTab('PLAYERS')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === 'PLAYERS' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
              >
                 <Users className="w-4 h-4" /> Players ({players.length})
              </button>
              <button 
                onClick={() => { setActiveTab('LIBRARY'); setEditingGameId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded transition-colors ${activeTab === 'LIBRARY' ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}
              >
                 <Library className="w-4 h-4" /> Game Library
              </button>
           </nav>
           
           <div className="mt-auto p-4 border-t border-slate-800">
             <Soundboard />
           </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
            
            {/* GAME CONTROL TAB */}
            {activeTab === 'GAME' && (
              <div className="max-w-4xl mx-auto">
                 {/* LAST QUESTION WARNING */}
                 {isLastQuestionPhase && !isGameOver && (
                     <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4 mb-6 font-bold shadow-sm">
                         ⚠️ THIS IS THE LAST QUESTION!
                     </div>
                 )}

                 {/* Current Question Card */}
                 <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            {isPreGame 
                            ? 'Ready to Start' 
                            : isGameOver ? 'Game Finished' : `Current Question (${gameState.currentQuestionIndex + 1}/${questions.length})`
                            }
                        </h2>
                        {isPreGame && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold">
                                {questions.length} Questions Queued
                            </span>
                        )}
                    </div>
                    
                    {currentQ ? (
                        <>
                            <div className="text-2xl font-bold mb-4">{currentQ.text}</div>
                            {currentQ.mediaUrl && (
                                <div className="mb-4">
                                    <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 flex w-fit items-center gap-1">
                                        <ImageIcon size={12}/> Media Attached
                                    </span>
                                    <div className="text-xs text-blue-600 truncate mt-1 max-w-md">{currentQ.mediaUrl.substring(0, 50)}...</div>
                                    {currentQ.mediaType === 'image' && (
                                        <img src={currentQ.mediaUrl} alt="Preview" className="h-20 w-auto mt-2 rounded border border-slate-200" />
                                    )}
                                </div>
                            )}
                            <div className="bg-green-50 px-4 py-3 rounded border border-green-200 text-green-800 font-mono mb-6">
                                ANSWER: {currentQ.answer}
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-400 italic mb-6">
                           {isPreGame ? "Game initialized. Waiting to start first question." : "Game Over. Check the final results."}
                        </div>
                    )}

                    {/* Controls based on Phase */}
                    <div className="flex flex-wrap gap-4 border-t border-slate-100 pt-6">
                        {gameState.phase === GamePhase.LOBBY && (
                            <button onClick={startGame} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all">
                                START GAME
                            </button>
                        )}

                        {/* Button logic for moving to next question OR finishing game */}
                        {(gameState.phase === GamePhase.LEADERBOARD || gameState.phase === GamePhase.LOBBY) && !isGameOver && (
                            isLastQuestionPhase && gameState.phase === GamePhase.LEADERBOARD ? (
                                <button onClick={startCountdown} className="bg-indigo-800 hover:bg-indigo-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 animate-pulse">
                                    <Trophy className="w-4 h-4" /> VIEW FINAL PODIUM
                                </button>
                            ) : (
                                <button onClick={startCountdown} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2">
                                    <Play className="w-4 h-4" /> Start Question {gameState.currentQuestionIndex + 2}
                                </button>
                            )
                        )}

                        {gameState.phase === GamePhase.QUESTION_DISPLAY && (
                            <button onClick={openBuzzers} className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg animate-pulse">
                                OPEN BUZZERS
                            </button>
                        )}

                        {/* Skip/Reveal Button */}
                        {(gameState.phase === GamePhase.QUESTION_DISPLAY || gameState.phase === GamePhase.BUZZER_OPEN || gameState.phase === GamePhase.ADJUDICATION) && (
                            <button onClick={skipQuestion} className="bg-slate-500 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 ml-auto">
                                <SkipForward className="w-4 h-4" /> Reveal Answer
                            </button>
                        )}

                        {gameState.phase === GamePhase.ANSWER_REVEAL && (
                            <div className="flex w-full justify-between items-center">
                                {/* UNDO BUTTON */}
                                {currentWinner && (
                                    <button 
                                        onClick={() => rectifyBuzz(currentWinner.id, 'WRONG')}
                                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 px-4 py-3 rounded-lg font-bold border border-amber-300 flex items-center gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" /> 
                                        Undo Correct ({currentWinner.name})
                                    </button>
                                )}
                                
                                <button onClick={nextPhase} className="bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 ml-auto">
                                    <SkipForward className="w-4 h-4" /> 
                                    {isLastQuestionPhase ? 'Finish Game' : 'Show Scores'}
                                </button>
                            </div>
                        )}
                    </div>
                 </div>

                 {/* QUESTION QUEUE PREVIEW (Added for better Host visibility) */}
                 {isPreGame && questions.length > 0 && (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
                        <div className="flex items-center gap-2 mb-3 text-slate-500 border-b border-slate-100 pb-2">
                            <List size={16} />
                            <h3 className="text-xs font-bold uppercase tracking-wider">Loaded Queue</h3>
                        </div>
                        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
                            {questions.map((q, idx) => (
                                <li key={q.id} className="text-sm flex items-start gap-2 text-slate-600">
                                    <span className="font-mono font-bold text-slate-300 w-5">{idx+1}.</span>
                                    <span className="truncate">{q.text}</span>
                                </li>
                            ))}
                        </ul>
                     </div>
                 )}

                 {/* Buzzer Queue Adjudication */}
                 {buzzQueue.length > 0 && (
                     <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700">Buzzer Queue</h3>
                            <span className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-600">{buzzQueue.length} Buzzes</span>
                        </div>
                        <div className="divide-y divide-slate-100">
                            {buzzQueue.map((buzz, idx) => {
                                const player = players.find(p => p.id === buzz.playerId);
                                const isCurrent = idx === 0 && buzz.status === 'PENDING';
                                
                                return (
                                    <div key={buzz.playerId} className={`px-6 py-4 flex items-center justify-between ${isCurrent ? 'bg-yellow-50' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="font-mono font-bold text-slate-400">#{idx + 1}</div>
                                            <div>
                                                <div className="font-bold text-slate-800">{player?.name}</div>
                                                <div className="text-xs text-slate-500">{(buzz.timestamp % 10000)}ms</div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            {buzz.status === 'PENDING' ? (
                                                isCurrent ? (
                                                    <>
                                                        <button 
                                                            onClick={() => resolveBuzz(buzz.playerId, true)}
                                                            className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 font-bold border border-green-300"
                                                        >
                                                            <CheckCircle className="w-4 h-4" /> CORRECT
                                                        </button>
                                                        <button 
                                                            onClick={() => resolveBuzz(buzz.playerId, false)}
                                                            className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 font-bold border border-red-300"
                                                        >
                                                            <XCircle className="w-4 h-4" /> WRONG
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-bold">WAITING</span>
                                                )
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded ${buzz.status === 'CORRECT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                        {buzz.status}
                                                    </span>
                                                    {/* Correction Button for Wrong Answers */}
                                                    {buzz.status === 'WRONG' && (
                                                        <button 
                                                            onClick={() => rectifyBuzz(buzz.playerId, 'CORRECT')}
                                                            title="Mark as Correct"
                                                            className="p-1 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <RefreshCw className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                     </div>
                 )}
              </div>
            )}

            {/* PLAYERS TAB */}
            {activeTab === 'PLAYERS' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Team</th>
                                <th className="px-6 py-3">Score</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-900">
                            {players.map(p => (
                                <tr key={p.id}>
                                    <td className="px-6 py-4 font-bold">{p.name}</td>
                                    <td className="px-6 py-4 text-slate-600">{teams.find(t => t.id === p.teamId)?.name || '-'}</td>
                                    <td className="px-6 py-4 font-mono">{p.score}</td>
                                    <td className="px-6 py-4">
                                        {p.isApproved ? (
                                            <span className="text-green-600 text-xs font-bold bg-green-100 px-2 py-1 rounded">JOINED</span>
                                        ) : (
                                            <button onClick={() => approvePlayer(p.id)} className="text-blue-600 text-xs font-bold bg-blue-100 px-2 py-1 rounded hover:bg-blue-200">APPROVE</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* GAME LIBRARY TAB */}
            {activeTab === 'LIBRARY' && (
                <div className="space-y-6">
                    {!editingGameId ? (
                        /* MODE: LIST GAMES */
                        <>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-slate-800">Your Games</h2>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newGameName}
                                        onChange={e => setNewGameName(e.target.value)}
                                        placeholder="New Game Name..." 
                                        className="px-4 py-2 rounded border border-slate-300 text-sm text-black bg-white"
                                    />
                                    <button 
                                        onClick={handleCreateGame}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-indigo-700"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {games.map(game => (
                                    <div key={game.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="h-12 w-12 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                                                <Library className="w-6 h-6" />
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => setEditingGameId(game.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => deleteGame(game.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 text-slate-900">{game.name}</h3>
                                        <p className="text-sm text-slate-500 mb-4">{game.questions.length} Questions</p>
                                        <button 
                                            onClick={() => handleLoadGame(game.id)}
                                            className="w-full py-2 bg-green-50 text-green-700 border border-green-200 rounded font-bold text-sm hover:bg-green-100 flex items-center justify-center gap-2"
                                        >
                                            <Upload className="w-4 h-4" /> LOAD TO LIVE
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        /* MODE: EDIT GAME */
                        (() => {
                            const game = games.find(g => g.id === editingGameId);
                            if (!game) return null;

                            return (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 mb-6">
                                        <button onClick={() => setEditingGameId(null)} className="p-2 hover:bg-slate-200 rounded-full">
                                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                                        </button>
                                        <input 
                                            value={game.name} 
                                            onChange={e => updateGame(game.id, { name: e.target.value })}
                                            className="text-2xl font-bold bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-600 focus:outline-none px-2 py-1 text-slate-900"
                                        />
                                        <span className="ml-auto text-sm text-slate-500">{game.questions.length} Questions</span>
                                    </div>

                                    {/* AI Generator for this game */}
                                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Sparkles className="w-5 h-5" />
                                            <h3 className="font-bold text-lg">AI Question Generator</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <input 
                                                type="text" 
                                                value={aiTopic}
                                                onChange={(e) => setAiTopic(e.target.value)}
                                                placeholder="e.g. 80s Movies, World Capitals, Pokemon" 
                                                className="flex-1 px-4 py-2 rounded text-slate-900 bg-white outline-none"
                                            />
                                            <button 
                                                onClick={() => handleAiGenerate(game.id)}
                                                disabled={isGenerating}
                                                className="bg-white text-purple-700 px-4 py-2 rounded font-bold hover:bg-purple-50 disabled:opacity-50"
                                            >
                                                {isGenerating ? 'Dreaming...' : 'Generate'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                                        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                            <h3 className="font-bold text-slate-700">Questions</h3>
                                            <button 
                                                onClick={() => setIsAddingQuestion(!isAddingQuestion)}
                                                className="flex items-center gap-1 text-sm text-blue-600 font-bold hover:bg-blue-50 px-3 py-2 rounded"
                                            >
                                                <Plus className="w-4 h-4" /> Add Manual
                                            </button>
                                        </div>
                                        
                                        {/* Add Manual Form */}
                                        {isAddingQuestion && (
                                            <div className="p-4 bg-slate-50 border-b border-slate-200">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs font-bold text-slate-500">Question</label>
                                                        <input 
                                                            placeholder="e.g. What is 2+2?" 
                                                            className="p-2 border rounded text-black bg-white"
                                                            value={manualQ.text}
                                                            onChange={e => setManualQ({...manualQ, text: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs font-bold text-slate-500">Answer</label>
                                                        <input 
                                                            placeholder="e.g. 4" 
                                                            className="p-2 border rounded text-black bg-white"
                                                            value={manualQ.answer}
                                                            onChange={e => setManualQ({...manualQ, answer: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs font-bold text-slate-500">Points</label>
                                                        <input 
                                                            type="number"
                                                            placeholder="10" 
                                                            className="p-2 border rounded text-black bg-white"
                                                            value={manualQ.points}
                                                            onChange={e => setManualQ({...manualQ, points: Number(e.target.value)})}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <label className="text-xs font-bold text-slate-500">Category</label>
                                                        <input 
                                                            placeholder="e.g. Math" 
                                                            className="p-2 border rounded text-black bg-white"
                                                            value={manualQ.category}
                                                            onChange={e => setManualQ({...manualQ, category: e.target.value})}
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-1 md:col-span-2">
                                                        <label className="text-xs font-bold text-slate-500">Media</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text"
                                                                placeholder="YouTube Link or Image URL" 
                                                                className="flex-1 p-2 border rounded text-black bg-white"
                                                                value={manualQ.mediaUrl}
                                                                onChange={e => setManualQ({...manualQ, mediaUrl: e.target.value})}
                                                            />
                                                            <div className="relative">
                                                                <input 
                                                                    type="file" 
                                                                    accept="image/*"
                                                                    onChange={handleImageUpload}
                                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                />
                                                                <button className="h-full px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded flex items-center gap-2">
                                                                    <Upload size={16} /> Upload Img
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400">Supports YouTube links or Image Uploads</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setIsAddingQuestion(false)} className="px-3 py-1 text-slate-500 text-sm">Cancel</button>
                                                    <button 
                                                        onClick={() => handleAddManualQuestion(game.id)}
                                                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-bold"
                                                    >
                                                        Save Question
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        <ul className="divide-y divide-slate-100">
                                            {game.questions.length === 0 && (
                                                <li className="p-8 text-center text-slate-400">No questions yet. Add some manually or use AI!</li>
                                            )}
                                            {game.questions.map((q, i) => (
                                                <li key={q.id} className="p-4 hover:bg-slate-50 flex justify-between items-center group">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-bold text-slate-400 text-xs">Q{i+1}</span>
                                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500">{q.category}</span>
                                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono">{q.points}pts</span>
                                                        </div>
                                                        <div className="font-medium text-slate-800 flex items-center gap-2">
                                                            {q.mediaUrl && <ImageIcon size={14} className="text-indigo-500" />}
                                                            {q.text}
                                                        </div>
                                                        <div className="text-sm text-green-700">A: {q.answer}</div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleDeleteQuestion(game.id, q.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })()
                    )}
                </div>
            )}

        </main>
      </div>
    </div>
  );
};