
import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from TTS.api import TTS
import numpy as np
import soundfile as sf
from pydub import AudioSegment
import tempfile

app = Flask(__name__)
CORS(app)

# Initialize TTS with a good male English voice model
# Using Tacotron2 + WaveGlow for high quality synthesis
tts_model = None

def initialize_tts():
    global tts_model
    try:
        # Initialize with a male English voice model
        # This model provides good male voice synthesis
        tts_model = TTS(model_name="tts_models/en/ljspeech/tacotron2-DDC_ph", progress_bar=False)
        print("TTS model initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing TTS model: {e}")
        try:
            # Fallback to a different model if the first one fails
            tts_model = TTS(model_name="tts_models/en/ljspeech/fast_speech2", progress_bar=False)
            print("TTS model initialized with fallback")
            return True
        except Exception as e2:
            print(f"Error with fallback model: {e2}")
            return False

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "model_loaded": tts_model is not None})

@app.route('/synthesize', methods=['POST'])
def synthesize_speech():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({"error": "Text is required"}), 400
            
        if not tts_model:
            return jsonify({"error": "TTS model not initialized"}), 500
            
        print(f"Synthesizing text: {text[:50]}...")
        
        # Create a temporary file for audio output
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            temp_path = tmp_file.name
        
        try:
            # Generate speech
            tts_model.tts_to_file(
                text=text,
                file_path=temp_path,
                # Adjust voice characteristics for more masculine sound
                speed=0.9,  # Slightly slower for deeper perception
            )
            
            # Load the audio file and convert to base64
            audio_segment = AudioSegment.from_wav(temp_path)
            
            # Apply some post-processing for more masculine voice
            # Lower the pitch slightly
            audio_segment = audio_segment._spawn(
                audio_segment.raw_data,
                overrides={"frame_rate": int(audio_segment.frame_rate * 0.95)}
            ).set_frame_rate(audio_segment.frame_rate)
            
            # Export to MP3 for better compression
            mp3_buffer = io.BytesIO()
            audio_segment.export(mp3_buffer, format="mp3", bitrate="128k")
            mp3_data = mp3_buffer.getvalue()
            
            # Convert to base64
            audio_base64 = base64.b64encode(mp3_data).decode('utf-8')
            
            print("Speech synthesis completed successfully")
            
            return jsonify({
                "audio_data": audio_base64,
                "content_type": "audio/mp3",
                "text": text
            })
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        print(f"Error in speech synthesis: {e}")
        return jsonify({"error": f"Speech synthesis failed: {str(e)}"}), 500

@app.route('/voices', methods=['GET'])
def get_available_voices():
    """Return information about available voices"""
    return jsonify({
        "voices": [
            {
                "id": "male_english_default",
                "name": "Male English (Default)",
                "language": "en",
                "gender": "male",
                "description": "High-quality male English voice using Tacotron2"
            }
        ],
        "current_voice": "male_english_default"
    })

if __name__ == '__main__':
    print("Starting TTS Server...")
    if initialize_tts():
        print("TTS Server ready on port 5001")
        app.run(host='0.0.0.0', port=5001, debug=False)
    else:
        print("Failed to initialize TTS model. Server not started.")
