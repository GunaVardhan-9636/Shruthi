import React from 'react';
import type { ModuleKey, LogEntry } from '../../types';

interface DashboardModuleProps {
  moduleKey: ModuleKey;
  file: File | null;
  setFile: (f: File | null) => void;
  isProcessing: boolean;
  isRecording: boolean;
  handleFileUpload: () => void;
  startManualRecording: () => void;
  stopRecording: () => void;
  startLiveMonitor: () => void;
  stopLiveMonitor: () => void;
  tempApiKey: string;
  setTempApiKey: (k: string) => void;
  setApiKey: (k: string) => void;
  setActiveModule: (m: ModuleKey) => void;
  currentThreat: string;
  threatColor: string;
  currentScenario: string;
  logs: LogEntry[];
  apiKey: string;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  moduleKey, file, setFile, isProcessing, isRecording,
  handleFileUpload, startManualRecording, stopRecording,
  startLiveMonitor, stopLiveMonitor, tempApiKey, setTempApiKey,
  setApiKey, setActiveModule, currentThreat, threatColor,
  currentScenario, logs, apiKey
}) => {

  const renderVisualizer = () => (
    <div className={`flex items-center justify-center h-16 gap-1 my-5 ${!isRecording ? 'opacity-50' : ''}`}>
        {[1,2,3,4,5,6,7].map(i => (
          <div key={i} className={`w-1.5 rounded-full ${isRecording ? 'bg-ai-red animate-[equalize_1s_infinite_ease-in-out]' : 'bg-neutral-600 h-1'}`} 
               style={{ animationDelay: `${i * 0.1}s`, height: isRecording ? `${20 + (i % 3)*15}px` : '4px' }}></div>
        ))}
    </div>
  );

  switch (moduleKey) {
    case 'upload':
      return (
        <div className="mt-6 pt-6 border-t border-white/10 animate-[fadeIn_0.5s_forwards]">
           <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center bg-black/40 cursor-pointer transition-all hover:border-ai-glow hover:bg-ai-red/5 relative overflow-hidden mb-5">
               <div className="text-4xl mb-3">📁</div>
               <div className="font-bold">Drop Audio Evidence Here</div>
               <div className="text-neutral-400 text-sm mt-1">or click to upload (.wav, .mp3, .webm)</div>
               <input type="file" accept="audio/*" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} />
           </div>
           {file && <div className="my-3 text-ai-success text-center">{file.name} selected</div>}
           <button className="btn-primary" onClick={handleFileUpload} disabled={!file || isProcessing}>
              {isProcessing ? 'SCANNING SIGNATURES...' : 'ANALYZE EXTRACTED AUDIO'}
           </button>
        </div>
      );
    case 'manual':
      return (
        <div className="mt-6 pt-6 border-t border-white/10 animate-[fadeIn_0.5s_forwards]">
           {renderVisualizer()}
           {!isRecording ? (
              <button className="btn-primary" onClick={startManualRecording} disabled={isProcessing}>
                🔴 INITIATE FIELD RECORDING
              </button>
            ) : (
              <button className="btn-primary !border-white !bg-white/10 hover:!bg-white/20" onClick={stopRecording}>
                ⏹ CONCLUDE & ANALYZE
              </button>
            )}
        </div>
      );
    case 'live':
      return (
        <div className="mt-6 pt-6 border-t border-white/10 animate-[fadeIn_0.5s_forwards]">
           {renderVisualizer()}
           {!isRecording ? (
              <button className="btn-primary" onClick={startLiveMonitor} disabled={isProcessing}>
                📡 ENGAGE LIVE SENORS
              </button>
            ) : (
              <button className="btn-primary" onClick={stopLiveMonitor}>
                🔴 DISENGAGE SENSORS
              </button>
            )}
        </div>
      );
    case 'settings':
      return (
        <div className="mt-6 pt-6 border-t border-white/10 animate-[fadeIn_0.5s_forwards]">
           <p className="text-neutral-400 text-sm mb-4">Override system defaults with secured credentials.</p>
           <input 
              type="password" placeholder="Gemini API Key" 
              value={tempApiKey || apiKey} onChange={(e) => setTempApiKey(e.target.value)}
              className="w-full p-3 rounded-lg border border-white/10 bg-black/60 text-white font-body mb-4 focus:outline-none focus:border-ai-glow"
            />
            <button className="btn-primary" onClick={() => { setApiKey(tempApiKey); setActiveModule(null); }}>
              SAVE SECURE KEY & RETURN
            </button>
        </div>
      );
    case 'reports':
      return (
        <div className="mt-6 pt-6 border-t border-white/10 animate-[fadeIn_0.5s_forwards]">
           <div className={`bg-black/40 p-4 rounded-lg mb-3 border-l-4 ${threatColor === 'critical' ? 'border-ai-red' : threatColor === 'warning' ? 'border-ai-warning' : 'border-ai-success'}`}>
              <div className="text-xs text-neutral-400 font-heading mb-1">OVERALL THREAT LEVEL</div>
              <div className={`text-base font-semibold ${threatColor === 'critical' ? 'text-ai-red' : threatColor === 'warning' ? 'text-ai-warning' : 'text-ai-success'}`}>{currentThreat}</div>
           </div>
           <div className="bg-black/40 p-4 rounded-lg mb-3 border-l-4 border-neutral-600">
              <div className="text-xs text-neutral-400 font-heading mb-1">DETECTED SCENARIO</div>
              <div className="text-sm font-normal">{currentScenario}</div>
           </div>
           
           <div className="text-xs text-neutral-400 font-heading mt-5 mb-2">RAW AI TELEMETRY</div>
           <div className="max-h-[200px] overflow-y-auto flex flex-col gap-2 pr-2">
             {logs.length === 0 && <p className="text-neutral-500 italic text-xs">No telemetry data.</p>}
             {logs.map(log => {
               const formattedContent = log.content.replace(/(\d+\.\s+\*\*)/g, '\n$1');
               const lines = formattedContent.split('\n');
               return (
                 <div key={log.id} className="font-mono text-xs text-neutral-300 p-2.5 bg-black/50 border-l-2 border-ai-glow">
                   <div className="text-neutral-500 font-bold mb-1">[{log.timestamp}]</div> 
                   {lines.map((line, lIdx) => (
                     <div key={lIdx} className="mb-1 last:mb-0">
                       {line.split(/(\*\*.*?\*\*)/).map((part, pIdx) => {
                         if (part.startsWith('**') && part.endsWith('**')) {
                           return <strong className="text-white bg-ai-red/20 px-1 py-0.5 rounded font-bold" key={pIdx}>{part.slice(2, -2)}</strong>;
                         }
                         return <span key={pIdx}>{part}</span>;
                       })}
                     </div>
                   ))}
                 </div>
               );
             })}
           </div>
        </div>
      );
    default: return null;
  }
};
