
# MJAK Automation API

This API server provides HTTP endpoints to integrate MJAK (My Just Automate Kit) operating system automation with external applications.

## Quick Start

### 1. Start the API Server

```bash
# Navigate to the os directory
cd os

# Run the startup script (installs dependencies and starts server)
python start_api_server.py
```

The server will start on `http://localhost:8000`

### 2. API Documentation

Once the server is running, visit:
- **Interactive API Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc

## API Endpoints

### Health Check
```
GET /health
```
Returns server health status.

### Generate Actions
```
POST /generate-actions
```
Generate automation actions for a given objective using Gemini AI.

**Request Body:**
```json
{
  "objective": "open google"
}
```

**Response:**
```json
{
  "success": true,
  "actions": [
    {
      "operation": "press",
      "thought": "Searching for Google Chrome",
      "keys": ["command", "space"]
    },
    {
      "operation": "write",
      "content": "Google Chrome"
    },
    {
      "operation": "press",
      "keys": ["enter"]
    }
  ],
  "message": "Generated 3 automation actions"
}
```

### Execute Automation
```
POST /automate
```
Execute a series of automation actions on the system.

**Request Body:**
```json
{
  "objective": "open google",
  "actions": [
    {
      "operation": "press",
      "thought": "Searching for Google Chrome", 
      "keys": ["command", "space"]
    },
    {
      "operation": "write",
      "content": "Google Chrome"
    },
    {
      "operation": "press",
      "keys": ["enter"]
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully executed automation for: open google",
  "executedActions": 3
}
```

### Get Status
```
GET /status
```
Get the current status of the automation service.

## Action Types

The API supports the following automation operations:

1. **click** - Mouse click at coordinates
   ```json
   {
     "operation": "click",
     "x": "0.5",
     "y": "0.3"
   }
   ```

2. **write** - Type text
   ```json
   {
     "operation": "write", 
     "content": "Hello World"
   }
   ```

3. **press** - Keyboard shortcuts
   ```json
   {
     "operation": "press",
     "keys": ["command", "c"]
   }
   ```

4. **done** - Mark completion
   ```json
   {
     "operation": "done",
     "summary": "Task completed successfully"
   }
   ```

## Integration with React Frontend

The API is designed to work with the React frontend application. When the "Automate" toggle is enabled in the frontend:

1. User speaks a command (e.g., "open Google")
2. Frontend sends STT (Speech-to-Text) result to backend
3. Backend processes with LLM and generates action array
4. Frontend POSTs action array to `/automate` endpoint
5. API executes actions on the system
6. Frontend receives status and plays TTS response

## Configuration

Make sure you have a `.env` file in the `os` directory with your Google API key:

```
GOOGLE_API_KEY=your_gemini_api_key_here
```

## Dependencies

The startup script automatically installs:
- FastAPI
- Uvicorn (ASGI server)
- Pydantic (data validation)

## Development

To run in development mode with auto-reload:

```bash
uvicorn api_server:app --reload --host 0.0.0.0 --port 8000
```

## CORS Configuration

The API is configured to accept requests from:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (Create React App dev server)

For production, update the CORS origins in `api_server.py`.
