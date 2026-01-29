import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { GamePhase, Player, Team, Question, BuzzerLog, GameState, Game } from '../types';

interface GameContextType {
  // State
  gameState: GameState;
  activeGameName: string; // New: Track which game is loaded
  players: Player[];
  teams: Team[];
  questions: Question[]; // The ACTIVE questions currently being played
  games: Game[]; // The LIBRARY of saved games
  buzzQueue: BuzzerLog[];
  currentPlayerId: string | null;
  
  // Actions
  addPlayer: (name: string, teamName: string) => void;
  approvePlayer: (playerId: string) => void;
  removePlayer: (playerId: string) => void; // New action
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
}

const GameContext = createContext<GameContextType | undefined>(undefined);

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
  const [gameState, setGameState] = useState<GameState>({
    phase: GamePhase.LOBBY,
    currentQuestionIndex: -1,
    countdownValue: 3,
    buzzerOpenTimestamp: null
  });

  const [activeGameName, setActiveGameName] = useState<string>("General Knowledge Demo");
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [questions, setQuestionsQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [games, setGames] = useState<Game[]>(INITIAL_GAMES);
  const [buzzQueue, setBuzzQueue] = useState<BuzzerLog[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);

  // Helper: Find or create team
  const getOrCreateTeam = (name: string) => {
    const existing = teams.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;
    const newTeam: Team = { id: crypto.randomUUID(), name, score: 0 };
    setTeams(prev => [...prev, newTeam]);
    return newTeam;
  };

  const addPlayer = (name: string, teamName: string) => {
    const team = getOrCreateTeam(teamName);
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name,
      teamId: team.id,
      score: 0,
      isApproved: false, // Requires admin approval
      stats: {
        correctAnswers: 0,
        totalBuzzes: 0,
        bestReactionTime: null
      }
    };
    setPlayers(prev => [...prev, newPlayer]);
    if (!currentPlayerId) setCurrentPlayerId(newPlayer.id);
  };

  const removePlayer = (playerId: string) => {
    setPlayers(prev => prev.filter(p => p.id !== playerId));
    if (currentPlayerId === playerId) {
        setCurrentPlayerId(null);
    }
  };

  const approvePlayer = (playerId: string) => {
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, isApproved: true } : p));
  };

  const startGame = () => {
    // Directly start Q1 Countdown, skipping initial Leaderboard
    setGameState({
        phase: GamePhase.COUNTDOWN,
        currentQuestionIndex: 0,
        countdownValue: 3,
        buzzerOpenTimestamp: null
    });
    setBuzzQueue([]);
  };

  const startCountdown = () => {
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
  }, [gameState.phase, gameState.countdownValue]);

  const openBuzzers = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.BUZZER_OPEN, buzzerOpenTimestamp: Date.now() }));
  };

  const handleBuzz = (playerId: string) => {
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
  };

  const resolveBuzz = (playerId: string, correct: boolean) => {
    const currentQ = questions[gameState.currentQuestionIndex];
    const player = players.find(p => p.id === playerId);
    
    // Update Stats logic
    setPlayers(prev => prev.map(p => {
        if (p.id !== playerId) return p;
        
        let newStats = { ...p.stats };
        // Increment attempts (total buzzes)
        newStats.totalBuzzes += 1;

        // Calculate reaction time if this buzz was the first one processed
        // We only really care about updating reaction time if it was a successful/valid buzz attempt
        if (gameState.buzzerOpenTimestamp) {
            const reactionTime = Date.now() - gameState.buzzerOpenTimestamp;
            if (newStats.bestReactionTime === null || reactionTime < newStats.bestReactionTime) {
                newStats.bestReactionTime = reactionTime;
            }
        }

        if (correct) {
            newStats.correctAnswers += 1;
            return { 
                ...p, 
                score: p.score + currentQ.points,
                stats: newStats
            };
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
      const currentQ = questions[gameState.currentQuestionIndex];
      const player = players.find(p => p.id === playerId);
      if (!player || !player.teamId) return;

      const oldBuzz = buzzQueue.find(b => b.playerId === playerId);
      if (!oldBuzz) return;

      setBuzzQueue(prev => prev.map(b => b.playerId === playerId ? { ...b, status: newStatus } : b));

      const points = currentQ.points;
      
      if (newStatus === 'CORRECT' && oldBuzz.status !== 'CORRECT') {
          setTeams(prev => prev.map(t => t.id === player.teamId ? { ...t, score: t.score + points } : t));
          // Also correct stat if rectifying
          setPlayers(prev => prev.map(p => p.id === playerId ? { 
              ...p, 
              score: p.score + points,
              stats: { ...p.stats, correctAnswers: p.stats.correctAnswers + 1 }
          } : p));

          setGameState(prev => ({ ...prev, phase: GamePhase.ANSWER_REVEAL }));
      } 
      else if (newStatus === 'WRONG' && oldBuzz.status === 'CORRECT') {
          setTeams(prev => prev.map(t => t.id === player.teamId ? { ...t, score: t.score - points } : t));
          setPlayers(prev => prev.map(p => p.id === playerId ? { 
              ...p, 
              score: p.score - points,
              stats: { ...p.stats, correctAnswers: Math.max(0, p.stats.correctAnswers - 1) }
          } : p));
          
          const othersPending = buzzQueue.some(b => b.playerId !== playerId && b.status === 'PENDING');
          setGameState(prev => ({ 
              ...prev, 
              phase: othersPending || buzzQueue.length === 0 ? GamePhase.BUZZER_OPEN : GamePhase.ADJUDICATION 
          }));
      }
  };

  const skipQuestion = () => {
    setGameState(prev => ({ ...prev, phase: GamePhase.ANSWER_REVEAL }));
    setBuzzQueue([]);
  };

  const nextPhase = () => {
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
    // "Soft Reset" - Keep players and teams, but reset their scores and stats
    setGameState({
        phase: GamePhase.LOBBY,
        currentQuestionIndex: -1,
        countdownValue: 3,
        buzzerOpenTimestamp: null
    });
    
    // Reset Scores and Stats for Players
    setPlayers(prev => prev.map(p => ({
        ...p,
        score: 0,
        stats: {
            correctAnswers: 0,
            totalBuzzes: 0,
            bestReactionTime: null
        }
    })));

    // Reset Team Scores
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));

    setBuzzQueue([]);
  };

  // --- LIBRARY ACTIONS ---

  const createGame = (name: string) => {
      const newGame: Game = {
          id: crypto.randomUUID(),
          name,
          createdAt: Date.now(),
          questions: []
      };
      setGames(prev => [...prev, newGame]);
  };

  const updateGame = (gameId: string, updates: Partial<Game>) => {
      setGames(prev => prev.map(g => g.id === gameId ? { ...g, ...updates } : g));
  };

  const deleteGame = (gameId: string) => {
      setGames(prev => prev.filter(g => g.id !== gameId));
  };

  const loadGameToLive = (gameId: string) => {
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
          // NOTE: We do not clear players here anymore, allowing roster to persist between games
      }
  };

  return (
    <GameContext.Provider value={{
      gameState,
      activeGameName,
      players,
      teams,
      questions,
      games,
      buzzQueue,
      currentPlayerId,
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
      loadGameToLive
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