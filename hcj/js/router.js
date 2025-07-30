
// Simple router for navigation between pages

class Router {
  constructor() {
    this.routes = {
      'landing': () => this.loadPage('pages/landing.html'),
      'auth': () => this.loadPage('pages/auth.html'),
      'app': () => this.loadPage('pages/app.html')
    };
    this.currentRoute = 'landing';
    this.app = document.getElementById('app');
  }
  
  init() {
    // Get initial route from URL hash or default to landing
    const hash = window.location.hash.substring(1);
    const initialRoute = hash && this.routes[hash] ? hash : 'landing';
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
      const route = window.location.hash.substring(1);
      this.navigate(route, false);
    });
    
    // Navigate to initial route
    this.navigate(initialRoute, false);
  }
  
  async navigate(route, updateHash = true) {
    console.log('Navigating to:', route);
    
    // Check if route exists
    if (!this.routes[route]) {
      console.warn('Route not found:', route);
      route = 'landing';
    }
    
    // Check authentication for protected routes
    if (route === 'app' && !window.AppState.user) {
      console.log('Redirecting to auth - user not authenticated');
      route = 'auth';
    }
    
    // Update URL hash if needed
    if (updateHash) {
      window.location.hash = route;
    }
    
    // Update current route
    this.currentRoute = route;
    
    // Update app state
    if (window.App) {
      window.App.setCurrentRoute(route);
    }
    
    try {
      // Load the route
      await this.routes[route]();
    } catch (error) {
      console.error('Failed to load route:', route, error);
      this.showError();
    }
  }
  
  async loadPage(pagePath) {
    try {
      const response = await fetch(pagePath);
      
      if (!response.ok) {
        throw new Error(`Failed to load page: ${response.status}`);
      }
      
      const html = await response.text();
      
      // Extract body content from the loaded HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const bodyContent = doc.body.innerHTML;
      
      // Update app container
      this.app.innerHTML = bodyContent;
      
      // Execute any scripts in the loaded content
      this.executeScripts();
      
      // Setup page-specific handlers
      this.setupPageHandlers();
      
    } catch (error) {
      console.error('Error loading page:', error);
      this.showError();
    }
  }
  
  executeScripts() {
    const scripts = this.app.querySelectorAll('script');
    scripts.forEach(script => {
      try {
        if (script.src) {
          // External script - create new script element
          const newScript = document.createElement('script');
          newScript.src = script.src;
          document.head.appendChild(newScript);
        } else {
          // Inline script - execute directly
          eval(script.textContent);
        }
      } catch (error) {
        console.error('Error executing script:', error);
      }
    });
  }
  
  setupPageHandlers() {
    // Setup handlers based on current route
    switch (this.currentRoute) {
      case 'auth':
        if (window.ComponentBuilder && window.ComponentBuilder.setupAuthHandlers) {
          window.ComponentBuilder.setupAuthHandlers();
        }
        break;
      case 'app':
        if (window.ComponentBuilder && window.ComponentBuilder.setupAppHandlers) {
          window.ComponentBuilder.setupAppHandlers();
        }
        break;
    }
  }
  
  showError() {
    this.app.innerHTML = `
      <div style="text-align: center; padding: 50px;">
        <h2 style="color: #dc2626; margin-bottom: 20px;">Page Load Error</h2>
        <p style="color: #6b7280; margin-bottom: 30px;">Sorry, we couldn't load the requested page.</p>
        <button onclick="window.Router.navigate('landing')" class="glass-button">
          Go to Home
        </button>
      </div>
    `;
  }
  
  getCurrentRoute() {
    return this.currentRoute;
  }
  
  goBack() {
    window.history.back();
  }
  
  reload() {
    this.navigate(this.currentRoute, false);
  }
}

// Initialize router
window.Router = new Router();
