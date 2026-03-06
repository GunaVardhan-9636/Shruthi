

// ─── Module Keys ────────────────────────────────────────────────────────────
export type ModuleKey = 'upload' | 'manual' | 'live' | 'settings' | 'reports' | null;

// ─── Log Entry ───────────────────────────────────────────────────────────────
export interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
}

// ─── Analysis Payload ────────────────────────────────────────────────────────
export interface AnalysisPayload {
  threatLevel: string;
  colorClass: string;
  scenario: string;
  isAlert: boolean;
}

// ─── Planet Config ───────────────────────────────────────────────────────────
export interface PlanetConfig {
  id: ModuleKey;
  name: string;
  subtitle: string;
  color: string;           // hex color for glow / shader
  emissive: string;        // slightly different emissive color
  orbitRadius: number;     // units from sun center
  orbitSpeed: number;      // radians per second
  size: number;            // sphere radius
  icon: string;            // emoji icon
  description: string;
  voiceAliases: string[];  // phrases recognized by voice controller
  hasRings?: boolean;      // Threat Intelligence gets rings
  hasMoon?: boolean;
  hasSignalPulse?: boolean; // Live Stream communication pulses
}

// ─── Planet Data ─────────────────────────────────────────────────────────────
export const PLANETS: PlanetConfig[] = [
  {
    id: 'upload',
    name: 'Upload Evidence',
    subtitle: 'Audio Archive Node',
    color: '#FFB020',
    emissive: '#FF8C00',
    orbitRadius: 8,
    orbitSpeed: 0.28,
    size: 0.9,
    icon: '📁',
    description: 'Upload audio files for AI threat detection and evidence analysis.',
    voiceAliases: ['upload evidence', 'open upload', 'evidence'],
  },
  {
    id: 'manual',
    name: 'Record Audio',
    subtitle: 'Field Recording Node',
    color: '#FF6B35',
    emissive: '#FF2E2E',
    orbitRadius: 12,
    orbitSpeed: 0.2,
    size: 0.75,
    icon: '🎤',
    description: 'Record live audio from microphone for real-time AI analysis.',
    voiceAliases: ['record audio', 'open record', 'record', 'microphone'],
  },
  {
    id: 'live',
    name: 'Live Stream',
    subtitle: 'Continuous Monitor Node',
    color: '#00FFEA',
    emissive: '#00C8C8',
    orbitRadius: 16,
    orbitSpeed: 0.15,
    size: 1.0,
    icon: '📡',
    description: 'Monitor continuous audio streams for real-time threat detection.',
    voiceAliases: ['live stream', 'open live', 'stream', 'live'],
    hasSignalPulse: true,
  },
  {
    id: 'reports',
    name: 'Threat Intelligence',
    subtitle: 'Analysis & Reporting Node',
    color: '#B040FF',
    emissive: '#7B00FF',
    orbitRadius: 20,
    orbitSpeed: 0.1,
    size: 1.2,
    icon: '📊',
    description: 'View AI analysis reports, threat scores, and anomaly detection data.',
    voiceAliases: ['threat intelligence', 'open reports', 'intelligence', 'reports'],
    hasRings: true,
  },
  {
    id: 'settings',
    name: 'System Settings',
    subtitle: 'Configuration Node',
    color: '#40A0FF',
    emissive: '#0060FF',
    orbitRadius: 25,
    orbitSpeed: 0.07,
    size: 0.85,
    icon: '⚙️',
    description: 'Configure AI detection parameters and system credentials.',
    voiceAliases: ['system settings', 'open settings', 'settings', 'configure'],
    hasMoon: true,
  },
];

// ─── Camera Targets ──────────────────────────────────────────────────────────
export const PLANET_START_ANGLES: Record<string, number> = {
  upload: 0,
  manual: Math.PI * 0.4,
  live: Math.PI * 0.9,
  reports: Math.PI * 1.4,
  settings: Math.PI * 1.9,
};
