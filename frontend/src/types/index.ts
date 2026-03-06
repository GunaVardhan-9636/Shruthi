export interface LogEntry {
  id: string;
  timestamp: string;
  content: string;
}

export interface AnalysisPayload {
  threatLevel: string;
  colorClass: string;
  scenario: string;
  isAlert: boolean;
}

export type ModuleKey = 'upload' | 'manual' | 'live' | 'settings' | 'reports' | null;

export const spatialNodes = {
  upload: { position: [-6, 0.5, 0] as [number, number, number], title: 'Upload Evidence', desc: 'Upload audio files for AI detection.', icon: '📁' },
  manual: { position: [0, -3.5, 0] as [number, number, number], title: 'Record Audio', desc: 'Record live audio for analysis.', icon: '🎤' },
  live: { position: [6, 0.5, 0] as [number, number, number], title: 'Live Stream', desc: 'Monitor continuous streams.', icon: '📡' },
  settings: { position: [-4.5, 3.5, -2] as [number, number, number], title: 'System Settings', desc: 'Configure AI detection parameters.', icon: '⚙️' },
  reports: { position: [4.5, 3.5, -2] as [number, number, number], title: 'Threat Intelligence', desc: 'View AI analysis data.', icon: '📊' }
} as const;
