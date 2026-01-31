import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { GamePhase } from '../types';
import type { Player, Team, Question, BuzzerLog, GameState, Game } from '../types';

interface GameContextType {
  // State
  gameState: GameState;
  activeGameName: string; 
  joinUrl: string;
  apiKey: string;
  players: Player[];
  teams: Team[];
  questions: Question[];
  games: Game[];
  buzzQueue: BuzzerLog[];
  currentPlayerId: string | null;
  
  // Auth & Sync Status
  isHost: boolean;
  isAuthenticated: boolean;
  setIsHost: (isHost: boolean) => void;
  login: (password: string) => Promise<boolean>;
  updateSettings: (newApiKey: string, newJoinUrl: string, newPassword?: string) => Promise<void>;
  isSyncing: boolean;

  // Actions
  addPlayer: (name: string, teamName: string) => void;
  approvePlayer: (playerId: string) => void;
  removePlayer: (playerId: string) => void;
  startGame: () => void;
  startCountdown: () => void;
  openBuzzers: () => void;
  handleBuzz: (playerId: string) => void;
  resolveBuzz: (playerId: string, correct: boolean) => void;
  rectifyBuzz: (playerId: string, newStatus: 'CORRECT' | 'WRONG') => void;
  skipQuestion: () => void;
  nextPhase: () => void;
  setQuestions: (qs: Question[]) => void;
  setCurrentPlayer: (id: string) => void;
  playAudio: (url: string, start?: number, end?: number) => void;
  resetGame: () => void;
  
