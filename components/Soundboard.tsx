import React from 'react';
import { Volume2, Bell, XCircle } from 'lucide-react';

export const Soundboard: React.FC = () => {
  const playTone = (freq: number, type: 'sine' | 'square' | 'sawtooth' | 'triangle', duration: number) => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Envelope
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  };

  const playSound = (type: 'DING' | 'BUZZ' | 'THEME') => {
    if (type === 'DING') {
      // High pitch double beep
      playTone(1200, 'sine', 1);
      setTimeout(() => playTone(1600, 'sine', 1), 100);
    } else if (type === 'BUZZ') {
      // Low pitch sawtooth
      playTone(150, 'sawtooth', 0.8);
    } else if (type === 'THEME') {
      // Simple arpeggio jingle
      [440, 554, 659, 880].forEach((freq, i) => {
        setTimeout(() => playTone(freq, 'sine', 0.6), i * 150);
      });
    }
  };

  return (
    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
      <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">Soundboard</h3>
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => playSound('DING')}
          className="flex flex-col items-center justify-center p-3 bg-green-600 hover:bg-green-500 rounded text-white transition-colors active:scale-95 transform"
        >
          <Bell className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">DING</span>
        </button>
        <button 
          onClick={() => playSound('BUZZ')}
          className="flex flex-col items-center justify-center p-3 bg-red-600 hover:bg-red-500 rounded text-white transition-colors active:scale-95 transform"
        >
          <XCircle className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">BUZZ</span>
        </button>
        <button 
          onClick={() => playSound('THEME')}
          className="flex flex-col items-center justify-center p-3 bg-indigo-600 hover:bg-indigo-500 rounded text-white transition-colors active:scale-95 transform"
        >
          <Volume2 className="w-5 h-5 mb-1" />
          <span className="text-xs font-bold">THEME</span>
        </button>
      </div>
    </div>
  );
};