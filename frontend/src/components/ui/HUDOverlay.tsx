import { motion, AnimatePresence } from 'framer-motion';
import type { ModuleKey } from '../../types';
import { PLANETS } from '../../types';

interface HUDOverlayProps {
  activeModule: ModuleKey;
  isAlertMode: boolean;
  introComplete: boolean;
  setActiveModule: (m: ModuleKey) => void;
}

export function HUDOverlay({ activeModule, isAlertMode, introComplete, setActiveModule }: HUDOverlayProps) {
  const planet = PLANETS.find(p => p.id === activeModule);

  return (
    <div style={{
      position: 'fixed', inset: 0, pointerEvents: 'none',
      zIndex: 200, fontFamily: 'Orbitron, monospace',
    }}>
      {/* Top bar */}
      <AnimatePresence>
        {introComplete && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
              pointerEvents: 'none',
            }}
          >
            {/* Title */}
            <div>
              <div style={{ fontSize: '0.65rem', color: '#666', letterSpacing: '4px', marginBottom: '2px' }}>INTELLIGENT AUDIO THREAT DETECTION</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '3px', color: '#fff', textShadow: '0 0 20px rgba(255,46,46,0.5)' }}>
                श्रुति<span style={{ color: '#FF4040', marginLeft: '10px', fontSize: '1rem' }}>SHRUTI</span>
              </div>
            </div>

            {/* Status pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', pointerEvents: 'auto' }}>
              <div style={{
                padding: '6px 14px', borderRadius: '20px',
                background: isAlertMode ? 'rgba(255,46,46,0.2)' : 'rgba(0,255,100,0.1)',
                border: `1px solid ${isAlertMode ? '#FF4444' : '#00FF6480'}`,
                fontSize: '0.6rem', letterSpacing: '2px', color: isAlertMode ? '#FF4444' : '#00FF64',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: isAlertMode ? '#FF4444' : '#00FF64',
                  boxShadow: `0 0 8px ${isAlertMode ? '#FF4444' : '#00FF64'}`,
                  animation: isAlertMode ? 'ping 1s infinite' : undefined,
                }} />
                {isAlertMode ? 'SYSTEM ALERT' : 'CORE ONLINE'}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Breadcrumb when planet active */}
      <AnimatePresence>
        {introComplete && activeModule && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setActiveModule(null)}
            style={{
              position: 'absolute', top: '70px', left: '24px',
              background: 'rgba(5,5,20,0.8)', backdropFilter: 'blur(12px)',
              border: `1px solid ${planet?.color ?? '#444'}55`,
              color: '#fff', padding: '8px 18px', borderRadius: '20px',
              fontSize: '0.65rem', letterSpacing: '2px', cursor: 'pointer',
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: `0 0 20px ${planet?.color ?? '#444'}22`,
            }}
          >
            ‹ SOLAR SYSTEM
          </motion.button>
        )}
      </AnimatePresence>

      {/* Module trajectory confirmation */}
      <AnimatePresence>
        {introComplete && activeModule && planet && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', top: '70px', right: '24px',
              background: 'rgba(5,5,20,0.7)', border: `1px solid ${planet.color}44`,
              color: planet.color, padding: '8px 16px', borderRadius: '12px',
              fontSize: '0.6rem', letterSpacing: '2px', backdropFilter: 'blur(8px)',
            }}
          >
            ⟶ TRAJECTORY LOCKED: {planet.name.toUpperCase()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert banner */}
      <AnimatePresence>
        {isAlertMode && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0.8 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(255,30,30,0.85)', border: '1px solid #FF4444',
              color: '#fff', padding: '10px 28px', borderRadius: '30px',
              fontSize: '0.7rem', letterSpacing: '2px',
              boxShadow: '0 0 50px rgba(255,44,44,0.6)',
              backdropFilter: 'blur(12px)',
            }}
          >
            🚨 CRITICAL EVENT DETECTED — AWAITING RESPONSE PROCEDURE
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro guide */}
      <AnimatePresence>
        {introComplete && !activeModule && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
              color: '#666', fontSize: '0.6rem', letterSpacing: '3px', textAlign: 'center',
              pointerEvents: 'none',
            }}
          >
            CLICK A PLANET TO ENGAGE MODULE · USE 🎙 VOICE COMMAND TO NAVIGATE
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
