
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { JarvisCore } from './components/JarvisCore';
import { Terminal } from './components/Terminal';
import { ProtocolLab } from './components/ProtocolLab';
import { JarvisStatus, SystemAction, ChatMessage, CustomProtocol, TodoItem, ActiveTimer, ActionType, ResponseTone } from './types';
import { createPcmBlob, decode, decodeAudioData } from './services/audioService';

const getSystemInstruction = (tone: ResponseTone) => {
  let personalityPrompt = "";
  
  switch (tone) {
    case 'WITTY':
      personalityPrompt = "Your tone is witty, slightly sarcastic, and charismatic, similar to the banter between Tony Stark and JARVIS. You're brilliant but you don't mind a sharp-tongued remark if the user asks something obvious. Use humor where appropriate.";
      break;
    case 'EMPATHETIC':
      personalityPrompt = "Your tone is deeply empathetic, supportive, and warm. You prioritize the user's well-being and emotional state, offering encouragement and patient guidance. You are a caregiver as much as an assistant.";
      break;
    case 'FORMAL':
    default:
      personalityPrompt = "Your tone is strictly formal, professional, and highly efficient. You are the ultimate gentleman's gentleman. Use 'Sir' or 'Madam' frequently and maintain a respectful, polished demeanor at all times.";
      break;
  }

  return `You are JARVIS, a highly advanced AI personal assistant created by Tony Stark.
You are an expert in software troubleshooting (Windows, Linux, macOS), programming (Python, JavaScript, C++, Rust), and productivity optimization.
Your knowledge base is vast. Provide technical guidance with precision.
You have access to tools for opening applications, typing messages, managing timers, tracking to-do items, and opening system settings.

PERSONALITY_PROTOCOL: ${personalityPrompt}

Capabilities & Protocols:
1. Technical Support: Guide users through debugging, registry edits, or terminal commands.
2. System Interaction: Use 'open_application', 'type_message', or 'open_system_settings' when requested.
3. Utility: Manage 'timers' and 'to-do lists' to keep the user efficient.
4. Always confirm execution of system protocols.`;
};

const openAppTool: FunctionDeclaration = {
  name: 'open_application',
  parameters: {
    type: Type.OBJECT,
    description: 'Opens a specific Windows application.',
    properties: { app_name: { type: Type.STRING } },
    required: ['app_name'],
  },
};

const openSettingsTool: FunctionDeclaration = {
  name: 'open_system_settings',
  parameters: {
    type: Type.OBJECT,
    description: 'Opens the Windows System Settings application.',
    properties: { 
      category: { 
        type: Type.STRING, 
        description: 'The specific settings category to open (e.g., Network, Display, Updates)',
        enum: ['General', 'Network', 'Display', 'Updates', 'Privacy', 'Apps']
      }
    },
    required: ['category'],
  },
};

const typeMessageTool: FunctionDeclaration = {
  name: 'type_message',
  parameters: {
    type: Type.OBJECT,
    description: 'Types text into the active window.',
    properties: { message: { type: Type.STRING } },
    required: ['message'],
  },
};

const timerTool: FunctionDeclaration = {
  name: 'manage_timer',
  parameters: {
    type: Type.OBJECT,
    description: 'Starts a countdown timer.',
    properties: { 
      duration_seconds: { type: Type.NUMBER, description: 'Duration in seconds' },
      label: { type: Type.STRING, description: 'Description of the timer' }
    },
    required: ['duration_seconds', 'label'],
  },
};

const todoTool: FunctionDeclaration = {
  name: 'manage_tasks',
  parameters: {
    type: Type.OBJECT,
    description: 'Adds or lists items in the to-do list.',
    properties: { 
      action: { type: Type.STRING, enum: ['add', 'list'], description: 'Action to perform' },
      task: { type: Type.STRING, description: 'Task content' }
    },
    required: ['action'],
  },
};

