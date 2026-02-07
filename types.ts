
export enum JarvisStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  EXECUTING = 'EXECUTING'
}

export type ActionType = 'OPEN_APP' | 'TYPE_MESSAGE' | 'READ_DOC' | 'START_TIMER' | 'ADD_TODO' | 'SHOW_TODO' | 'OPEN_SETTINGS';

export type ResponseTone = 'FORMAL' | 'WITTY' | 'EMPATHETIC';

export interface SystemAction {
  id: string;
  type: ActionType;
  content: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
}

export interface ChatMessage {
  role: 'user' | 'jarvis';
  text: string;
  timestamp: number;
}

export interface ProtocolAction {
  type: ActionType;
  payload: string;
}

export interface CustomProtocol {
  id: string;
  triggerPhrase: string;
  actions: ProtocolAction[];
  name: string;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ActiveTimer {
  id: string;
  duration: number; // in seconds
  remaining: number;
  label: string;
}