import type { AnalysisPayload } from '../types';

export const API_URL = 'http://localhost:8000/api/analyze/standard';

export const parseGeminiResponse = (text: string): AnalysisPayload => {
  let threatLevel = "LOW";
  let colorClass = "safe";
  let scenario = "Monitoring...";
  let isAlert = false;
  
  try {
    const cleanedText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    
    const threat = (parsed.threat_level || "").toUpperCase();
    const emergency = (parsed.emergency_detected || "").toUpperCase();
    
    if (threat === "HIGH" || emergency === "YES") {
      threatLevel = "CRITICAL 🔴";
      colorClass = "critical";
      isAlert = true;
    } else if (threat === "MEDIUM") {
      threatLevel = "WARNING 🟡";
      colorClass = "warning";
    } else {
      threatLevel = "SECURE 🟢";
      colorClass = "safe";
    }
    
    scenario = parsed.scenario_analysis || "Analysis complete.";
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    // Fallback if the AI fails to generate strict JSON
    if (text.includes("HIGH") || text.includes("CRITICAL")) {
      threatLevel = "CRITICAL 🔴";
      colorClass = "critical";
      isAlert = true;
    }
    scenario = text.substring(0, 150) + "...";
  }
  
  return { threatLevel, colorClass, scenario, isAlert };
};
