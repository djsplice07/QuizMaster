
export const GamePhase = {
  LOBBY: 'LOBBY',
  COUNTDOWN: 'COUNTDOWN',
  QUESTION_DISPLAY: 'QUESTION_DISPLAY',
  BUZZER_OPEN: 'BUZZER_OPEN',
  ADJUDICATION: 'ADJUDICATION',
  ANSWER_REVEAL: 'ANSWER_REVEAL',
  LEADERBOARD: 'LEADERBOARD',
  FINAL_STATS: 'FINAL_STATS'
} as const;

export type GamePhase = typeof GamePhase[keyof typeof GamePhase];

export interface PlayerStats {
  correctAnswers: number;
  totalBuzzes: number;
  bestReactionTime: number | null; // in ms
}

export interface Player {
  id: string;
  name: string;
  teamId?: string;
  score: number;
  isApproved: boolean;
  buzzerTimestamp?: number; // MS timestamp of when they buzzed
  stats: PlayerStats;
}

export interface Team {
  id: string;
  name: string;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  answer: string;
  points: number;
  category?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  audioUrl?: string;
  audioStart?: number;
  audioEnd?: number;
}

export interface Game {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  questions: Question[];
}

export interface BuzzerLog {
  playerId: string;
  timestamp: number;
  order: number;
  status: 'PENDING' | 'CORRECT' | 'WRONG';
}

export interface GameState {
  phase: GamePhase;
  currentQuestionIndex: number;
  countdownValue: number;
  buzzerOpenTimestamp: number | null; // To calculate reaction time
}

// Synchronization Types
export interface PlayerIntent {
  type: 'JOIN' | 'BUZZ' | 'LEAVE';
  payload: any;
  created_at?: string;
}