  // Library Actions
  createGame: (name: string) => void;
  updateGame: (gameId: string, updates: Partial<Game>) => void;
  deleteGame: (gameId: string) => void;
  loadGameToLive: (gameId: string) => void;
  setJoinUrl: (url: string) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

const API_URL = import.meta.env.DEV ? 'http://localhost/quiz/api.php' : './api.php'; 

// Initial Mock Data
const INITIAL_QUESTIONS: Question[] = [
  { id: '1', text: "What is the capital of France?", answer: "Paris", points: 10, category: "Geography" },
  { id: '2', text: "Which element has the chemical symbol 'O'?", answer: "Oxygen", points: 10, category: "Science" },
  { id: '3', text: "Who wrote 'Romeo and Juliet'?", answer: "William Shakespeare", points: 20, category: "Literature" }
];

const INITIAL_GAMES: Game[] = [
  {
    id: 'demo-1',
    name: 'General Knowledge Demo',
    description: 'A quick test of random facts.',
    createdAt: Date.now(),
    questions: INITIAL_QUESTIONS
  },
  {
    id: 'demo-2',
    name: 'Science & Nature',
    description: 'Physics, Biology, and Chemistry basics.',
    createdAt: Date.now(),
    questions: [
        { id: 's1', text: 'What is the speed of light?', answer: '299,792,458 m/s', points: 20, category: 'Physics' },
        { id: 's2', text: 'What is the powerhouse of the cell?', answer: 'Mitochondria', points: 10, category: 'Biology' },
        { id: 's3', text: 'What planet is known as the Red Planet?', answer: 'Mars', points: 10, category: 'Astronomy' }
    ]
  }
];

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isHost, setIsHost] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // --- GAME STATE ---
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY,
    currentQuestionIndex: -1,
    countdownValue: 3,
    buzzerOpenTimestamp: null
  });

  const [activeGameName, setActiveGameName] = useState<string>("General Knowledge Demo");
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestionsQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [buzzQueue, setBuzzQueue] = useState<BuzzerLog[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  const stateRef = useRef({ gameState, players, teams, questions, activeGameName, buzzQueue, joinUrl, apiKey });
  useEffect(() => {
    stateRef.current = { gameState, players, teams, questions, activeGameName, buzzQueue, joinUrl, apiKey };
  }, [gameState, players, teams, questions, activeGameName, buzzQueue, joinUrl, apiKey]);

  // Initial Fetch for Clients (Spectators/Players) to get Join URL without login
  useEffect(() => {
    const fetchPublicSettings = async () => {
        try {
            const response = await fetch(`${API_URL}?action=getPublicSettings`);
            const data = await response.json();
            if (data.joinUrl) setJoinUrl(data.joinUrl);
            else {
                // Default if empty
                if (typeof window !== 'undefined') {
                    setJoinUrl(`${window.location.origin}${window.location.pathname}#player`);
                }
            }
        } catch (e) {
            console.error("Failed to fetch public settings", e);
        }
    };
    if (!isHost) fetchPublicSettings();
  }, [isHost]);

  // --- AUTHENTICATION ---
  const login = async (password: string): Promise<boolean> => {
      try {
          const response = await fetch(`${API_URL}?action=login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
          });
          const data = await response.json();
          if (data.success) {
              setIsAuthenticated(true);
              setApiKey(data.apiKey || '');
              if (data.joinUrl) setJoinUrl(data.joinUrl);
              return true;
          }
          return false;
      } catch (e) {
          console.error(e);
          return false;
      }
  };

  const updateSettings = async (newApiKey: string, newJoinUrl: string, newPassword?: string) => {
      try {
          await fetch(`${API_URL}?action=updateSettings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ apiKey: newApiKey, joinUrl: newJoinUrl, newPassword })
          });
          setApiKey(newApiKey);
          setJoinUrl(newJoinUrl);
      } catch (e) {
          console.error("Failed to update settings", e);
      }
  };

  // --- SYNC ENGINE ---
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      setIsSyncing(true);
      try {
        if (isHost && isAuthenticated) {
          // --- HOST LOGIC ---
          const response = await fetch(`${API_URL}?action=getIntents`);
          const intents = await response.json();
          
          if (Array.isArray(intents) && intents.length > 0) {
             console.log("Processing Intents:", intents);
             intents.forEach((item: any) => {
                const { type, payload } = item;
                
                if (type === 'JOIN') {
                   const { name, teamName, tempId } = payload;
                   const currentTeams = stateRef.current.teams;
                   const existingTeam = currentTeams.find(t => t.name.toLowerCase() === teamName.toLowerCase());
                   
                   let teamId = existingTeam?.id;
                   if (!existingTeam) {
                      const newTeam: Team = { id: crypto.randomUUID(), name: teamName, score: 0 };
                      setTeams(prev => [...prev, newTeam]);
                      teamId = newTeam.id;
                   }
                   
                   const exists = stateRef.current.players.some(p => p.name === name && p.teamId === teamId);
                   if (!exists && teamId) {
                      const newPlayer: Player = {
                        id: tempId || crypto.randomUUID(),
                        name,
                        teamId,
                        score: 0,
                        isApproved: true,
                        stats: { correctAnswers: 0, totalBuzzes: 0, bestReactionTime: null }
                      };
                      setPlayers(prev => [...prev, newPlayer]);
                   }
                }
                else if (type === 'BUZZ') {
                    const { playerId } = payload;
                    const currentState = stateRef.current.gameState;
                    const currentQueue = stateRef.current.buzzQueue;
                    
                    if (currentState.phase === GamePhase.BUZZER_OPEN && !currentQueue.find(b => b.playerId === playerId)) {
                        const newBuzz: BuzzerLog = {
                            playerId,
                            timestamp: Date.now(),
                            order: currentQueue.length + 1,
                            status: 'PENDING'
                        };
                        setBuzzQueue(prev => {
                            const updated = [...prev, newBuzz];
                             if (updated.length === 1) { 
                                 setGameState(gs => ({ ...gs, phase: GamePhase.ADJUDICATION }));
                             }
                            return updated;
                        });
                    }
                }
                else if (type === 'LEAVE') {
                   const { playerId } = payload;
                   setPlayers(prev => prev.filter(p => p.id !== playerId));
                }
             });
          }

          const fullState = {
              gameState: stateRef.current.gameState,
              players: stateRef.current.players,
              teams: stateRef.current.teams,
              questions: stateRef.current.questions,
              activeGameName: stateRef.current.activeGameName,
              buzzQueue: stateRef.current.buzzQueue,
              // Note: We don't push settings (joinUrl/apiKey) to game_state to avoid leaking credentials to clients polling getState
          };

          await fetch(`${API_URL}?action=pushState`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fullState)
          });

        } else {
          // --- CLIENT LOGIC ---
          const response = await fetch(`${API_URL}?action=getState`);
          const remoteState = await response.json();
          
          if (remoteState && remoteState.gameState) {
              setGameState(remoteState.gameState);
              setPlayers(remoteState.players || []);
              setTeams(remoteState.teams || []);
              setQuestionsQuestions(remoteState.questions || []);
              setActiveGameName(remoteState.activeGameName || "");
              setBuzzQueue(remoteState.buzzQueue || []);
              // Clients don't receive joinUrl from game_state loop, they get it from getPublicSettings
          }
        }
      } catch (e) {
        console.error("Sync Error:", e);
      } finally {
        setIsSyncing(false);
      }
    }, 500); 

    return () => clearInterval(syncInterval);
  }, [isHost, isAuthenticated]);

  // --- ACTIONS ---

  const sendIntent = async (type: string, payload: any) => {
      try {
          await fetch(`${API_URL}?action=pushIntent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type, payload })
          });
      } catch (e) {
          console.error("Failed to send intent", e);
      }
  };

  const addPlayer = (name: string, teamName: string) => {
    const tempId = crypto.randomUUID();
    setCurrentPlayerId(tempId);
    sendIntent('JOIN', { name, teamName, tempId });
  };

  const removePlayer = (playerId: string) => {
    if (isHost) {
        setPlayers(prev => prev.filter(p => p.id !== playerId));
    } else {
        sendIntent('LEAVE', { playerId });
        if (currentPlayerId === playerId) setCurrentPlayerId(null);
    }
  };

  const approvePlayer = (playerId: string) => {
    if (!isHost) return;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isApproved: true } : p));
  };

  const handleBuzz = (playerId: string) => {
    if (isHost) {
        if (gameState.phase !== GamePhase.BUZZER_OPEN) return;
        if (buzzQueue.find(b => b.playerId === playerId)) return;
        const newBuzz: BuzzerLog = {
          playerId,
          timestamp: Date.now(),
          order: buzzQueue.length + 1,
          status: 'PENDING'
        };
        setBuzzQueue(prev => [...prev, newBuzz]);
        if (buzzQueue.length === 0) {
            setGameState(prev => ({ ...prev, phase: GamePhase.ADJUDICATION }));
        }
    } else {
        sendIntent('BUZZ', { playerId });
    }
  };
  
  const startGame = () => {
    if (!isHost) return;
    setGameState({
        phase: GamePhase.COUNTDOWN,
        currentQuestionIndex: 0,
        countdownValue: 3,
        buzzerOpenTimestamp: null
    });
    setBuzzQueue([]);
  };

  const startCountdown = () => {
    if (!isHost) return;
    let nextIndex = gameState.currentQuestionIndex;
    if (gameState.phase === GamePhase.LEADERBOARD || gameState.phase === GamePhase.LOBBY) {
        nextIndex = gameState.currentQuestionIndex + 1;
    }
    if (nextIndex >= questions.length) {
        setGameState(prev => ({ ...prev, phase: GamePhase.FINAL_STATS }));
        return;
    }
    setGameState({
        phase: GamePhase.COUNTDOWN,
        currentQuestionIndex: nextIndex,
        countdownValue: 3,
        buzzerOpenTimestamp: null
    });
    setBuzzQueue([]);
  };

  useEffect(() => {
    if (!isHost) return;
    let timer: ReturnType<typeof setTimeout>;
    if (gameState.phase === GamePhase.COUNTDOWN) {
      if (gameState.countdownValue > 0) {
        timer = setTimeout(() => {
          setGameState(prev => ({ ...prev, countdownValue: prev.countdownValue - 1 }));
        }, 1000);
      } else {
        setGameState(prev => ({ ...prev, phase: GamePhase.QUESTION_DISPLAY }));
      }
    }
    return () => clearTimeout(timer);
  }, [gameState.phase, gameState.countdownValue, isHost]);

  const openBuzzers = () => {
    if (!isHost) return;
    setGameState(prev => ({ ...prev, phase: GamePhase.BUZZER_OPEN, buzzerOpenTimestamp: Date.now() }));
  };

  const resolveBuzz = (playerId: string, correct: boolean) => {
    if (!isHost) return;
    const currentQ = questions[gameState.currentQuestionIndex];
    const player = players.find(p => p.id === playerId);
    
    setPlayers(prev => prev.map(p => {
        if (p.id !== playerId) return p;
        let newStats = { ...p.stats };
        newStats.totalBuzzes += 1;
        if (gameState.buzzerOpenTimestamp) {
            const reactionTime = Date.now() - gameState.buzzerOpenTimestamp;
            if (newStats.bestReactionTime === null || reactionTime < newStats.bestReactionTime) {
                newStats.bestReactionTime = reactionTime;
            }
        }
        if (correct) {
            newStats.correctAnswers += 1;
            return { ...p, score: p.score + currentQ.points, stats: newStats };
        }
        return { ...p, stats: newStats };
    }));

    if (correct) {
       setBuzzQueue(prev => prev.map(b => b.playerId === playerId ? { ...b, status: 'CORRECT' } : b));
       if (player && player.teamId) {
          setTeams(prev => prev.map(t => t.id === player.teamId ? { ...t, score: t.score + currentQ.points } : t));
       }
       setGameState(prev => ({ ...prev, phase: GamePhase.ANSWER_REVEAL }));
    } else {
        setBuzzQueue(prev => prev.map(b => b.playerId === playerId ? { ...b, status: 'WRONG' } : b));
        const remaining = buzzQueue.filter(b => b.playerId !== playerId && b.status === 'PENDING');
        if (remaining.length === 0) {
            setGameState(prev => ({ ...prev, phase: GamePhase.BUZZER_OPEN }));
        }
    }
  };

  const rectifyBuzz = (playerId: string, newStatus: 'CORRECT' | 'WRONG') => {
      if (!isHost) return;
      const currentQ = questions[gameState.currentQuestionIndex];
      const player = players.find(p => p.id === playerId);
      if (!player || !player.teamId) return;

      const oldBuzz = buzzQueue.find(b => b.playerId === playerId);
      if (!oldBuzz) return;

      setBuzzQueue(prev => prev.map(b => b.playerId === playerId ? { ...b, status: newStatus } : b));

      const points = currentQ.points;
      
      if (newStatus === 'CORRECT' && oldBuzz.status !== 'CORRECT') {
          setTeams(prev => prev.map(t => t.id === player.teamId ? { ...t, score: t.score + points } : t));
          setPlayers(prev => prev.map(p => p.id === playerId ? { 
              ...p, score: p.score + points, stats: { ...p.stats, correctAnswers: p.stats.correctAnswers + 1 }
          } : p));
          setGameState(prev => ({ ...prev, phase: GamePhase.ANSWER_REVEAL }));
      } 
      else if (newStatus === 'WRONG' && oldBuzz.status === 'CORRECT') {
          setTeams(prev => prev.map(t => t.id === player.teamId ? { ...t, score: t.score - points } : t));
          setPlayers(prev => prev.map(p => p.id === playerId ? { 
              ...p, score: p.score - points, stats: { ...p.stats, correctAnswers: Math.max(0, p.stats.correctAnswers - 1) }
          } : p));
          const othersPending = buzzQueue.some(b => b.playerId !== playerId && b.status === 'PENDING');
          setGameState(prev => ({ 
              ...prev, phase: othersPending || buzzQueue.length === 0 ? GamePhase.BUZZER_OPEN : GamePhase.ADJUDICATION 
          }));
      }
  };

  const skipQuestion = () => {
    if (!isHost) return;
    setGameState(prev => ({ ...prev, phase: GamePhase.ANSWER_REVEAL }));
    setBuzzQueue([]);
  };

  const nextPhase = () => {
      if (!isHost) return;
      if (gameState.phase === GamePhase.ANSWER_REVEAL) {
          setGameState(prev => ({ ...prev, phase: GamePhase.LEADERBOARD }));
      }
  };

  const playAudio = (url: string, start: number = 0, end?: number) => {
      const audio = new Audio(url);
      audio.currentTime = start;
      audio.play();
      if (end) {
          setTimeout(() => {
              audio.pause();
          }, (end - start) * 1000);
      }
  };

  const resetGame = () => {
    if (!isHost) return;
    setGameState({
        phase: GamePhase.LOBBY,
        currentQuestionIndex: -1,
        countdownValue: 3,
        buzzerOpenTimestamp: null
    });
    setPlayers(prev => prev.map(p => ({
        ...p, score: 0, stats: { correctAnswers: 0, totalBuzzes: 0, bestReactionTime: null }
    })));
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    setBuzzQueue([]);
  };

  const createGame = (name: string) => {
      if (!isHost) return;
      const newGame: Game = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          questions: []
      };
      setGames(prev => [...prev, newGame]);
  };

  const updateGame = (gameId: string, updates: Partial<Game>) => {
      if (!isHost) return;
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...updates } : g));
  };

  const deleteGame = (gameId: string) => {
      if (!isHost) return;
      setGames(prev => prev.filter(g => g.id !== gameId));
  };

  const loadGameToLive = (gameId: string) => {
      if (!isHost) return;
      const game = games.find(g => g.id === gameId);
      if (game) {
          setQuestionsQuestions([...game.questions]);
          setActiveGameName(game.name);
          setGameState({
              phase: GamePhase.LOBBY,
              currentQuestionIndex: -1,
              countdownValue: 3,
              buzzerOpenTimestamp: null
          });
          setBuzzQueue([]);
      }
  };

  return (
    <GameContext.Provider value={{
      gameState,
      activeGameName,
      joinUrl,
      apiKey,
      players,
      teams,
      questions,
      games,
      buzzQueue,
      currentPlayerId,
      isHost,
      isAuthenticated,
      setIsHost,
      login,
      updateSettings,
      isSyncing,
      addPlayer,
      approvePlayer,
      removePlayer,
      startGame,
      startCountdown,
      openBuzzers,
      handleBuzz,
      resolveBuzz,
      rectifyBuzz,
      skipQuestion,
      nextPhase,
      setQuestions: setQuestionsQuestions,
      setCurrentPlayer: setCurrentPlayerId,
      playAudio,
      resetGame,
      createGame,
      updateGame,
      deleteGame,
      loadGameToLive,
      setJoinUrl
    }}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
};