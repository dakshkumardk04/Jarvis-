
import React, { useState } from 'react';
import { CustomProtocol, ActionType, ProtocolAction } from '../types';

interface ProtocolLabProps {
  onClose: () => void;
  onSave: (protocol: CustomProtocol) => void;
  existingProtocols: CustomProtocol[];
  onDelete: (id: string) => void;
  wakeWord: string;
  onWakeWordUpdate: (word: string) => void;
}

export const ProtocolLab: React.FC<ProtocolLabProps> = ({ onClose, onSave, existingProtocols, onDelete, wakeWord, onWakeWordUpdate }) => {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('');
  const [actions, setActions] = useState<ProtocolAction[]>([]);
  const [tempWakeWord, setTempWakeWord] = useState(wakeWord);

  const addAction = (type: ActionType) => {
    setActions([...actions, { type, payload: '' }]);
  };

  const updateActionPayload = (index: number, payload: string) => {
    const newActions = [...actions];
    newActions[index].payload = payload;
    setActions(newActions);
  };

  const handleSave = () => {
    if (!name || !trigger || actions.length === 0) return;
    onSave({
      id: Math.random().toString(36).substring(7),
      name,
      triggerPhrase: trigger.toLowerCase(),
      actions
    });
    setName('');
    setTrigger('');
    setActions([]);
  };

  const handleWakeWordSave = () => {
    if (!tempWakeWord) return;
    onWakeWordUpdate(tempWakeWord);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-black border border-cyan-500/50 rounded-xl overflow-hidden flex flex-col h-[85vh]">
        <div className="p-4 border-b border-cyan-500/30 flex justify-between items-center orbitron">
          <h2 className="text-cyan-400 text-xl tracking-tighter">CENTRAL_SYSTEM_CONFIGURATION</h2>
          <button onClick={onClose} className="text-cyan-900 hover:text-cyan-500">TERMINATE_SESSION</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Main Config & Builder */}
          <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-cyan-900/50">
            
            {/* Global Settings Section */}
            <section className="space-y-4 pb-6 border-b border-cyan-900/30">
              <h3 className="text-cyan-400 orbitron text-xs uppercase tracking-widest">Global Authentication</h3>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-cyan-700 uppercase mb-1 block">Vocal Authentication Key (Wake Word)</label>
                  <input 
                    type="text" value={tempWakeWord} onChange={e => setTempWakeWord(e.target.value)}
                    placeholder="e.g. Jarvis"
                    className="w-full bg-cyan-950/20 border border-cyan-900 p-2 text-cyan-400 focus:border-cyan-500 outline-none font-mono text-sm"
                  />
                </div>
                <button 
                  onClick={handleWakeWordSave}
                  className="mt-5 px-4 bg-cyan-500/10 border border-cyan-500/40 text-cyan-500 hover:bg-cyan-500/20 orbitron text-[10px] transition-all"
                >
                  UPDATE_KEY
                </button>
              </div>
            </section>

            {/* Protocol Builder Section */}
            <section className="space-y-4">
              <h3 className="text-cyan-400 orbitron text-xs uppercase tracking-widest">Protocol Architect</h3>
              <div>
                <label className="text-[10px] text-cyan-700 uppercase mb-1 block">Protocol Designation</label>
                <input 
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Workday Protocol"
                  className="w-full bg-cyan-950/20 border border-cyan-900 p-2 text-cyan-400 focus:border-cyan-500 outline-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-cyan-700 uppercase mb-1 block">In-Session Trigger Phrase</label>
                <input 
                  type="text" value={trigger} onChange={e => setTrigger(e.target.value)}
                  placeholder="e.g. Start my workday"
                  className="w-full bg-cyan-950/20 border border-cyan-900 p-2 text-cyan-400 focus:border-cyan-500 outline-none font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-cyan-700 uppercase block">Action Sequence</label>
                {actions.map((action, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-cyan-900/10 p-2 rounded border border-cyan-900/20">
                    <span className="text-cyan-600 font-mono text-xs">{action.type}:</span>
                    <input 
                      type="text" value={action.payload} onChange={e => updateActionPayload(idx, e.target.value)}
                      placeholder="Payload (e.g. Chrome, 'Buy milk')"
                      className="flex-1 bg-transparent border-b border-cyan-900/30 text-cyan-100 text-xs outline-none"
                    />
                  </div>
                ))}
                <div className="flex flex-wrap gap-2 pt-2">
                  {['OPEN_APP', 'TYPE_MESSAGE', 'START_TIMER', 'ADD_TODO', 'OPEN_SETTINGS'].map(type => (
                    <button 
                      key={type} onClick={() => addAction(type as ActionType)}
                      className="text-[9px] px-2 py-1 border border-cyan-900 text-cyan-700 hover:border-cyan-500 hover:text-cyan-500 transition-colors bg-cyan-500/5"
                    >
                      + {type}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleSave}
                className="w-full py-3 bg-cyan-500/10 border border-cyan-500 text-cyan-500 hover:bg-cyan-500 hover:text-black orbitron transition-all mt-4"
              >
                COMPILE_PROTOCOL
              </button>
            </section>
          </div>

          {/* Sidebar: Status & List */}
          <div className="w-full md:w-80 p-6 bg-cyan-950/5 space-y-6 overflow-y-auto custom-scrollbar">
            <h3 className="text-[10px] text-cyan-400 orbitron uppercase tracking-widest border-b border-cyan-900 pb-2">Active Database</h3>
            <div className="space-y-3">
              {existingProtocols.map(p => (
                <div key={p.id} className="p-3 border border-cyan-900 rounded bg-black/40 group hover:border-cyan-500 transition-all">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-cyan-300 text-xs font-bold truncate">{p.name}</span>
                    <button onClick={() => onDelete(p.id)} className="text-red-900 hover:text-red-500 text-[10px] font-mono">PURGE</button>
                  </div>
                  <div className="text-[9px] text-cyan-700 italic font-mono">"Trigger: {p.triggerPhrase}"</div>
                  <div className="mt-2 flex gap-1">
                    {p.actions.slice(0, 3).map((a, i) => (
                      <div key={i} className="w-1.5 h-1.5 bg-cyan-500/50 rounded-full"></div>
                    ))}
                    {p.actions.length > 3 && <span className="text-[8px] text-cyan-900">+{p.actions.length - 3}</span>}
                  </div>
                </div>
              ))}
              {existingProtocols.length === 0 && (
                <div className="text-cyan-900 text-[10px] font-mono italic py-4">Database currently empty. Create a protocol to begin.</div>
              )}
            </div>
            
            <div className="pt-6 border-t border-cyan-900/30">
              <div className="text-[8px] text-cyan-900 font-mono space-y-1">
                <div>SYS_LOAD: NORMAL</div>
                <div>AUTH_MODE: BIOMETRIC_VOICE</div>
                <div>LOCAL_ENCRYPTION: AES-256</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
