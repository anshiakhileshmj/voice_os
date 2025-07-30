
// Simple router
class Router {
  constructor() {
    this.routes = {
      'landing': ComponentBuilder.createLandingPage,
      'auth': ComponentBuilder.createAuthPage,
      'app': ComponentBuilder.createAppPage,
    };

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        this.render(e.state.page);
      }
    });
  }

  navigate(page) {
    window.AppState.currentPage = page;
    this.render(page);
    
    // Update browser history
    const url = page === 'landing' ? '/' : `/${page}`;
    history.pushState({ page }, '', url);
  }

  render(page) {
    const container = document.getElementById('app-container');
    const pageBuilder = this.routes[page];
    
    if (pageBuilder) {
      container.innerHTML = pageBuilder();
      
      // Setup page-specific handlers
      if (page === 'auth') {
        ComponentBuilder.setupAuthHandlers();
      } else if (page === 'app') {
        ComponentBuilder.setupAppHandlers();
        
        // Check if user is authenticated
        if (!window.AppState.user) {
          this.navigate('auth');
          return;
        }
      }
    } else {
      container.innerHTML = '<h1>Page not found</h1>';
    }
  }

  init() {
    // Determine initial page based on URL
    const path = window.location.pathname;
    let initialPage = 'landing';
    
    if (path === '/auth') {
      initialPage = 'auth';
    } else if (path === '/app') {
      initialPage = 'app';
    }

    // Check if user is logged in and redirect to app if so
    setTimeout(() => {
      if (window.AppState.user && initialPage !== 'app') {
        this.navigate('app');
      } else {
        this.render(initialPage);
      }
    }, 100);
  }
}

window.Router = new Router();
