import { useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
// Post-processing temporarily disabled for stability
import * as THREE from 'three';

import type { ModuleKey, LogEntry } from './types';
import { API_URL, parseGeminiResponse } from './hooks/utils';

import { SolarSystem } from './components/3d/SolarSystem';
import { Starfield } from './components/3d/Starfield';
import { CameraRig } from './components/3d/CameraRig';
import { HUDOverlay } from './components/ui/HUDOverlay';
import { HolographicPanel } from './components/ui/HolographicPanel';
import { VoiceController } from './components/ui/VoiceController';

import './index.css';

function App() {
  // ── Navigation ──────────────────────────────────────────────────────────
  const [activeModule, setActiveModule] = useState<ModuleKey>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const planetPositions = useRef<Record<string, THREE.Vector3>>({});

  // ── App State ────────────────────────────────────────────────────────────
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('Awaiting data stream...');
  const [currentThreat, setCurrentThreat] = useState('SECURE 🟢');
  const [threatColor, setThreatColor] = useState('safe');

  // ── Recording ────────────────────────────────────────────────────────────
  const [file, setFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // ── Live Stream ──────────────────────────────────────────────────────────
  const liveIntervalRef = useRef<number | null>(null);
  
  // ── Analysis ─────────────────────────────────────────────────────────────
  const analyze = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm'); // Backend expects 'file'

      const response = await fetch(API_URL, { 
        method: 'POST', 
        headers: {
          'x-gemini-api-key': apiKey || ''
        },
        body: formData 
      });
      const data = await response.json();
      const rawText = data.analysis ?? data.result ?? JSON.stringify(data);
      
      // Clean up markdown block if Gemini wraps it
      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const { threatLevel, colorClass, scenario, isAlert } = parseGeminiResponse(cleanedText);
      setCurrentThreat(threatLevel);
      setThreatColor(colorClass);
      setCurrentScenario(scenario);
      setIsAlertMode(isAlert);

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        content: cleanedText,
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
      
      // AUTO-NAVIGATION REQUIREMENT: ALWAYS fly to Threat Intelligence (reports)
      setActiveModule('reports');
      
    } catch (err) {
      console.error("Backend Error:", err);
      setCurrentScenario("Connection failed. Check backend server.");
    } finally {
      setIsProcessing(false);
    }
  }, [apiKey]);

  const handleFileUpload = useCallback(() => {
    if (file) analyze(file);
  }, [file, analyze]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);

      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        analyze(blob);
        stream.getTracks().forEach(track => track.stop());
        setActiveStream(null);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
    } catch (e) {
      console.error("Mic access denied", e);
    }
  }, [analyze]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ── Live Monitoring ──────────────────────────────────────────────────────
  const analyzeLiveChunk = useCallback(async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'chunk.webm');

      const response = await fetch("http://localhost:8000/api/analyze/stream", { 
        method: 'POST', 
        headers: { 'x-gemini-api-key': apiKey || '' },
        body: formData 
      });
      const data = await response.json();
      const rawText = data.analysis ?? data.result ?? JSON.stringify(data);
      const cleanedText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

      const { threatLevel, colorClass, scenario, isAlert } = parseGeminiResponse(cleanedText);
      setCurrentThreat(threatLevel);
      setThreatColor(colorClass);
      setCurrentScenario(scenario);
      setIsAlertMode(isAlert);

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        content: cleanedText,
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
      if (isAlert) setActiveModule('reports');
    } catch (err) {
      console.error("Stream chunk analysis failed:", err);
    }
  }, [apiKey]);

  const startLiveMonitor = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      setIsRecording(true);
      setCurrentScenario("Live monitoring engaged. Processing ambient audio...");
      setThreatColor('warning');

      // Record in 5-second chunks
      const recordChunk = () => {
        const mr = new MediaRecorder(stream);
        const chunkData: Blob[] = [];
        mr.ondataavailable = e => chunkData.push(e.data);
        mr.onstop = () => {
          if (chunkData.length > 0) {
            const blob = new Blob(chunkData, { type: 'audio/webm' });
            analyzeLiveChunk(blob);
          }
        };
        mr.start();
        setTimeout(() => { if (mr.state === 'recording') mr.stop(); }, 5000);
      };

      recordChunk(); // Start first chunk immediately
      liveIntervalRef.current = window.setInterval(recordChunk, 5100);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setCurrentScenario("Microphone permission denied. Cannot start live monitor.");
    }
  }, [analyzeLiveChunk]);

  const stopLiveMonitor = useCallback(() => {
    if (liveIntervalRef.current) {
      window.clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (activeStream) {
       activeStream.getTracks().forEach(t => t.stop());
       setActiveStream(null);
    }
    setIsRecording(false);
    setCurrentScenario("Monitoring disengaged.");
  }, [activeStream]);

  // ── Voice Navigation ─────────────────────────────────────────────────────
  const handleVoiceNavigate = useCallback((module: ModuleKey) => {
    setActiveModule(module);
  }, []);

  const handleReturn = useCallback(() => {
    setActiveModule(null);
  }, []);

  // ── 3D Scene Interactions ──────────────────────────────────────────────────
  const handlePositionsUpdate = useCallback(
    (newPositions: Record<string, THREE.Vector3>) => {
      // Direct ref mutation. No setState here. Avoids re-rendering Canvas 60fps.
      planetPositions.current = newPositions;
    },
    []
  );

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative font-sans text-white">
      {/* ── 3D Canvas ── */}
      <Canvas
        camera={{ fov: 50, near: 0.1, far: 1000 }}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        onPointerMissed={() => setActiveModule(null)}
      >
        <Starfield />
        <SolarSystem
          activeModule={activeModule}
          isProcessing={isProcessing}
          isAlertMode={isAlertMode}
          onPlanetClick={setActiveModule}
          onSunClick={() => setActiveModule('reports')}
          onPositionsUpdate={handlePositionsUpdate}
        />
        <CameraRig
          activeModule={activeModule}
          planetPositions={planetPositions.current}
          introComplete={introComplete}
          onIntroEnd={() => setIntroComplete(true)}
        />
        {/* <EffectComposer>
          <Bloom luminanceThreshold={1.2} luminanceSmoothing={0.9} intensity={1.5} />
          <Vignette offset={0.3} darkness={0.7} />
        </EffectComposer> */}
      </Canvas>

      {/* ── UI Layer ── */}
      <HUDOverlay
        activeModule={activeModule}
        isAlertMode={isAlertMode}
        introComplete={introComplete}
        setActiveModule={setActiveModule}
      />

      <HolographicPanel
        moduleKey={activeModule}
        file={file}
        setFile={setFile}
        isProcessing={isProcessing}
        isRecording={isRecording}
        handleFileUpload={handleFileUpload}
        startManualRecording={startRecording}
        stopRecording={stopRecording}
        startLiveMonitor={startLiveMonitor}
        stopLiveMonitor={stopLiveMonitor}
        tempApiKey={tempApiKey}
        setTempApiKey={setTempApiKey}
        setApiKey={setApiKey}
        setActiveModule={setActiveModule}
        currentThreat={currentThreat}
        threatColor={threatColor}
        currentScenario={currentScenario}
        logs={logs}
        apiKey={apiKey}
        activeStream={activeStream}
      />

      <VoiceController onNavigate={handleVoiceNavigate} onReturn={handleReturn} />
    </div>
  );
}

export default App;
