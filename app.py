import gradio as gr
import google.generativeai as genai
import time
import os
import tempfile
import scipy.io.wavfile
import numpy as np

# ==========================================
# STEP 1: API CONFIGURATION
# ==========================================
# (Using the explicit test key provided by user in prompt)
GOOGLE_API_KEY = "AIzaSyBDvL-ghqn9Foj2wD0qPUwkwn_yNJc2QNk" 
genai.configure(api_key=GOOGLE_API_KEY)

# ==========================================
# STEP 2: DYNAMIC MODEL SELECTION
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
    print("Falling back to default gemini-2.5-flash...")
    model_name = 'models/gemini-2.5-flash'

print(f"Using Model: {model_name}")
model = genai.GenerativeModel(model_name)

# ==========================================
# STEP 3: PROMPTS
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
# STEP 4: BACKEND PROCESSING LOGIC
# ==========================================
def analyze_single_audio(filepath):
    if not filepath:
        return "❌ Please provide an audio file."
    
    upload = None
    try:
        # Determine approx mime
        mime = "audio/webm" if filepath.endswith(".webm") else "audio/wav" if filepath.endswith(".wav") else "audio/mp3"
        print(f"Uploading file {filepath} to Gemini...")
        
        upload = genai.upload_file(path=filepath, mime_type=mime)
        
        while upload.state.name == "PROCESSING":
            time.sleep(1)
            upload = genai.get_file(upload.name)
            
        print("Analyzing with Gemini...")
        response = model.generate_content([standard_prompt, upload])
        return response.text
    except Exception as e:
        import traceback
        traceback.print_exc()
        return f"❌ API Error: {str(e)}"
    finally:
        if upload:
            try:
                genai.delete_file(upload.name)
            except:
                pass


def process_stream(audio_tuple, state_data, history):
    """
    Handles continuous audio streaming from Gradio Microphone component.
    Accumulates fragments until 5 seconds length is reached, then triggers Gemini.
    """
    if audio_tuple is None:
        return state_data, history
    
    sr, data = audio_tuple
    
    # Accumulate chunks
    if state_data is None:
        state_data = data
    else:
        state_data = np.concatenate((state_data, data), axis=0)
        
    duration = state_data.shape[0] / sr
    
    # Process every 5 seconds of accumulated audio
    if duration >= 5.0:
        # Write array to wav file to send over API
        temp_dir = tempfile.gettempdir()
        temp_wav = os.path.join(temp_dir, f"emergency_chunk_{int(time.time())}.wav")
        scipy.io.wavfile.write(temp_wav, sr, state_data)
        
        upload = None
        result_text = ""
        try:
            print(f"Uploading 5s chunk to Gemini... ({temp_wav})")
            upload = genai.upload_file(path=temp_wav, mime_type="audio/wav")
            
            # Wait for file processing at Google side
            while upload.state.name == "PROCESSING":
                time.sleep(1)
                upload = genai.get_file(upload.name)
                
            response = model.generate_content([emergency_prompt, upload])
            result_text = response.text
            print("Received alert response.")
        except Exception as e:
            result_text = f"❌ API Error: {str(e)}"
        finally:
            if upload:
                try:
                    genai.delete_file(upload.name)
                except:
                    pass
            try:
                os.remove(temp_wav)
            except:
                pass
                
        # Format and append update to history feed
        timestamp = time.strftime("%H:%M:%S")
        new_entry = f"### 🕒 **[{timestamp}] Security Scan Update**\n{result_text}"
        
        if history and isinstance(history, str):
            history_list = history.split("\n\n---\n\n")
        else:
            history_list = []
            
        history_list.insert(0, new_entry)
        # Keep recent 10 events max, to keep UI clean and performance healthy
        history = "\n\n---\n\n".join(history_list[:10])
        
        # Flush the buffer for next duration
        state_data = None
        
    return state_data, history


