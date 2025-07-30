
// Authentication functions
class AuthService {
  constructor() {
    this.checkAuthState();
  }

  async checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      window.AppState.user = session.user;
      this.updateAuthUI();
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        window.AppState.user = session.user;
        this.updateAuthUI();
        this.showToast('Successfully signed in!');
        window.Router.navigate('app');
      } else if (event === 'SIGNED_OUT') {
        window.AppState.user = null;
        this.updateAuthUI();
        window.Router.navigate('landing');
      }
    });
  }

  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  updateAuthUI() {
    // Update UI based on auth state
    const authElements = document.querySelectorAll('[data-auth-required]');
    authElements.forEach(el => {
      if (window.AppState.user) {
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize auth service
window.AuthService = new AuthService();
