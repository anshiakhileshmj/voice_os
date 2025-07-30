
// Component builders
class ComponentBuilder {
  static createLandingPage() {
    return `
      <div class="landing-container">
        <h1 class="landing-title">Automate your Computer</h1>
        <p class="landing-subtitle">Your Computer. Just Smarter.</p>
        <div class="button-container">
          <button class="glass-button" onclick="window.Router.navigate('auth')">
            Get Started
          </button>
        </div>
      </div>
    `;
  }

  static createAuthPage() {
    return `
      <div class="min-h-screen flex items-center justify-center p-4" style="background: linear-gradient(to bottom right, #dbeafe, #e0e7ff, #f3e8ff);">
        <div class="auth-wrapper">
          <div class="switch">
            <label class="switch">
              <input type="checkbox" class="toggle" id="auth-toggle">
              <span class="slider"></span>
              <span class="card-side"></span>
              <div class="flip-card__inner">
                <div class="flip-card__front">
                  <div class="title">Log in</div>
                  <form class="flip-card__form" id="signin-form">
                    <input class="flip-card__input" name="email" placeholder="Email" type="email" required>
                    <input class="flip-card__input" name="password" placeholder="Password" type="password" required>
                    <button class="flip-card__btn" type="submit">Let's go!</button>
                  </form>
                </div>
                <div class="flip-card__back">
                  <div class="title">Sign up</div>
                  <form class="flip-card__form" id="signup-form">
                    <input class="flip-card__input" placeholder="Name" type="text">
                    <input class="flip-card__input" name="email" placeholder="Email" type="email" required>
                    <input class="flip-card__input" name="password" placeholder="Password" type="password" required>
                    <button class="flip-card__btn" type="submit">Confirm!</button>
                  </form>
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>
    `;
  }

  static createAppPage() {
    return `
      <div class="chat-container" data-auth-required>
        <h1 style="text-align: center; margin-bottom: 20px; color: #1f2937;">MJAK AI Assistant</h1>
        
        <div class="chat-messages" id="chat-messages">
          <div class="message assistant">
            Hello! I'm your AI assistant. How can I help you today?
          </div>
        </div>
        
        <div class="chat-input-container">
          <input type="text" class="chat-input" id="message-input" placeholder="Type your message here..." autocomplete="off">
          <button class="send-button" id="send-button">Send</button>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
          <button id="spotify-toggle" class="glass-button" style="width: auto; padding: 10px 20px; font-size: 14px;">
            Spotify: OFF
          </button>
          <button id="automate-toggle" class="glass-button" style="width: auto; padding: 10px 20px; font-size: 14px;">
            Automate: OFF
          </button>
          <button id="logout-button" class="glass-button" style="width: auto; padding: 10px 20px; font-size: 14px; background: linear-gradient(to bottom, rgba(239, 68, 68, 0.15), rgba(239, 68, 68, 0.05));">
            Logout
          </button>
        </div>
      </div>
    `;
  }

  static setupAuthHandlers() {
    const signinForm = document.getElementById('signin-form');
    const signupForm = document.getElementById('signup-form');

    if (signinForm) {
      signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
          await window.AuthService.signIn(email, password);
        } catch (error) {
          window.AuthService.showToast(error.message, 'error');
        }
      });
    }

    if (signupForm) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const email = formData.get('email');
        const password = formData.get('password');

        try {
          await window.AuthService.signUp(email, password);
          window.AuthService.showToast('Sign up successful! Please check your email to verify your account.');
        } catch (error) {
          window.AuthService.showToast(error.message, 'error');
        }
      });
    }
  }

  static setupAppHandlers() {
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const logoutButton = document.getElementById('logout-button');

    if (sendButton && messageInput) {
      const sendMessage = async () => {
        const message = messageInput.value.trim();
        if (!message) return;

        // Add user message to chat
        const userDiv = document.createElement('div');
        userDiv.className = 'message user';
        userDiv.textContent = message;
        chatMessages.appendChild(userDiv);

        messageInput.value = '';
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        try {
          // Generate AI response
          const result = await window.LLMService.generateResponse(message, window.AppState.conversationHistory);
          
          // Add assistant message to chat
          const assistantDiv = document.createElement('div');
          assistantDiv.className = 'message assistant';
          assistantDiv.textContent = result.response;
          chatMessages.appendChild(assistantDiv);

          // Update conversation history
          window.AppState.conversationHistory = result.updatedHistory;

          // Scroll to bottom
          chatMessages.scrollTop = chatMessages.scrollHeight;

          // Convert to speech if enabled
          try {
            const audioBuffer = await window.TextToSpeechService.convertTextToSpeech(result.response);
            await window.TextToSpeechService.playAudio(audioBuffer);
          } catch (ttsError) {
            console.log('TTS not available:', ttsError.message);
          }

        } catch (error) {
          const errorDiv = document.createElement('div');
          errorDiv.className = 'message assistant';
          errorDiv.textContent = `Error: ${error.message}`;
          chatMessages.appendChild(errorDiv);
        } finally {
          sendButton.disabled = false;
          sendButton.textContent = 'Send';
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      };

      sendButton.addEventListener('click', sendMessage);
      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        window.AuthService.signOut();
      });
    }

    // Setup toggle buttons
    const spotifyToggle = document.getElementById('spotify-toggle');
    const automateToggle = document.getElementById('automate-toggle');

    if (spotifyToggle) {
      spotifyToggle.addEventListener('click', () => {
        window.AppState.isSpotifyEnabled = !window.AppState.isSpotifyEnabled;
        spotifyToggle.textContent = `Spotify: ${window.AppState.isSpotifyEnabled ? 'ON' : 'OFF'}`;
      });
    }

    if (automateToggle) {
      automateToggle.addEventListener('click', async () => {
        window.AppState.isAutomateEnabled = !window.AppState.isAutomateEnabled;
        automateToggle.textContent = `Automate: ${window.AppState.isAutomateEnabled ? 'ON' : 'OFF'}`;
        
        if (window.AppState.isAutomateEnabled) {
          // Check connection to Python backend
          const connected = await window.AutomateService.checkConnection();
          if (!connected) {
            window.AuthService.showToast('Automate service not available. Make sure Python backend is running.', 'error');
          }
        }
      });
    }
  }
}

window.ComponentBuilder = ComponentBuilder;
