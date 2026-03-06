import { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';

import { spatialNodes } from './types';
import type { ModuleKey, LogEntry } from './types';
import { API_URL, parseGeminiResponse } from './hooks/utils';

// UI Components
import { HUDOverlay } from './components/ui/HUDOverlay';
import { DashboardModule } from './components/ui/DashboardModule';

// 3D Components
import { CameraRig } from './components/3d/CameraRig';
import { AICore } from './components/3d/AICore';

// Styles
import './index.css';

function App() {
  const [activeModule, setActiveModule] = useState<ModuleKey>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [tempApiKey, setTempApiKey] = useState("");
  
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState("Awaiting data stream...");
  const [currentThreat, setCurrentThreat] = useState("SECURE 🟢");
  const [threatColor, setThreatColor] = useState("safe");

  // Audio state
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    if (isAlertMode) document.body.classList.add('alert-mode');
    else document.body.classList.remove('alert-mode');
  }, [isAlertMode]);

  const appendLog = (content: string, time: string = new Date().toLocaleTimeString()) => {
    setLogs(prev => [{ id: Math.random().toString(36).substr(2, 9), timestamp: time, content }, ...prev].slice(0, 30));
  };

  const processResult = (resultText: string) => {
    const parsed = parseGeminiResponse(resultText);
    setCurrentScenario(parsed.scenario);
    setCurrentThreat(parsed.threatLevel);
    setThreatColor(parsed.colorClass);
    setIsAlertMode(parsed.isAlert);
    appendLog(resultText);
  };

  const handleError = (msg: string) => {
    appendLog(`❌ Error: ${msg}`);
    setIsProcessing(false);
  }

  const handleFileUpload = async () => {
    if (!file) return;
    setIsProcessing(true);
    appendLog(`Deploying ${file.name} to AI core for analysis...`);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/standard`, {
        method: 'POST',
        headers: apiKey ? { 'x-gemini-api-key': apiKey } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        processResult(data.result);
        setActiveModule('reports'); 
      } else handleError(data.detail || "API Failure");
    } catch (err: any) { handleError(err.message); } 
    finally { setIsProcessing(false); }
  };

  const startManualRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        setIsProcessing(true);
        appendLog("Analyzing manual field recording...");
        
        const formData = new FormData();
        formData.append("file", audioBlob, "manual_record.webm");

        try {
          const res = await fetch(`${API_URL}/standard`, {
            method: 'POST',
            headers: apiKey ? { 'x-gemini-api-key': apiKey } : {},
            body: formData,
          });
          const data = await res.json();
          if (data.success) {
             processResult(data.result);
             setActiveModule('reports');
          } else handleError(data.detail);
        } catch (err: any) { handleError(err.message); } 
        finally { setIsProcessing(false); }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { handleError("Microphone access denied"); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const startLiveMonitor = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
      appendLog("📡 GLOBAL OVERWATCH ACTIVE: Initializing environmental audio parsers...");
      setCurrentScenario("Listening to environment...");

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = async (e) => {
        if (e.data.size > 0) {
          const formData = new FormData();
          formData.append("file", e.data, "live_chunk.webm");
          try {
            const res = await fetch(`${API_URL}/stream`, { 
              method: 'POST', 
              headers: apiKey ? { 'x-gemini-api-key': apiKey } : {},
              body: formData 
            });
            const data = await res.json();
            if (data.success) {
               processResult(data.result);
               if (data.result.includes("CRITICAL") || data.result.includes("HIGH") || data.result.includes("EMERGENCY DETECTED: YES")) {
                  setActiveModule('reports');
               }
            }
          } catch (err) { console.error(err); }
        }
      };

      mediaRecorder.start(5000); 

    } catch (err) {
      handleError("Live monitor initialization failed.");
      setIsRecording(false);
    }
  };

  const stopLiveMonitor = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    appendLog("🔴 Live monitoring offline.");
    setIsAlertMode(false);
    setCurrentThreat("SECURE 🟢");
    setThreatColor("safe");
  };

  return (
    <>
      <HUDOverlay activeModule={activeModule} isAlertMode={isAlertMode} setActiveModule={setActiveModule} />

      <Canvas camera={{ position: [0, 0, 12], fov: 50 }}>
        <CameraRig activeModule={activeModule} />
        
        <ambientLight intensity={1} />
        <pointLight position={[0, 0, 10]} intensity={2} color="#FF2E2E" />
        <pointLight position={[0, 5, -5]} intensity={1} color="#00FF9C" />

        <Stars radius={50} depth={50} count={2500} factor={4} saturation={0} fade speed={isAlertMode ? 3 : 1} />

        <AICore isProcessing={isProcessing} isAlertMode={isAlertMode} />

        {Object.entries(spatialNodes).map(([key, node]) => (
          <Html 
             key={key} 
             position={node.position} 
             transform 
             zIndexRange={[50, 0]}
             scale={0.55}
          >
            <div 
              className={`glass-panel text-white select-none transition-all duration-300 ${
                activeModule === key 
                  ? 'glass-panel-active w-[460px] h-[400px] overflow-y-auto' 
                  : 'cursor-pointer w-[340px] p-6'
              }`}
              style={{ 
                opacity: activeModule && activeModule !== key ? 0.2 : 1,
                padding: activeModule === key ? '28px' : undefined
              }}
              onClick={(e) => { 
                e.stopPropagation(); 
                if (activeModule !== key) setActiveModule(key as ModuleKey);
              }}
            >
              <div className="flex items-center gap-5">
                <div className="text-5xl text-shadow-[0_0_20px_rgba(255,255,255,0.3)]">{node.icon}</div>
                <div>
                  <h2 className="font-heading text-2xl m-0 tracking-wide">{node.title}</h2>
                  {activeModule !== key && <p className="text-neutral-400 text-sm leading-relaxed m-0 mt-1">{node.desc}</p>}
                </div>
              </div>

              {activeModule === key && (
                 <DashboardModule 
                    moduleKey={key as ModuleKey}
                    file={file} setFile={setFile}
                    isProcessing={isProcessing} isRecording={isRecording}
                    handleFileUpload={handleFileUpload} startManualRecording={startManualRecording}
                    stopRecording={stopRecording} startLiveMonitor={startLiveMonitor} stopLiveMonitor={stopLiveMonitor}
                    tempApiKey={tempApiKey} setTempApiKey={setTempApiKey} setApiKey={setApiKey} setActiveModule={setActiveModule}
                    currentThreat={currentThreat} threatColor={threatColor} currentScenario={currentScenario}
                    logs={logs} apiKey={apiKey}
                 />
              )}
            </div>
          </Html>
        ))}

        <mesh position={[0, 0, -5]} onClick={() => setActiveModule(null)}>
           <planeGeometry args={[100, 100]} />
           <meshBasicMaterial visible={false} />
        </mesh>
      </Canvas>
    </>
  );
}

export default App;
