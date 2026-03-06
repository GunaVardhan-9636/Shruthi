import { motion, AnimatePresence } from 'framer-motion';
import type { ModuleKey, LogEntry } from '../../types';
import { PLANETS } from '../../types';

interface HolographicPanelProps {
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

export function HolographicPanel(props: HolographicPanelProps) {
  const { moduleKey } = props;
  if (!moduleKey) return null;

  const planet = PLANETS.find(p => p.id === moduleKey);
  const accentColor = planet?.color ?? '#FF2E2E';

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '5vh',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(520px, 90vw)',
    maxHeight: '55vh',
    overflowY: 'auto',
    background: 'rgba(5, 5, 15, 0.85)',
    backdropFilter: 'blur(24px)',
    border: `1px solid ${accentColor}55`,
    borderRadius: '20px',
    padding: '28px',
    color: '#fff',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
    boxShadow: `0 0 60px ${accentColor}22, inset 0 0 30px rgba(0,0,0,0.6)`,
    zIndex: 300,
  };

  return (
    <AnimatePresence>
      {moduleKey && (
        <motion.div
          style={panelStyle}
          initial={{ opacity: 0, y: 60, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 60, scale: 0.92 }}
          transition={{ type: 'spring', damping: 22, stiffness: 200 }}
        >
          {/* Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: `1px solid ${accentColor}33` }}>
            <div style={{ fontSize: '2.2rem' }}>{planet?.icon}</div>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.1rem', color: accentColor, letterSpacing: '2px', textTransform: 'uppercase' }}>
                {planet?.name}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '1px', marginTop: '3px', textTransform: 'uppercase' }}>
                {planet?.subtitle}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: accentColor, boxShadow: `0 0 12px ${accentColor}` }} />
          </div>

          {/* Module-specific content */}
          <PanelContent {...props} accentColor={accentColor} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PanelContent(props: HolographicPanelProps & { accentColor: string }) {
  const {
    moduleKey, file, setFile, isProcessing, isRecording,
    handleFileUpload, startManualRecording, stopRecording,
    startLiveMonitor, stopLiveMonitor, tempApiKey, setTempApiKey,
    setApiKey, setActiveModule, currentThreat, threatColor,
    currentScenario, logs, apiKey, accentColor
  } = props;

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '13px', marginTop: '12px',
    background: `${accentColor}22`, border: `1px solid ${accentColor}`,
    color: '#fff', borderRadius: '12px', cursor: 'pointer',
    fontFamily: 'Orbitron, monospace', fontSize: '0.75rem', letterSpacing: '2px',
    textTransform: 'uppercase', transition: 'all 0.3s',
  };

  const bars = [1, 2, 3, 4, 5, 6, 7];

  switch (moduleKey) {
    case 'upload':
      return (
        <div>
          <label style={{ display: 'block', border: '2px dashed #ffffff22', borderRadius: '14px', padding: '30px', textAlign: 'center', cursor: 'pointer', background: '#ffffff05', position: 'relative' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📁</div>
            <div style={{ fontWeight: 600 }}>Drop Audio Evidence Here</div>
            <div style={{ color: '#777', fontSize: '0.85rem', marginTop: '4px' }}>or click to upload (.wav, .mp3, .webm)</div>
            <input type="file" accept="audio/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {file && <div style={{ color: '#00ff9c', textAlign: 'center', marginTop: '10px', fontSize: '0.85rem' }}>✓ {file.name}</div>}
          <button style={{ ...btnStyle, opacity: (!file || isProcessing) ? 0.5 : 1, cursor: (!file || isProcessing) ? 'not-allowed' : 'pointer' }} onClick={handleFileUpload} disabled={!file || isProcessing}>
            {isProcessing ? '⏳ Scanning Signatures...' : '⚡ Analyze Extracted Audio'}
          </button>
        </div>
      );

    case 'manual':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '60px', margin: '10px 0' }}>
            {bars.map(i => (
              <div key={i} style={{ width: '5px', background: isRecording ? accentColor : '#333', borderRadius: '4px', height: isRecording ? `${16 + (i % 4) * 12}px` : '4px', transition: 'all 0.3s', boxShadow: isRecording ? `0 0 8px ${accentColor}` : 'none' }} />
            ))}
          </div>
          {!isRecording
            ? <button style={btnStyle} onClick={startManualRecording} disabled={isProcessing}>🔴 Initiate Field Recording</button>
            : <button style={btnStyle} onClick={stopRecording}>⏹ Conclude &amp; Analyze</button>}
        </div>
      );

    case 'live':
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', height: '60px', margin: '10px 0' }}>
            {bars.map(i => (
              <div key={i} style={{ width: '5px', background: isRecording ? accentColor : '#333', borderRadius: '4px', height: isRecording ? `${12 + (i % 5) * 10}px` : '4px', transition: 'all 0.3s' }} />
            ))}
          </div>
          {!isRecording
            ? <button style={btnStyle} onClick={startLiveMonitor} disabled={isProcessing}>📡 Engage Live Sensors</button>
            : <button style={btnStyle} onClick={stopLiveMonitor}>🔴 Disengage Sensors</button>}
        </div>
      );

    case 'settings':
      return (
        <div>
          <p style={{ color: '#777', fontSize: '0.85rem', marginBottom: '14px' }}>Override system defaults with secured credentials.</p>
          <input
            type="password" placeholder="Gemini API Key"
            value={tempApiKey || apiKey} onChange={e => setTempApiKey(e.target.value)}
            style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1px solid #333', background: '#080808', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }}
          />
          <button style={btnStyle} onClick={() => { setApiKey(tempApiKey); setActiveModule(null); }}>
            🔐 Save Secure Key &amp; Return
          </button>
        </div>
      );

    case 'reports': {
      const tColor = threatColor === 'critical' ? '#FF2E2E' : threatColor === 'warning' ? '#FFB020' : '#00FF9C';
      return (
        <div>
          <div style={{ background: '#0a0a1a', padding: '14px', borderRadius: '12px', marginBottom: '12px', borderLeft: `4px solid ${tColor}` }}>
            <div style={{ color: '#666', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '5px', fontFamily: 'Orbitron, monospace' }}>THREAT LEVEL</div>
            <div style={{ color: tColor, fontWeight: 700, fontSize: '1.1rem' }}>{currentThreat}</div>
          </div>
          <div style={{ background: '#0a0a1a', padding: '14px', borderRadius: '12px', marginBottom: '12px', borderLeft: '4px solid #333' }}>
            <div style={{ color: '#666', fontSize: '0.7rem', letterSpacing: '2px', marginBottom: '5px', fontFamily: 'Orbitron, monospace' }}>DETECTED SCENARIO</div>
            <div style={{ fontSize: '0.85rem' }}>{currentScenario}</div>
          </div>
          <div style={{ color: '#555', fontSize: '0.7rem', letterSpacing: '2px', fontFamily: 'Orbitron, monospace', marginBottom: '8px' }}>RAW TELEMETRY</div>
          <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {logs.length === 0 && <p style={{ color: '#444', fontStyle: 'italic', fontSize: '0.8rem' }}>No telemetry data.</p>}
            {logs.map(log => (
              <div key={log.id} style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#bbb', padding: '8px', background: '#050510', borderLeft: `2px solid ${accentColor}` }}>
                <span style={{ color: '#555', fontWeight: 700 }}>[{log.timestamp}]</span>{' '}
                {log.content.substring(0, 120)}{log.content.length > 120 ? '...' : ''}
              </div>
            ))}
          </div>
        </div>
      );
    }

    default: return null;
  }
}
