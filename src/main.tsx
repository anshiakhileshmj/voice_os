import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Add error boundary for production
const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = '<div style="padding: 20px; font-family: Arial;"><h1>Error</h1><p>Root element not found. Please check the build configuration.</p></div>';
} else {
  try {
    createRoot(rootElement).render(<App />);
  } catch (error) {
    console.error('Failed to render app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; font-family: Arial;"><h1>Application Error</h1><p>Failed to start the application. Please check the console for details.</p></div>';
  }
}
