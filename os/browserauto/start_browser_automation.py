
"""
Start Browser Automation Service
"""

import os
import sys
from dotenv import load_dotenv
import uvicorn

# Load environment variables
load_dotenv()

# Check for required environment variables
if not os.getenv("GEMINI_API_KEY"):
    print("Error: GEMINI_API_KEY environment variable is required")
    print("Please set your Google Gemini API key in .env file")
    sys.exit(1)

if __name__ == "__main__":
    print("Starting Browser Automation Service...")
    print("Server will run on http://localhost:8001")
    print("Health check: http://localhost:8001/health")
    
    try:
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=8001,
            reload=True
        )
    except KeyboardInterrupt:
        print("\nShutting down Browser Automation Service...")
    except Exception as e:
        print(f"Error starting server: {e}")
        sys.exit(1)
