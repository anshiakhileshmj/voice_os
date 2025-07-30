
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
    // Chat functionality
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    
    // Voice and call functionality
    const callButton = document.getElementById('start-call');
    const voiceSelect = document.getElementById('voice-select');
    
    // Control buttons
    const logoutButton = document.getElementById('logout-button');
    const spotifyToggle = document.getElementById('spotify-toggle');
    const automateToggle = document.getElementById('automate-toggle');
    
    // Floating action buttons
    const spotifyFab = document.getElementById('spotify-fab');
    const powerFab = document.getElementById('power-fab');
    const documentFab = document.getElementById('document-fab');
    const closeFab = document.getElementById('close-fab');
    
    // Document upload
    const documentModal = document.getElementById('document-modal');
    const closeDocumentModal = document.getElementById('close-document-modal');
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');

    // Chat functionality
    if (sendButton && messageInput && chatMessages) {
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
            const selectedVoice = voiceSelect ? voiceSelect.value : 'JBFqnCBsd6RMkjVDRZzb';
            const audioBuffer = await window.TextToSpeechService.convertTextToSpeech(result.response, selectedVoice);
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

    // Voice call functionality
    if (callButton) {
      let isRecording = false;
      let recognition = null;

      // Initialize speech recognition if available
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript) {
            // Add transcript to history
            const transcriptContent = document.getElementById('transcript-content');
            if (transcriptContent) {
              const transcriptDiv = document.createElement('div');
              transcriptDiv.className = 'transcript-item';
              transcriptDiv.textContent = finalTranscript;
              transcriptContent.appendChild(transcriptDiv);
              
              // Remove empty state
              const emptyState = transcriptContent.querySelector('.transcript-empty');
              if (emptyState) emptyState.remove();
            }

            // Send to chat as well
            if (messageInput) {
              messageInput.value = finalTranscript;
            }
          }
        };

        recognition.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          window.AuthService.showToast('Speech recognition error: ' + event.error, 'error');
        };
      }

      callButton.addEventListener('click', () => {
        if (!recognition) {
          window.AuthService.showToast('Speech recognition not supported in this browser', 'error');
          return;
        }

        if (!isRecording) {
          // Start recording
          recognition.start();
          isRecording = true;
          callButton.classList.add('recording');
          callButton.querySelector('.call-button-text').textContent = 'Stop Recording';
        } else {
          // Stop recording
          recognition.stop();
          isRecording = false;
          callButton.classList.remove('recording');
          callButton.querySelector('.call-button-text').textContent = 'Start Call';
        }
      });
    }

    // Control buttons
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        window.AuthService.signOut();
      });
    }

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
          const connected = await window.AutomateService.checkConnection();
          if (!connected) {
            window.AuthService.showToast('Automate service not available. Make sure Python backend is running.', 'error');
          }
        }
      });
    }

    // Floating action buttons
    if (spotifyFab) {
      spotifyFab.addEventListener('click', () => {
        window.AuthService.showToast('Spotify integration coming soon!', 'info');
      });
    }

    if (powerFab) {
      powerFab.addEventListener('click', () => {
        window.AppState.isAutomateEnabled = !window.AppState.isAutomateEnabled;
        const automateBtn = document.getElementById('automate-toggle');
        if (automateBtn) {
          automateBtn.textContent = `Automate: ${window.AppState.isAutomateEnabled ? 'ON' : 'OFF'}`;
        }
        window.AuthService.showToast(`Automation ${window.AppState.isAutomateEnabled ? 'enabled' : 'disabled'}`, 'success');
      });
    }

    if (documentFab && documentModal) {
      documentFab.addEventListener('click', () => {
        documentModal.style.display = 'flex';
      });
    }

    if (closeFab) {
      closeFab.addEventListener('click', () => {
        window.close();
      });
    }

    // Document modal functionality
    if (closeDocumentModal && documentModal) {
      closeDocumentModal.addEventListener('click', () => {
        documentModal.style.display = 'none';
      });

      documentModal.addEventListener('click', (e) => {
        if (e.target === documentModal) {
          documentModal.style.display = 'none';
        }
      });
    }

    if (uploadArea && fileInput) {
      uploadArea.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const user = await window.AuthService.getCurrentUser();
          if (!user) {
            window.AuthService.showToast('Please sign in to upload documents', 'error');
            return;
          }

          window.AuthService.showToast('Uploading document...', 'info');
          const document = await window.DocumentService.uploadDocument(file, user.id);
          window.AuthService.showToast('Document uploaded successfully!', 'success');
          
          // Refresh document list
          this.loadUserDocuments();
        } catch (error) {
          window.AuthService.showToast('Failed to upload document: ' + error.message, 'error');
        }
      });

      // Drag and drop functionality
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#3b82f6';
        uploadArea.style.backgroundColor = 'rgba(59, 130, 246, 0.05)';
      });

      uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = 'transparent';
      });

      uploadArea.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#d1d5db';
        uploadArea.style.backgroundColor = 'transparent';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          fileInput.files = files;
          fileInput.dispatchEvent(new Event('change'));
        }
      });
    }

    // Initialize app state
    this.initializeAppState();
  }

  static async initializeAppState() {
    // Initialize conversation history if not exists
    if (!window.AppState.conversationHistory) {
      window.AppState.conversationHistory = [];
    }

    // Load user preferences
    try {
      const user = await window.AuthService.getCurrentUser();
      if (user) {
        // Load user-specific settings
        const savedVoice = localStorage.getItem(`voice_preference_${user.id}`);
        if (savedVoice) {
          const voiceSelect = document.getElementById('voice-select');
          if (voiceSelect) {
            voiceSelect.value = savedVoice;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }

    // Save voice preference when changed
    const voiceSelect = document.getElementById('voice-select');
    if (voiceSelect) {
      voiceSelect.addEventListener('change', async () => {
        try {
          const user = await window.AuthService.getCurrentUser();
          if (user) {
            localStorage.setItem(`voice_preference_${user.id}`, voiceSelect.value);
          }
        } catch (error) {
          console.error('Failed to save voice preference:', error);
        }
      });
    }
  }

  static async loadUserDocuments() {
    try {
      const user = await window.AuthService.getCurrentUser();
      if (!user) return;

      const documents = await window.DocumentService.getUserDocuments(user.id);
      const container = document.getElementById('uploaded-documents');
      if (!container) return;

      container.innerHTML = '';
      documents.forEach(doc => {
        const docDiv = document.createElement('div');
        docDiv.className = 'document-item';
        docDiv.innerHTML = `
          <div class="document-info">
            <h4>${doc.filename}</h4>
            <p>Uploaded: ${new Date(doc.uploaded_at).toLocaleDateString()}</p>
          </div>
          <div class="document-actions">
            <button onclick="ComponentBuilder.processDocument('${doc.id}', 'summarize')" class="btn-secondary">Summarize</button>
            <button onclick="ComponentBuilder.askDocumentQuestion('${doc.id}')" class="btn-primary">Ask Question</button>
          </div>
        `;
        container.appendChild(docDiv);
      });
    } catch (error) {
      console.error('Failed to load documents:', error);
    }
  }

  static async processDocument(documentId, action) {
    try {
      const result = await window.DocumentService.processDocument(documentId, action);
      window.AuthService.showToast('Document processed successfully!', 'success');
      
      // Add result to chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const assistantDiv = document.createElement('div');
        assistantDiv.className = 'message assistant';
        assistantDiv.textContent = result;
        chatMessages.appendChild(assistantDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } catch (error) {
      window.AuthService.showToast('Failed to process document: ' + error.message, 'error');
    }
  }

  static async askDocumentQuestion(documentId) {
    const question = prompt('What would you like to ask about this document?');
    if (!question) return;

    try {
      const result = await window.DocumentService.processDocument(documentId, 'question', question);
      window.AuthService.showToast('Question answered!', 'success');
      
      // Add result to chat
      const chatMessages = document.getElementById('chat-messages');
      if (chatMessages) {
        const userDiv = document.createElement('div');
        userDiv.className = 'message user';
        userDiv.textContent = question;
        chatMessages.appendChild(userDiv);
        
        const assistantDiv = document.createElement('div');
        assistantDiv.className = 'message assistant';
        assistantDiv.textContent = result;
        chatMessages.appendChild(assistantDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    } catch (error) {
      window.AuthService.showToast('Failed to answer question: ' + error.message, 'error');
    }
  }
}

window.ComponentBuilder = ComponentBuilder;
