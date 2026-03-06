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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // ── Analysis ─────────────────────────────────────────────────────────────
  const analyze = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.wav');
      formData.append('api_key', apiKey);

      const response = await fetch(API_URL, { method: 'POST', body: formData });
      const data = await response.json();
      const rawText = data.analysis ?? data.result ?? JSON.stringify(data);

      const { threatLevel, colorClass, scenario, isAlert } = parseGeminiResponse(rawText);
      setCurrentThreat(threatLevel);
      setThreatColor(colorClass);
      setCurrentScenario(scenario);
      setIsAlertMode(isAlert);

      const newLog: LogEntry = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        content: rawText,
      };
      setLogs(prev => [newLog, ...prev].slice(0, 50));
      if (isAlert) setActiveModule('reports');
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  }, [apiKey]);

  const handleFileUpload = useCallback(() => {
    if (file) analyze(file);
  }, [file, analyze]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
      analyze(blob);
    };
    mr.start();
    mediaRecorderRef.current = mr;
    setIsRecording(true);
  }, [analyze]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  }, []);

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
        startLiveMonitor={startRecording}
        stopLiveMonitor={stopRecording}
        tempApiKey={tempApiKey}
        setTempApiKey={setTempApiKey}
        setApiKey={setApiKey}
        setActiveModule={setActiveModule}
        currentThreat={currentThreat}
        threatColor={threatColor}
        currentScenario={currentScenario}
        logs={logs}
        apiKey={apiKey}
      />

      <VoiceController onNavigate={handleVoiceNavigate} onReturn={handleReturn} />
    </div>
  );
}

export default App;