const App: React.FC = () => {
  const [status, setStatus] = useState<JarvisStatus>(JarvisStatus.IDLE);
  const [tone, setTone] = useState<ResponseTone>('FORMAL');
  const [wakeWord, setWakeWord] = useState<string>('Jarvis');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actions, setActions] = useState<SystemAction[]>([]);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [protocols, setProtocols] = useState<CustomProtocol[]>([]);
  
  const [isInitializing, setIsInitializing] = useState(true);
  const [showLab, setShowLab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Load Protocols, Tone, and Wake Word from Storage
  useEffect(() => {
    isComponentMounted.current = true;
    const savedProtocols = localStorage.getItem('jarvis_protocols');
    if (savedProtocols) setProtocols(JSON.parse(savedProtocols));
    
    const savedTone = localStorage.getItem('jarvis_tone') as ResponseTone;
    if (savedTone) setTone(savedTone);

    const savedWakeWord = localStorage.getItem('jarvis_wakeword');
    if (savedWakeWord) setWakeWord(savedWakeWord);
    
    const timer = setTimeout(() => setIsInitializing(false), 2000);
    return () => {
      clearTimeout(timer);
      isComponentMounted.current = false;
    };
  }, []);

  const changeTone = (newTone: ResponseTone) => {
    setTone(newTone);
    localStorage.setItem('jarvis_tone', newTone);
  };

  const updateWakeWord = (newWord: string) => {
    setWakeWord(newWord);
    localStorage.setItem('jarvis_wakeword', newWord);
  };

  // Timer Tick Logic
  useEffect(() => {
    const interval = setInterval(() => {
      setTimers(prev => prev.map(t => ({ ...t, remaining: Math.max(0, t.remaining - 1) }))
        .filter(t => t.remaining > 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSystemAction = useCallback((type: ActionType, content: string) => {
    const newAction: SystemAction = {
      id: Math.random().toString(36).substring(7),
      type,
      content,
      timestamp: Date.now(),
      status: 'completed'
    };
    setActions(prev => [...prev, newAction]);
    
    if (type === 'START_TIMER') {
      const parts = content.split('|');
      setTimers(prev => [...prev, { id: Math.random().toString(36), duration: parseInt(parts[0]), remaining: parseInt(parts[0]), label: parts[1] || 'Timer' }]);
    } else if (type === 'ADD_TODO') {
      setTodos(prev => [...prev, { id: Math.random().toString(36), text: content, completed: false }]);
    }

    setStatus(JarvisStatus.EXECUTING);
    setTimeout(() => {
      if (isComponentMounted.current) setStatus(JarvisStatus.IDLE);
    }, 1000);
  }, []);

  const executeProtocolSequence = useCallback((protocol: CustomProtocol) => {
    handleSystemAction('TYPE_MESSAGE', `Initiating ${protocol.name}...`);
    protocol.actions.forEach((action, index) => {
      setTimeout(() => {
        if (isComponentMounted.current) handleSystemAction(action.type, action.payload);
      }, (index + 1) * 800);
    });
  }, [handleSystemAction]);

  const startLiveSession = useCallback(async () => {
    if (sessionRef.current) return;

    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");
      
      setStatus(JarvisStatus.LISTENING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: getSystemInstruction(tone),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } }
          },
          tools: [{ functionDeclarations: [openAppTool, typeMessageTool, timerTool, todoTool, openSettingsTool] }],
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setStatus(JarvisStatus.SPEAKING);
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0 && isComponentMounted.current) setStatus(JarvisStatus.IDLE);
              });
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              if (text) {
                setMessages(prev => [...prev, { role: 'user', text, timestamp: Date.now() }]);
                const matched = protocols.find(p => text.toLowerCase().includes(p.triggerPhrase));
                if (matched) executeProtocolSequence(matched);
              }
            }
            if (message.serverContent?.outputTranscription) {
              const text = message.serverContent.outputTranscription.text;
              if (text) setMessages(prev => [...prev, { role: 'jarvis', text, timestamp: Date.now() }]);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                let res = "ok";
                if (fc.name === 'open_application') handleSystemAction('OPEN_APP', (fc.args as any).app_name);
                else if (fc.name === 'open_system_settings') handleSystemAction('OPEN_SETTINGS', (fc.args as any).category);
                else if (fc.name === 'type_message') handleSystemAction('TYPE_MESSAGE', (fc.args as any).message);
                else if (fc.name === 'manage_timer') handleSystemAction('START_TIMER', `${(fc.args as any).duration_seconds}|${(fc.args as any).label}`);
                else if (fc.name === 'manage_tasks') {
                   if ((fc.args as any).action === 'add') handleSystemAction('ADD_TODO', (fc.args as any).task);
                   else res = "Here are your tasks: " + todos.map(t => t.text).join(', ');
                }
                // Fix: use 'res' instead of undefined 'result'
                sessionPromise.then(s => s.sendToolResponse({
                  functionResponses: { id: fc.id, name: fc.name, response: { result: res } }
                }));
              }
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setStatus(JarvisStatus.IDLE);
            }
          },
          onerror: (e) => { 
            if (isComponentMounted.current) {
              setError("Link compromised. Recalibrating..."); 
              sessionRef.current = null;
              setStatus(JarvisStatus.IDLE); 
            }
          },
          onclose: () => {
            if (isComponentMounted.current) {
              sessionRef.current = null;
              setStatus(JarvisStatus.IDLE);
            }
          }
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err: any) {
      if (isComponentMounted.current) {
        setError(err.message);
        sessionRef.current = null;
        setStatus(JarvisStatus.IDLE);
      }
    }
  }, [protocols, executeProtocolSequence, handleSystemAction, todos, tone]);

  // Enhanced Robust Wake-word detection with dynamic user-defined word
  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech Recognition API not supported in this browser.");
      return;
    }

    let recognition: any = null;
    let shouldBeRunning = true;
    let isCurrentlyStarting = false;

    const startRecognition = () => {
      if (!shouldBeRunning || isCurrentlyStarting) return;

      if (!recognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        // Escaping special regex characters and creating a dynamic regex
        const escapedWord = wakeWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const wakeWordRegex = new RegExp(`\\b(${escapedWord}|hey ${escapedWord}|yo ${escapedWord}|jarvis|hey jarvis)\\b`, 'i');

        recognition.onstart = () => {
          setIsMicActive(true);
          isCurrentlyStarting = false;
        };

        recognition.onresult = (event: any) => {
          if (status !== JarvisStatus.IDLE) return;
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcript = event.results[i][0].transcript.trim();
            if (wakeWordRegex.test(transcript)) {
              console.log("Wake word detected:", transcript);
              startLiveSession();
              break;
            }
          }
        };

        recognition.onerror = (event: any) => {
          isCurrentlyStarting = false;
          if (event.error === 'aborted') return;
          if (event.error === 'no-speech') return;

          console.error("Wake-word recognition error:", event.error);
          setIsMicActive(false);
          if (event.error === 'network') {
            if (shouldBeRunning && !isInitializing) {
              setTimeout(() => { if (shouldBeRunning) startRecognition(); }, 2000);
            }
          }
        };

        recognition.onend = () => {
          setIsMicActive(false);
          isCurrentlyStarting = false;
          if (shouldBeRunning && !isInitializing) {
            setTimeout(() => {
              if (shouldBeRunning && !isInitializing) startRecognition();
            }, 100);
          }
        };
      }

      try {
        isCurrentlyStarting = true;
        recognition.start();
      } catch (e) {
        isCurrentlyStarting = false;
      }
    };

    if (!isInitializing) {
      startRecognition();
    }

    return () => {
      shouldBeRunning = false;
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {}
      }
    };
  }, [isInitializing, startLiveSession, status, wakeWord]);

  const saveProtocol = (p: CustomProtocol) => {
    const next = [...protocols, p];
    setProtocols(next);
    localStorage.setItem('jarvis_protocols', JSON.stringify(next));
  };

  const deleteProtocol = (id: string) => {
    const next = protocols.filter(p => p.id !== id);
    setProtocols(next);
    localStorage.setItem('jarvis_protocols', JSON.stringify(next));
  };

  if (isInitializing) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black orbitron">
        <div className="text-cyan-500 text-3xl mb-8 animate-pulse">UPDATING FIRMWARE...</div>
        <div className="w-64 h-1 bg-cyan-950 rounded-full overflow-hidden">
          <div className="h-full bg-cyan-400 animate-[loading_2s_infinite]" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black text-cyan-500 flex flex-col items-center justify-center p-6">
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start opacity-60">
        <div className="space-y-1">
          <div className="text-[10px] font-bold">KNOWLEDGE_REPOS: SYNCED</div>
          <div className="text-[10px] text-cyan-800">EXP_DOMAIN: SOFT_ENG, PROD_OPT</div>
          <div className="flex gap-2 mt-2">
            {(['FORMAL', 'WITTY', 'EMPATHETIC'] as ResponseTone[]).map((t) => (
              <button
                key={t}
                onClick={() => changeTone(t)}
                className={`text-[8px] px-2 py-0.5 border transition-all ${tone === t ? 'border-cyan-400 bg-cyan-400/20 text-cyan-400' : 'border-cyan-900 text-cyan-900 hover:text-cyan-600'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold">STARK_INDUSTRIES_v14.0.3</div>
          <div className="text-[10px] text-cyan-800 flex items-center justify-end gap-2">
            <span>MIC_STATUS:</span>
            <span className={`h-2 w-2 rounded-full ${isMicActive ? 'bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`}></span>
            <span className={isMicActive ? 'text-green-500' : 'text-red-500'}>{isMicActive ? 'LISTENING_FOR_WAKE' : 'STBY'}</span>
          </div>
          <div className="text-[8px] text-cyan-900 mt-1 uppercase">Key: {wakeWord}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
        <JarvisCore status={status} />
        <Terminal messages={messages} actions={actions} todos={todos} timers={timers} />

        <div className="flex gap-4">
          <button 
            onClick={() => status === JarvisStatus.IDLE ? startLiveSession() : sessionRef.current?.close()}
            className="px-8 py-3 bg-cyan-500/10 border border-cyan-500/50 hover:border-cyan-400 hover:bg-cyan-500 hover:text-black orbitron transition-all"
          >
            {status === JarvisStatus.IDLE ? 'BOOT_LINK' : 'TERMINATE_LINK'}
          </button>
          <button 
            onClick={() => setShowLab(true)}
            className="px-8 py-3 bg-black border border-cyan-900 text-cyan-700 hover:text-cyan-400 hover:border-cyan-400 orbitron transition-all"
          >
            SYSTEM_CONFIG
          </button>
        </div>
      </div>

      {showLab && (
        <ProtocolLab 
          onClose={() => setShowLab(false)} 
          onSave={saveProtocol} 
          existingProtocols={protocols} 
          onDelete={deleteProtocol}
          wakeWord={wakeWord}
          onWakeWordUpdate={updateWakeWord}
        />
      )}

      {error && (
        <div className="absolute top-24 bg-red-950/80 border border-red-500 text-red-200 px-6 py-2 rounded font-mono text-xs z-50">
          [ERROR]: {error}
        </div>
      )}

      {/* Decorative HUD lines */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-1 h-20 bg-cyan-900/20" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-1 h-20 bg-cyan-900/20" />
        <div className="absolute left-10 top-1/2 -translate-y-1/2 h-1 w-20 bg-cyan-900/20" />
        <div className="absolute right-10 top-1/2 -translate-y-1/2 h-1 w-20 bg-cyan-900/20" />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(34, 211, 238, 0.2); border-radius: 2px; }
        @keyframes loading { 0% { width: 0%; left: 0; } 50% { width: 100%; left: 0; } 100% { width: 0%; left: 100%; } }
      `}</style>
    </div>
  );
};

export default App;
