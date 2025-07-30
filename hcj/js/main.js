
// Main application initialization
document.addEventListener('DOMContentLoaded', function() {
  console.log('MJAK Automation App Starting...');
  
  // Initialize router
  window.Router.init();
  
  // Check automate service connection periodically
  setInterval(async () => {
    if (window.AppState.isAutomateEnabled) {
      const connected = await window.AutomateService.checkConnection();
      window.AppState.isAutomateConnected = connected;
    }
  }, 30000); // Check every 30 seconds
  
  console.log('App initialized successfully!');
});
