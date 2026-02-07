
import React from 'react';
import { JarvisStatus } from '../types';

interface JarvisCoreProps {
  status: JarvisStatus;
}

export const JarvisCore: React.FC<JarvisCoreProps> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case JarvisStatus.LISTENING: return 'bg-cyan-400';
      case JarvisStatus.THINKING: return 'bg-blue-600';
      case JarvisStatus.SPEAKING: return 'bg-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.8)]';
      case JarvisStatus.EXECUTING: return 'bg-yellow-400';
      default: return 'bg-cyan-500 opacity-60';
    }
  };

  return (
    <div className="relative flex items-center justify-center h-64 w-64">
      {/* Outer Rotating Rings */}
      <div className="absolute inset-0 border-2 border-cyan-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
      <div className="absolute inset-4 border border-cyan-500/20 rounded-full animate-[spin_7s_linear_infinite_reverse]" />
      <div className="absolute inset-8 border border-cyan-500/10 rounded-full animate-[spin_15s_linear_infinite]" />
      
      {/* Dynamic Pulse Ring */}
      <div className={`absolute inset-0 rounded-full border-4 border-cyan-500/50 ${status !== JarvisStatus.IDLE ? 'animate-pulse-ring' : ''}`} />

      {/* Central Orb */}
      <div className={`relative h-24 w-24 rounded-full transition-all duration-500 ease-in-out flex items-center justify-center ${getStatusColor()}`}>
        <div className="h-20 w-20 bg-black/40 rounded-full flex items-center justify-center overflow-hidden">
           {/* Inner core detail */}
           <div className="w-12 h-12 border-2 border-cyan-400 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,211,238,1)]" />
           </div>
        </div>
      </div>

      {/* Scanning lines if active */}
      {status === JarvisStatus.LISTENING && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-full h-1 bg-cyan-400/20 animate-[bounce_2s_infinite]" />
        </div>
      )}
    </div>
  );
};
