
#!/usr/bin/env python3
"""
Startup script for MJAK Automation API Server
This script ensures all dependencies are installed and starts the FastAPI server
"""

import sys
import subprocess
import os
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def install_requirements():
    """Install required packages"""
    try:
        logger.info("Installing required packages...")
        
        # Install FastAPI and related packages
        packages = [
            "fastapi",
            "uvicorn[standard]",
            "pydantic",
        ]
        
        for package in packages:
            logger.info(f"Installing {package}...")
            subprocess.check_call([sys.executable, "-m", "pip", "install", package])
            
        logger.info("All packages installed successfully!")
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install packages: {e}")
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
        logger.error(f"Configuration error: {e}")
        logger.error("Please make sure you have set up your GOOGLE_API_KEY in the .env file")
        return False

def main():
    """Main function to start the API server"""
    logger.info("Starting MJAK Automation API Server...")
    
    # Change to the script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Install requirements
    if not install_requirements():
        logger.error("Failed to install requirements. Exiting.")
        sys.exit(1)
    
    # Check configuration
    if not check_config():
        logger.error("Configuration check failed. Exiting.")
        sys.exit(1)
    
    # Start the API server
    try:
        logger.info("Starting FastAPI server on http://localhost:8000")
        logger.info("API Documentation available at: http://localhost:8000/docs")
        
        import uvicorn
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
