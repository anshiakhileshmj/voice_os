
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import uvicorn
import logging
import asyncio
from operate.operate import operate
from operate.models.apis import get_next_action
from operate.config import Config
import json

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="MJAK Automation API", description="API for MJAK Operating System Automation")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize config
config = Config()

class AutomateAction(BaseModel):
    operation: str
    thought: Optional[str] = None
    x: Optional[str] = None
    y: Optional[str] = None
    keys: Optional[List[str]] = None
    content: Optional[str] = None
    summary: Optional[str] = None

class AutomateRequest(BaseModel):
    actions: List[AutomateAction]
    objective: str

class GenerateActionsRequest(BaseModel):
    objective: str

class AutomateResponse(BaseModel):
    success: bool
    message: str
    executedActions: Optional[int] = None
    error: Optional[str] = None

class GenerateActionsResponse(BaseModel):
    success: bool
    actions: List[Dict[str, Any]]
    message: Optional[str] = None
    error: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "MJAK Automation API"}

@app.post("/generate-actions", response_model=GenerateActionsResponse)
async def generate_actions(request: GenerateActionsRequest):
    """Generate automation actions for a given objective using Gemini AI"""
    try:
        logger.info(f"Generating actions for objective: {request.objective}")
        
        # Validate config
        config.validation()
        
        # Create system message for action generation
        system_message = {"role": "system", "content": f"Generate automation actions for: {request.objective}"}
        messages = [system_message]
        
        # Use the existing get_next_action function to generate actions
        operations, session_id = await get_next_action("gemini-1.5-flash", messages, request.objective, None)
        
        if not operations:
            return GenerateActionsResponse(
                success=False,
                actions=[],
                error="No actions could be generated for this objective"
            )
        
        logger.info(f"Generated {len(operations)} actions")
        return GenerateActionsResponse(
            success=True,
            actions=operations,
            message=f"Generated {len(operations)} automation actions"
        )
        
    except Exception as e:
        logger.error(f"Error generating actions: {str(e)}")
        return GenerateActionsResponse(
            success=False,
            actions=[],
            error=f"Failed to generate actions: {str(e)}"
        )

@app.post("/automate", response_model=AutomateResponse)
async def execute_automation(request: AutomateRequest):
    """Execute automation actions on the system"""
    try:
        logger.info(f"Executing automation for objective: {request.objective}")
        logger.info(f"Number of actions to execute: {len(request.actions)}")
        
        # Convert Pydantic models to dictionaries for the operate function
        operations = []
        for action in request.actions:
            operation_dict = {"operation": action.operation}
            
            if action.thought:
                operation_dict["thought"] = action.thought
            if action.x:
                operation_dict["x"] = action.x
            if action.y:
                operation_dict["y"] = action.y
            if action.keys:
                operation_dict["keys"] = action.keys
            if action.content:
                operation_dict["content"] = action.content
            if action.summary:
                operation_dict["summary"] = action.summary
                
            operations.append(operation_dict)
        
        # Execute the operations using the existing operate function
        executed_count = 0
        for i, operation in enumerate(operations):
            try:
                logger.info(f"Executing operation {i+1}/{len(operations)}: {operation.get('operation')}")
                
                # Execute the operation
                stop = operate([operation], "gemini-1.5-flash")
                executed_count += 1
                
                # If operation indicates completion, break
                if stop:
                    break
                    
            except Exception as e:
                logger.error(f"Error executing operation {i+1}: {str(e)}")
                return AutomateResponse(
                    success=False,
                    message=f"Failed to execute operation {i+1}: {str(e)}",
                    executedActions=executed_count,
                    error=str(e)
                )
        
        return AutomateResponse(
            success=True,
            message=f"Successfully executed automation for: {request.objective}",
            executedActions=executed_count
        )
        
    except Exception as e:
        logger.error(f"Error in automation execution: {str(e)}")
        return AutomateResponse(
            success=False,
            message="Failed to execute automation",
            error=str(e)
        )

@app.get("/status")
async def get_status():
    """Get the current status of the automation service"""
    try:
        # Check if config is valid
        config.validation()
        return {
            "status": "ready",
            "model": "gemini-1.5-flash",
            "message": "Automation service is ready to accept commands"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Configuration error: {str(e)}"
        }

if __name__ == "__main__":
    logger.info("Starting MJAK Automation API Server...")
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
