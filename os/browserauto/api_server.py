
"""
Browser Automation API Server
FastAPI server for browser automation service
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
from main import browser_service

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Browser Automation API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class BrowserAction(BaseModel):
    action: str
    selector: Optional[str] = None
    text: Optional[str] = None
    url: Optional[str] = None
    direction: Optional[str] = None
    amount: Optional[int] = None
    key: Optional[str] = None
    seconds: Optional[int] = None

class AutomationRequest(BaseModel):
    objective: str
    actions: Optional[List[BrowserAction]] = None
    url: Optional[str] = None

class GenerateActionsRequest(BaseModel):
    objective: str
    current_url: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return browser_service.health_check()

@app.post("/automate-browser")
async def automate_browser(request: AutomationRequest):
    """Execute browser automation sequence"""
    try:
        # Convert Pydantic models to dict
        actions = None
        if request.actions:
            actions = [action.dict() for action in request.actions]
        
        # If URL is provided, navigate there first
        if request.url:
            browser_service.navigate_to_url(request.url)
        
        result = browser_service.execute_automation_sequence(
            objective=request.objective,
            actions=actions
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Browser automation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-browser-actions")
async def generate_browser_actions(request: GenerateActionsRequest):
    """Generate browser automation actions using AI"""
    try:
        actions = browser_service.generate_actions_from_objective(
            objective=request.objective,
            current_url=request.current_url
        )
        
        return {"actions": actions}
        
    except Exception as e:
        logger.error(f"Action generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/start-browser")
async def start_browser(headless: bool = False):
    """Start the browser"""
    try:
        browser_service.start_browser(headless=headless)
        return {"message": "Browser started successfully"}
    except Exception as e:
        logger.error(f"Browser start error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/close-browser")
async def close_browser():
    """Close the browser"""
    try:
        browser_service.close_browser()
        return {"message": "Browser closed successfully"}
    except Exception as e:
        logger.error(f"Browser close error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/screenshot")
async def take_screenshot():
    """Take a screenshot of current page"""
    try:
        screenshot = browser_service.take_screenshot()
        return {"screenshot": screenshot}
    except Exception as e:
        logger.error(f"Screenshot error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/page-info")
async def get_page_info():
    """Get current page information"""
    try:
        info = browser_service.get_page_info()
        return info
    except Exception as e:
        logger.error(f"Page info error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
