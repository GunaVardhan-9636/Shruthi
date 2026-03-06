import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ModuleKey } from '../../types';
import { PLANETS } from '../../types';

interface VoiceControllerProps {
  onNavigate: (module: ModuleKey) => void;
  onReturn: () => void;
}

export function VoiceController({ onNavigate, onReturn }: VoiceControllerProps) {
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [supported, setSupported] = useState(true);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }
    const recog = new SpeechRecognition();
    recog.continuous = false;
    recog.interimResults = false;
    recog.lang = 'en-US';

    recog.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().trim();
      setFeedback(`Recognized: "${transcript}"`);

      if (transcript.includes('return') || transcript.includes('solar') || transcript.includes('overview')) {
        setFeedback('Voice Command: Returning to Solar System');
        onReturn();
      } else {
        let matched = false;
        for (const planet of PLANETS) {
          if (planet.voiceAliases.some(alias => transcript.includes(alias))) {
            setFeedback(`Voice Command: Opening ${planet.name}`);
            onNavigate(planet.id);
            matched = true;
            break;
          }
        }
        if (!matched) setFeedback(`Command not recognized: "${transcript}"`);
      }

      setTimeout(() => setFeedback(''), 3000);
      setListening(false);
    };

    recog.onerror = () => { setListening(false); setFeedback('Voice error — try again'); setTimeout(() => setFeedback(''), 2000); };
    recog.onend = () => setListening(false);
    recogRef.current = recog;
  }, [onNavigate, onReturn]);

  const toggle = () => {
    if (!recogRef.current) return;
    if (listening) {
      recogRef.current.stop();
    } else {
      try { recogRef.current.start(); setListening(true); setFeedback('Listening...'); } catch (_) { /* already running */ }
    }
  };

  if (!supported) return null;

  return (
    <>
      {/* Mic button */}
      <button
        onClick={toggle}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '54px', height: '54px', borderRadius: '50%',
          background: listening ? 'rgba(255,46,46,0.8)' : 'rgba(20,20,40,0.8)',
          border: `2px solid ${listening ? '#ff4444' : '#444'}`,
          color: '#fff', fontSize: '1.3rem', cursor: 'pointer',
          backdropFilter: 'blur(12px)', zIndex: 500,
          boxShadow: listening ? '0 0 30px #ff444488' : 'none',
          transition: 'all 0.3s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        title="Voice Command"
      >
        {listening ? '⏹' : '🎙'}
      </button>

      {/* Listening pulse ring */}
      {listening && (
        <div style={{
          position: 'fixed', bottom: '16px', right: '16px',
          width: '70px', height: '70px', borderRadius: '50%',
          border: '2px solid #ff4444', animation: 'ping 1.2s infinite',
          opacity: 0.5, zIndex: 499, pointerEvents: 'none',
        }} />
      )}

      {/* Feedback banner */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            key={feedback}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: '88px', right: '24px',
              background: 'rgba(5,5,20,0.9)', border: '1px solid #FF2E2E55',
              color: '#fff', padding: '10px 16px', borderRadius: '12px',
              fontFamily: 'Orbitron, monospace', fontSize: '0.7rem',
              letterSpacing: '1px', maxWidth: '280px', textAlign: 'right',
              backdropFilter: 'blur(12px)', zIndex: 500,
              boxShadow: '0 0 20px rgba(255,46,46,0.2)',
            }}
          >
            🎙 {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
