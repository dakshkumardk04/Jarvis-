
import React, { useState } from 'react';
import { ChatMessage, SystemAction, TodoItem, ActiveTimer } from '../types';

interface TerminalProps {
  messages: ChatMessage[];
  actions: SystemAction[];
  todos: TodoItem[];
  timers: ActiveTimer[];
}

export const Terminal: React.FC<TerminalProps> = ({ messages, actions, todos, timers }) => {
  const [activeTab, setActiveTab] = useState<'FEED' | 'HISTORY'>('FEED');
  
  const lastMessages = messages.slice(-5);
  const lastActions = actions.slice(-3);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-4 gap-4 h-96">
      {/* Main Terminal Feed / History */}
      <div className="md:col-span-3 bg-black/80 border border-cyan-900/50 rounded-lg p-4 font-mono text-sm overflow-hidden flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.9)] relative">
        <div className="flex justify-between items-center border-b border-cyan-900/30 pb-2 mb-2">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('FEED')}
              className={`text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'FEED' ? 'text-cyan-400 border-b border-cyan-400' : 'text-cyan-900 hover:text-cyan-700'}`}
            >
              LIVE_FEED
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'text-cyan-400 border-b border-cyan-400' : 'text-cyan-900 hover:text-cyan-700'}`}
            >
              ARCHIVE_LOG
            </button>
          </div>
          <span className="text-cyan-800 text-[10px] hidden sm:inline">TRACEABILITY_INDEX: {messages.length}</span>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
          {activeTab === 'FEED' ? (
            <>
              {lastActions.map(action => (
                <div key={action.id} className="text-yellow-500/80 animate-pulse flex gap-2">
                  <span className="text-yellow-900 text-[10px] whitespace-nowrap">[{formatTime(action.timestamp)}]</span>
                  <div>
                    <span className="text-yellow-600 font-bold">[SYS_ACT]: </span>
                    {action.type} -> {action.content}
                  </div>
                </div>
              ))}

              {lastMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'text-cyan-400' : 'text-cyan-100'}`}>
                  <span className="text-cyan-900 text-[10px] whitespace-nowrap">[{formatTime(msg.timestamp)}]</span>
                  <div>
                    <span className="font-bold">{msg.role.toUpperCase()}: </span>
                    {msg.text}
                  </div>
                </div>
              ))}
              
              {messages.length === 0 && (
                <div className="text-cyan-900/30 italic mt-4">Awaiting biometric or voice identification...</div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`pb-2 border-b border-cyan-900/10 flex gap-3 ${msg.role === 'user' ? 'text-cyan-500/70' : 'text-cyan-200'}`}>
                  <span className="text-cyan-900 text-[10px] font-bold">LOG_{i.toString().padStart(3, '0')}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-700">{msg.role}</span>
                      <span className="text-[10px] text-cyan-900">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-xs leading-relaxed">{msg.text}</div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="text-cyan-900 text-center py-10 italic">No historical data recorded for this session.</div>}
            </div>
          )}
        </div>
        
        {/* Subtle scanline effect overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.01),rgba(0,255,0,0.005),rgba(0,0,255,0.01))] bg-[length:100%_2px,3px_100%] z-10 opacity-30"></div>
      </div>

      {/* HUD Widgets */}
      <div className="flex flex-col gap-4">
        {/* Timers */}
        <div className="flex-1 bg-black/60 border border-cyan-900/50 rounded-lg p-3 overflow-hidden flex flex-col shadow-inner">
          <div className="text-[10px] text-cyan-700 font-bold uppercase mb-2 border-b border-cyan-900/20 flex justify-between">
            <span>Chronometers</span>
            <span className="animate-pulse">●</span>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar">
            {timers.length === 0 && <div className="text-cyan-900 text-[10px]">Active tracking: 0</div>}
            {timers.map(t => (
              <div key={t.id} className="text-[10px] text-cyan-300 flex justify-between items-center bg-cyan-950/40 p-1.5 rounded border border-cyan-900/30">
                <span className="truncate max-w-[70px] uppercase">{t.label}</span>
                <span className="font-mono text-cyan-500 font-bold">{Math.floor(t.remaining / 60)}:{(t.remaining % 60).toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* To-Do List */}
        <div className="flex-1 bg-black/60 border border-cyan-900/50 rounded-lg p-3 overflow-hidden flex flex-col shadow-inner">
          <div className="text-[10px] text-cyan-700 font-bold uppercase mb-2 border-b border-cyan-900/20">Task Matrix</div>
          <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar">
            {todos.length === 0 && <div className="text-cyan-900 text-[10px]">No pending tasks, Sir.</div>}
            {todos.map(todo => (
              <div key={todo.id} className="text-[10px] text-cyan-400 flex gap-2 items-start bg-cyan-950/20 p-1 rounded">
                <span className="text-cyan-700 font-bold">»</span>
                <span className={todo.completed ? 'line-through opacity-30 text-cyan-900' : ''}>{todo.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
