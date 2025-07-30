
# MJAK Automation - HTML/CSS/JS Version

This directory contains a pure HTML, CSS, and JavaScript version of the MJAK Automation app, converted from the original React/TypeScript codebase.

## Structure

- `index.html` - Main HTML file
- `styles/` - CSS stylesheets
  - `main.css` - Base styles and layout
  - `components.css` - Component-specific styles
- `js/` - JavaScript modules
  - `config.js` - Configuration and Supabase setup
  - `auth.js` - Authentication service
  - `services.js` - API services (LLM, TTS, Automate)
  - `components.js` - Component builders and event handlers
  - `router.js` - Simple client-side routing
  - `main.js` - Application initialization

## Features Included

- Landing page with animated button
- User authentication (sign up/sign in)
- Chat interface with AI assistant
- Text-to-speech functionality
- Integration with Python automation backend
- Spotify integration toggle
- Responsive design

## Usage

1. Open `index.html` in a web browser
2. The app will automatically connect to the Supabase backend
3. Sign up or sign in to access the chat interface
4. Enable automation features as needed

## Backend Requirements

For the automation feature to work, make sure the Python backend is running:

```bash
cd os
python start_api_server.py
```

The app will automatically check for the Python backend connection when automation is enabled.
