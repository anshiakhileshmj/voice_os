
#!/usr/bin/env python3
import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("Installing TTS requirements...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("Requirements installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        return False

def start_server():
    """Start the TTS server"""
    print("Starting TTS server...")
    try:
        subprocess.run([sys.executable, "tts_server.py"])
    except KeyboardInterrupt:
        print("\nTTS server stopped.")

if __name__ == "__main__":
    print("=== Coqui TTS Server Setup ===")
    
    # Check if we're in the right directory
    if not os.path.exists("requirements.txt"):
        print("Error: requirements.txt not found. Make sure you're in the tts directory.")
        sys.exit(1)
    
    # Install requirements
    if install_requirements():
        # Start server
        start_server()
    else:
        print("Failed to install requirements. Please check your Python environment.")
        sys.exit(1)
