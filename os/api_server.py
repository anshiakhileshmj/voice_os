
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
    apiKey: Optional[str] = None  # Optional API key from frontend (not used now)

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
    try:
        logger.info("Health check called - validating configuration...")
        # Test configuration to ensure API key is available
        is_valid = config.validation()
        if is_valid:
            logger.info("Health check passed - configuration is valid")
            return {
                "status": "healthy", 
                "service": "MJAK Automation API",
                "api_key_status": "configured"
            }
        else:
            logger.warning("Health check failed - API key not configured")
            return {
                "status": "unhealthy", 
                "service": "MJAK Automation API",
                "api_key_status": "missing",
                "error": "No API key configured"
            }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "service": "MJAK Automation API", 
            "error": str(e)
        }

@app.post("/generate-actions", response_model=GenerateActionsResponse)
async def generate_actions(request: GenerateActionsRequest):
    """Generate automation actions for a given objective using Gemini AI"""
    try:
        logger.info(f"Generating actions for objective: {request.objective}")
        
        # Initialize Gemini model - this will fetch API key from Supabase automatically
        model = config.initialize_google()
        if not model:
            logger.error("Failed to initialize Gemini model - API key might be missing")
            return GenerateActionsResponse(
                success=False,
                actions=[],
                error="Failed to initialize AI model - API key configuration error"
            )
        
        logger.info("Gemini model initialized successfully")
        
        # Create system message for action generation
        system_message = {"role": "system", "content": f"Generate automation actions for: {request.objective}"}
        messages = [system_message]
        
        # Use the existing get_next_action function to generate actions
        logger.info("Calling get_next_action to generate automation steps...")
        operations, session_id = await get_next_action("gemini-1.5-flash", messages, request.objective, None)
        
        if not operations:
            logger.warning("No operations generated for the given objective")
            return GenerateActionsResponse(
                success=False,
                actions=[],
                error="No actions could be generated for this objective"
            )
        
        logger.info(f"Successfully generated {len(operations)} actions")
        return GenerateActionsResponse(
            success=True,
            actions=operations,
            message=f"Generated {len(operations)} automation actions"
        )
        
    except Exception as e:
        logger.error(f"Error generating actions: {str(e)}", exc_info=True)
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
        
        # Validate configuration before executing
        if not config.validation():
            logger.error("Configuration validation failed - cannot execute automation")
            return AutomateResponse(
                success=False,
                message="Configuration error: Could not validate API key",
                error="API key configuration error"
            )
        
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
        
        logger.info("Starting automation execution...")
        
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
                    logger.info(f"Operation {i+1} indicated completion, stopping execution")
                    break
                    
            except Exception as e:
                logger.error(f"Error executing operation {i+1}: {str(e)}")
                return AutomateResponse(
                    success=False,
                    message=f"Failed to execute operation {i+1}: {str(e)}",
                    executedActions=executed_count,
                    error=str(e)
                )
        
        logger.info(f"Automation completed successfully - executed {executed_count} actions")
        return AutomateResponse(
            success=True,
            message=f"Successfully executed automation for: {request.objective}",
            executedActions=executed_count
        )
        
    except Exception as e:
        logger.error(f"Error in automation execution: {str(e)}", exc_info=True)
        return AutomateResponse(
            success=False,
            message="Failed to execute automation",
            error=str(e)
        )

@app.get("/status")
async def get_status():
    """Get the current status of the automation service"""
    try:
        logger.info("Status endpoint called - checking configuration...")
        # Check if config is valid (this will try Supabase first)
        is_valid = config.validation()
        if is_valid:
            logger.info("Status check passed - service is ready")
            return {
                "status": "ready",
                "model": "gemini-1.5-flash",
                "message": "Automation service is ready to accept commands",
                "api_key_source": "supabase"
            }
        else:
            logger.warning("Status check failed - configuration error")
            return {
                "status": "error",
                "message": "Configuration error: Could not retrieve API key from Supabase or local environment"
            }
    except Exception as e:
        logger.error(f"Status check error: {str(e)}")
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
