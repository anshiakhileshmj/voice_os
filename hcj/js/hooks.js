
// Custom hooks converted to vanilla JavaScript utilities

// Mobile detection utility
class MobileDetector {
  constructor() {
    this.isMobile = this.checkIsMobile();
    this.callbacks = new Set();
    
    // Listen for resize events
    window.addEventListener('resize', () => {
      const newIsMobile = this.checkIsMobile();
      if (newIsMobile !== this.isMobile) {
        this.isMobile = newIsMobile;
        this.callbacks.forEach(callback => callback(this.isMobile));
      }
    });
  }
  
  checkIsMobile() {
    return window.innerWidth < 768;
  }
  
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }
  
  getIsMobile() {
    return this.isMobile;
  }
}

// Toast utility
class ToastManager {
  constructor() {
    this.toasts = [];
    this.container = null;
    this.initContainer();
  }
  
  initContainer() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 1000;';
      document.body.appendChild(this.container);
    }
  }
  
  show(options) {
    const { title, description, variant = 'default' } = options;
    
    const toast = document.createElement('div');
    toast.className = `toast ${variant}`;
    toast.style.cssText = `
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 10px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      min-width: 300px;
      animation: slideIn 0.3s ease-out;
    `;
    
    if (variant === 'destructive') {
      toast.style.background = '#fee2e2';
      toast.style.borderColor = '#fecaca';
      toast.style.color = '#dc2626';
    }
    
    const content = document.createElement('div');
    if (title) {
      const titleEl = document.createElement('div');
      titleEl.style.cssText = 'font-weight: 600; margin-bottom: 4px;';
      titleEl.textContent = title;
      content.appendChild(titleEl);
    }
    
    if (description) {
      const descEl = document.createElement('div');
      descEl.style.cssText = 'font-size: 14px; color: #6b7280;';
      descEl.textContent = description;
      content.appendChild(descEl);
    }
    
    toast.appendChild(content);
    this.container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, 5000);
    
    return {
      dismiss: () => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }
    };
  }
}

// Initialize global utilities
window.MobileDetector = new MobileDetector();
window.ToastManager = new ToastManager();

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
