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

# ==========================================
# 1. API CONFIGURATION
# ==========================================
GOOGLE_API_KEY = "AIzaSyBDvL-ghqn9Foj2wD0qPUwkwn_yNJc2QNk" 
genai.configure(api_key=GOOGLE_API_KEY)

# ==========================================
# 2. MODEL SELECTION
# ==========================================
print("Finding the best available model...")
model_name = None
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            if 'flash' in m.name:
                model_name = m.name
                break
except Exception as e:
    print(f"Error fetching models: {e}")

if not model_name:
    model_name = 'models/gemini-2.5-flash'
print(f"Using Model: {model_name}")
model = genai.GenerativeModel(model_name)

# ==========================================
# 3. FASTAPI SETUP & CORS
# ==========================================
app = FastAPI(title="AI Emergency Monitor Backend")

# Allow requests from the Vite frontend (usually port 5173 or 5174)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 4. PROMPTS
# ==========================================
standard_prompt = """
Listen to this audio carefully. It may contain speech in **English** or any **Indian Language** (Hindi, Telugu, Tamil, Malayalam, Kannada, Bengali, Marathi, etc.), or a mix of both.

Perform the following analysis in a structured format:

1. **Language Detection**:
   - Identify the primary language(s) spoken in the clip.

2. **Timeline Analysis ⏱️**:
   - Provide a chronological, timestamped breakdown of events in the audio.
   - Format example: `[00:00 - 00:05] Sound of traffic and honking.`
   - Format example: `[00:06 - 00:15] Person 1 speaks in Hindi.`
   - Include both significant background sounds and speech segments.

3. **Verbatim Transcription**:
   - Write exactly what was said.
   - If it is English, write in English.
   - If it is an Indian language, write in the **Native Script** (e.g., Telugu script).

4. **English Translation**:
   - If the speech is NOT in English, provide a clear translation.
   - If it is already in English, just say "N/A".

5. **Scenario Analysis (The Core Task)**:
   - Listen to the **Background Sounds** (traffic, announcements, nature, machines, etc.).
   - Combine the **Speech Meaning** with the **Sounds**.
   - **FINAL ANSWER**: Describe the full scenario. What is the person doing, where are they, and what is happening around them?
"""

emergency_prompt = """
You are an AI Emergency Monitoring System. Listen to this short audio clip. 
Your ONLY job is to detect if an emergency is occurring. 
Listen for:
- Keywords: "Help", "Bachao", "Kaapaadunga", "Stop", "Fire", etc.
- Sounds: Screaming, crying, glass breaking, loud crashes, gunshots, or aggressive altercations.

Output STRICTLY in this format:
🚨 EMERGENCY DETECTED: [YES or NO]
🔊 SOUNDS DETECTED: [Brief 1-sentence description of background noises]
🗣️ TRANSCRIPT/TRANSLATION: [What was said, translated to English if needed. If nothing, write N/A]
⚠️ THREAT LEVEL: [LOW, MEDIUM, or HIGH]
"""

# ==========================================
# 5. CORE BUSINESS LOGIC (Extracted from Gradio)
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
        response = model.generate_content([prompt, upload])
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
    else:
        # Fallback to the default environment key
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
    """Receives a 5-second chunk from the live microphone.
    Optimized: For small 5s chunks, we send the binary payload inline 
    to avoid burning through the Gemini File API quotas and processing delays.
    """
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
        
        print("Analyzing 5s chunk inline with Gemini (Optimized Route)...")
        response = model.generate_content([emergency_prompt, inline_audio])
        
        return {"success": True, "result": response.text, "timestamp": time.strftime("%H:%M:%S")}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "AI Emergency Monitor API"}

if __name__ == "__main__":
    import uvicorn
    # Use standard 8000 for backend
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
