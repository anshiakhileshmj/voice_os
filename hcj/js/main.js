
// Main application initialization and coordination

class App {
  constructor() {
    this.isInitialized = false;
    this.currentUser = null;
    this.currentRoute = 'landing';
  }
  
  async init() {
    try {
      console.log('Initializing MJAK AI Assistant...');
      
      // Initialize router
      if (window.Router) {
        window.Router.init();
      }
      
      // Check authentication state
      await this.checkAuthState();
      
      // Initialize services
      this.initializeServices();
      
      // Set up global error handling
      this.setupErrorHandling();
      
      // Set up keyboard shortcuts
      this.setupKeyboardShortcuts();
      
      console.log('MJAK AI Assistant initialized successfully');
      this.isInitialized = true;
      
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('Failed to initialize application. Please refresh the page.');
    }
  }
  
  async checkAuthState() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        this.currentUser = session.user;
        window.AppState.user = session.user;
      }
      
      // Listen for auth changes
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          this.currentUser = session.user;
          window.AppState.user = session.user;
          window.ToastManager.show({
            title: 'Success',
            description: 'Successfully signed in!',
            variant: 'success'
          });
          window.Router.navigate('app');
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          window.AppState.user = null;
          window.Router.navigate('landing');
        }
      });
      
    } catch (error) {
      console.error('Auth state check failed:', error);
    }
  }
  
  initializeServices() {
    // Initialize all services
    if (window.LLMService) {
      console.log('LLM Service initialized');
    }
    
    if (window.TextToSpeechService) {
      console.log('Text-to-Speech Service initialized');
    }
    
    if (window.AutomateService) {
      console.log('Automate Service initialized');
      // Check automate service connection
      window.AutomateService.checkConnection().then(connected => {
        console.log('Automate service connected:', connected);
      });
    }
  }
  
  setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.showError('An unexpected error occurred. Please try again.');
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.showError('An unexpected error occurred. Please try again.');
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl/Cmd + K to focus message input
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
          messageInput.focus();
        }
      }
      
      // Escape to close modals or clear input
      if (event.key === 'Escape') {
        const messageInput = document.getElementById('message-input');
        if (messageInput && document.activeElement === messageInput) {
          messageInput.blur();
        }
      }
    });
  }
  
  showError(message) {
    window.ToastManager.show({
      title: 'Error',
      description: message,
      variant: 'destructive'
    });
  }
  
  showSuccess(message) {
    window.ToastManager.show({
      title: 'Success',
      description: message,
      variant: 'success'
    });
  }
  
  showInfo(message) {
    window.ToastManager.show({
      title: 'Info',
      description: message,
      variant: 'info'
    });
  }
  
  // Utility methods
  getCurrentUser() {
    return this.currentUser;
  }
  
  isAuthenticated() {
    return !!this.currentUser;
  }
  
  getCurrentRoute() {
    return this.currentRoute;
  }
  
  setCurrentRoute(route) {
    this.currentRoute = route;
  }
}

// Initialize the app
window.App = new App();

// Export for global access
window.showError = (message) => window.App.showError(message);
window.showSuccess = (message) => window.App.showSuccess(message);
window.showInfo = (message) => window.App.showInfo(message);
