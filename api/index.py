import os
import time
import tempfile
import scipy.io.wavfile
import numpy as np
import traceback
from typing import Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from mangum import Mangum

# ==========================================
# 1. API CONFIGURATION
# ==========================================
# Read API key from environment variable for Vercel deployment
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# ==========================================
# 2. MODEL SELECTION
# ==========================================
model_name = 'models/gemini-2.5-flash'
model = genai.GenerativeModel(model_name)

# ==========================================
# 3. FASTAPI SETUP & CORS
# ==========================================
app = FastAPI(title="AI Emergency Monitor Backend")

# Allow requests from the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, this allows Vercel multi-deployment access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. PROMPTS (JSON STRUCTURED)
# ==========================================
standard_prompt = """
Listen to this audio carefully. It may contain speech in **English** or any **Indian Language** (Hindi, Telugu, Tamil, Malayalam, Kannada, Bengali, Marathi, etc.), or a mix of both, or just background sounds.

Perform the analysis and output STRICTLY as a JSON object with the following schema:
{
  "language_detection": "Primary language(s) spoken, or 'None' if no speech.",
  "timeline_analysis": "Chronological breakdown of events. e.g. [00:00-00:05] sound of traffic...",
  "verbatim_transcription": "Exact transcription in Native Script or English.",
  "english_translation": "Clear English translation of the speech, or 'N/A'.",
  "sounds_detected": "Brief description of background noises like traffic, machines, etc.",
  "scenario_analysis": "Describe the full scenario. What is the person doing, where are they?",
  "emergency_detected": "YES or NO",
  "threat_level": "LOW, MEDIUM, or HIGH"
}
"""

emergency_prompt = """
You are an AI Emergency Monitoring System. Listen to this short audio clip. 
Your ONLY job is to detect if an emergency is occurring. 
Listen for keywords (Help, Bachao, Fire, etc.) and sounds (Screaming, crashes, gunshots).

Output STRICTLY as a JSON object with the following schema:
{
  "emergency_detected": "YES or NO",
  "sounds_detected": "Brief 1-sentence description of background noises",
  "english_translation": "What was said, translated to English. Or 'N/A'.",
  "threat_level": "LOW, MEDIUM, or HIGH",
  "scenario_analysis": "Very brief summary of the immediate threat situation."
}
"""

# ==========================================
# 5. CORE BUSINESS LOGIC
# ==========================================
def process_audio_file(filepath: str, prompt: str, mime_type: str = "audio/webm"):
    upload = None
    try:
        print(f"Uploading file {filepath} to Gemini (MIME: {mime_type})...")
        upload = genai.upload_file(path=filepath, mime_type=mime_type)
        
        while upload.state.name == "PROCESSING":
            time.sleep(1)
            upload = genai.get_file(upload.name)
            
        print("Analyzing with Gemini...")
        response = model.generate_content(
            [prompt, upload],
            generation_config={"response_mime_type": "application/json"}
        )
        return response.text
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if upload:
            try:
                genai.delete_file(upload.name)
            except:
                pass


# ==========================================
# 6. REST API ENDPOINTS
# ==========================================
def apply_custom_key(custom_key: Optional[str]):
    if custom_key:
        genai.configure(api_key=custom_key)
    elif GOOGLE_API_KEY:
        genai.configure(api_key=GOOGLE_API_KEY)

@app.post("/api/analyze/standard")
async def analyze_standard(file: UploadFile = File(...), x_gemini_api_key: Optional[str] = Header(None)):
    """Receives an uploaded audio file and runs the standard scenario analysis."""
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, f"standard_upload_{int(time.time())}_{file.filename}")
    
    try:
        apply_custom_key(x_gemini_api_key)
        # Save uploaded file locally
        with open(temp_path, "wb") as buffer:
            buffer.write(await file.read())
            
        mime = "audio/webm" if temp_path.endswith((".webm", "weba")) else "audio/mp3" if temp_path.endswith(".mp3") else "audio/wav"
        
        result = process_audio_file(temp_path, standard_prompt, mime)
        return {"success": True, "result": result}
    finally:
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/analyze/stream")
async def analyze_stream(file: UploadFile = File(...), x_gemini_api_key: Optional[str] = Header(None)):
    """Receives a 5-second chunk from the live microphone."""
    try:
        apply_custom_key(x_gemini_api_key)
        audio_bytes = await file.read()
        
        # Determine MIME
        mime_type = file.content_type or "audio/webm"
        if "wav" in mime_type: mime_type = "audio/wav"
        elif "mp4" in mime_type: mime_type = "audio/mp4"
        elif "mpeg" in mime_type or "mp3" in mime_type: mime_type = "audio/mp3"

        # Pass inline part to Gemini for immediate processing
        inline_audio = {
            "mime_type": mime_type,
            "data": audio_bytes
        }
        
        print("Analyzing 5s chunk inline with Gemini...")
        response = model.generate_content(
            [emergency_prompt, inline_audio],
            generation_config={"response_mime_type": "application/json"}
        )
        
        return {"success": True, "result": response.text, "timestamp": time.strftime("%H:%M:%S")}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/health")
@app.get("/")
async def health_check():
    return {"status": "ok", "service": "AI Emergency Monitor API", "deployment": "Netlify/Vercel"}

# Wrap the app for Netlify Functions (AWS Lambda)
handler = Mangum(app)

