import type { AnalysisPayload } from '../types';

export const API_URL = 'http://localhost:8000/api/analyze';

export const parseGeminiResponse = (text: string): AnalysisPayload => {
  let threatLevel = "LOW";
  let colorClass = "safe";
  let scenario = "Monitoring...";
  let isAlert = false;
  
  if (text.includes("CRITICAL") || text.includes("HIGH") || text.includes("EMERGENCY DETECTED: YES")) {
    threatLevel = "CRITICAL 🔴";
    colorClass = "critical";
    isAlert = true;
  } else if (text.includes("MEDIUM") || text.includes("WARNING")) {
    threatLevel = "WARNING 🟡";
    colorClass = "warning";
  }

  const soundsMatch = text.match(/SOUNDS DETECTED:\s*(.*)/i);
  if (soundsMatch) scenario = soundsMatch[1];
  else {
      const abstractMatch = text.match(/FINAL ANSWER:\s*(.*)/i);
      if (abstractMatch) scenario = abstractMatch[1].substring(0, 100) + "...";
  }
  
  return { threatLevel, colorClass, scenario, isAlert };
};