# ==========================================
# STEP 5: GRADIO UI
# ==========================================
custom_css = """
body, .gradio-container {
    font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
    background: linear-gradient(135deg, #000000 0%, #8E0E00 100%) !important;
    background-attachment: fixed !important;
    color: #ffffff !important;
}
.header-text {
    text-align: center;
    color: #ffffff;
    font-size: 2.2rem;
    font-weight: 800;
    text-shadow: 0px 2px 10px rgba(0, 0, 0, 0.8);
    letter-spacing: 1px;
    margin-bottom: 20px;
    padding: 10px;
}
.panel-box {
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 12px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.6) !important;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
}
.live-feed-box {
    border: 2px solid rgba(255, 68, 68, 0.4);
    box-shadow: 0 0 20px rgba(255, 51, 51, 0.2);
    border-radius: 12px;
    padding: 15px;
    background: rgba(0, 0, 0, 0.75) !important;
    backdrop-filter: blur(10px);
}
/* Ensure Gradio Markdown and Text looks good on the dark gradient */
.prose {
    color: #f0f0f0 !important;
}
.prose h3 {
    color: #ffffff !important;
}
/* Hide Gradio footer */
footer {
    display: none !important;
}
"""

theme = gr.themes.Monochrome(
    neutral_hue="slate",
)

with gr.Blocks() as demo:
    gr.HTML("<div class='header-text'>🚨 AI EMERGENCY MONITORING CENTER</div>")
    
    with gr.Tabs():
        # --- TAB 1: UPLOAD ---
        with gr.Tab("📁 File Upload System"):
            gr.Markdown("**Batch Analysis:** Upload an existing audio recording to analyze its scenario.")
            with gr.Row():
                with gr.Column(scale=1):
                    upload_audio = gr.Audio(sources=["upload"], type="filepath", label="Upload Audio")
                    upload_btn = gr.Button("Analyze Extracted Audio", variant="primary", size="lg")
                with gr.Column(scale=2, elem_classes=["panel-box"]):
                    upload_output = gr.Markdown("### 📊 Initializing Report...\n*Awaiting file system upload.*", label="Results")
                    
            upload_btn.click(analyze_single_audio, inputs=[upload_audio], outputs=[upload_output])
            
        # --- TAB 2: MANUAL RECORD ---
        with gr.Tab("🎤 Manual Recording Console"):
            gr.Markdown("**Field Action:** Record a specific situation live using your microphone, click stop, then execute an analysis.")
            with gr.Row():
                with gr.Column(scale=1):
                    manual_audio = gr.Audio(sources=["microphone"], type="filepath", label="Record Field Event")
                    manual_btn = gr.Button("Analyze Recording Trigger", variant="primary", size="lg")
                with gr.Column(scale=2, elem_classes=["panel-box"]):
                    manual_output = gr.Markdown("### 📊 Processing Output...\n*Awaiting recorded packet.*", label="Results")
                    
            manual_btn.click(analyze_single_audio, inputs=[manual_audio], outputs=[manual_output])
            
        # --- TAB 3: LIVE EMERGENCY MONITOR ---
        with gr.Tab("🚨 Live Stream Monitor"):
            gr.Markdown("**SECURITY MODE ACTIVE:** Turn on the microphone to continuously parse background arrays in 5-second intervals.")
            with gr.Row():
                with gr.Column(scale=1):
                    # Uses Gradio's streaming capability to receive chunks continuously
                    live_audio = gr.Audio(sources=["microphone"], streaming=True, type="numpy", label="Live Continuous Mic Feed")
                    gr.HTML("<div style='margin-top: 15px; color: #aaa; font-size: 0.9em;'>ℹ️ Background analysis loop auto-triggers upon crossing the 5-second buffer boundary. Ensure audio capture runs seamlessly.</div>")
                
                with gr.Column(scale=2, elem_classes=["live-feed-box"]):
                    live_state = gr.State(None)
                    live_output = gr.Markdown("### 📡 Real-Time Status Feed\n*Monitoring system offline. Connect recording stream to commence.*")
                    
            # Hook the stream directly to the backend logic
            live_audio.stream(
                process_stream, 
                inputs=[live_audio, live_state, live_output], 
                outputs=[live_state, live_output]
            )

if __name__ == "__main__":
    demo.launch(show_error=True, theme=theme, css=custom_css)
