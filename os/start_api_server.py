
#!/usr/bin/env python3
"""
Startup script for MJAK Automation API Server
This script ensures all dependencies are installed and starts the FastAPI server
"""

import sys
import subprocess
import os
import logging
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_requirements():
    """Install required packages"""
    try:
        logger.info("Installing required packages...")
        
        # First upgrade pip
        subprocess.check_call([sys.executable, "-m", "pip", "install", "--upgrade", "pip"])
        
        # Install requirements from file if it exists
        req_file = os.path.join(os.path.dirname(__file__), "requirements_full.txt")
        if os.path.exists(req_file):
            logger.info(f"Installing from {req_file}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", req_file])
        
        # Install essential packages
        essential_packages = [
            "fastapi",
            "uvicorn[standard]",
            "pydantic",
            "python-dotenv",
            "google-generativeai",
            "pyautogui",
            "python-multipart",
            "pillow"
        ]
        
        for package in essential_packages:
            try:
                logger.info(f"Installing {package}...")
                subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            except subprocess.CalledProcessError:
                logger.warning(f"Failed to install {package}, continuing...")
        
        # Install the operate package in development mode
        try:
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-e", "."])
        except subprocess.CalledProcessError:
            logger.warning("Failed to install operate package in development mode")
            
        logger.info("Package installation completed!")
        
    except Exception as e:
        logger.error(f"Error during package installation: {e}")
        return False
    return True

def check_config():
    """Check if the configuration is valid"""
    try:
        from operate.config import Config
        config = Config()
        config.validation()
        logger.info("Configuration is valid!")
        return True
    except Exception as e:
        logger.warning(f"Configuration check failed: {e}")
        logger.info("Server will start but some features may not work without proper API keys")
        return True  # Continue anyway

def main():
    """Main function to start the API server"""
    logger.info("Starting MJAK Automation API Server...")
    
    # Change to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Install requirements
    if not install_requirements():
        logger.error("Failed to install requirements. Continuing anyway...")
    
    # Small delay to ensure everything is ready
    time.sleep(1)
    
    # Check configuration
    check_config()
    
    # Start the API server
    try:
        logger.info("Starting FastAPI server on http://localhost:8000")
        logger.info("API Documentation available at: http://localhost:8000/docs")
        
        import uvicorn
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=8000,
            reload=False,  # Disable reload in production
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        logger.error("Make sure Python and all dependencies are properly installed")
        input("Press Enter to exit...")
        sys.exit(1)

if __name__ == "__main__":
    main()
