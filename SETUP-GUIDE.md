# Voice OS - Automated Setup Guide

## 🚀 One-Click Installation & Setup

Voice OS now includes automated setup that handles everything for you!

### **Step 1: Install the Package**

```bash
npm install -g @mjak/voice_os
```

### **Step 2: Automatic Setup Process**

When you install the package, it will automatically:

1. **🔧 Create Configuration Files**
   - Creates `os/` directory if needed
   - Creates `.env` file with placeholder
   - Sets up all necessary directories

2. **🌐 Open Google AI Studio**
   - Automatically opens your browser
   - Takes you to: https://aistudio.google.com/app/apikey
   - Guides you through API key creation

3. **🔑 Interactive Setup**
   - Prompts you to paste your API key
   - Validates the API key format
   - Saves it securely to `.env` file

4. **✅ Complete Setup**
   - Confirms successful configuration
   - Shows next steps to run the app

### **Step 3: Run the Application**

```bash
voice_os
```

This will:
- 🐍 Start Python automation backend
- 🌐 Start frontend development server
- 🔗 Connect both services automatically
- 🎯 Launch the application

## 📋 Detailed Setup Process

### **What Happens During Installation:**

```
🔧 Setting up Voice OS...
✅ Created .env file in os/ directory

🌐 Opening Google AI Studio in your browser...
📝 Please follow these steps:
1. Sign in to your Google account
2. Click "Create API Key"
3. Copy your API key
4. Paste it below when prompted

🔑 Please paste your Google API key here: [User enters API key]
✅ API key saved successfully!

🎉 Setup complete! Your Voice OS is ready to use.

📋 Next steps:
1. Run: voice_os
2. The app will start automatically
3. Both frontend and Python backend will launch
4. Open your browser to http://localhost:5173

💡 Tip: You can run voice_os from anywhere!
```

### **Google API Key Creation Steps:**

1. **Visit Google AI Studio**
   - URL: https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key"
   - Choose "Create API Key in existing project" or create new project
   - Copy the generated API key

3. **Paste in Terminal**
   - Return to your terminal
   - Paste the API key when prompted
   - Press Enter to save

## 🔧 Manual Setup (If Needed)

If the automatic setup doesn't work, you can manually create the `.env` file:

### **Create .env File**

Create a file at `os/.env` with this content:

```env
GOOGLE_API_KEY='your_actual_api_key_here'
```

### **Get Google API Key**

1. Go to: https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key
5. Replace `your_actual_api_key_here` with your real API key

## 🛠️ Troubleshooting

### **Common Issues:**

1. **"Failed to open browser"**
   - Manually visit: https://aistudio.google.com/app/apikey
   - Follow the setup process manually

2. **"Invalid API key format"**
   - Make sure you copied the entire API key
   - Google API keys are usually 20+ characters long
   - Try copying and pasting again

3. **".env file not found"**
   - The setup will create it automatically
   - If it fails, manually create `os/.env` file

4. **"Permission denied"**
   - Run with administrator privileges
   - Check file permissions in the `os/` directory

### **Manual File Creation:**

If automatic setup fails, create these files manually:

**File: `os/.env`**
```env
GOOGLE_API_KEY='your_api_key_here'
```

**Directory Structure:**
```
voice_os/
├── os/
│   └── .env          # Your API key file
└── ... (other files)
```

## 🎯 After Setup

Once setup is complete, you can:

### **Run the Application:**
```bash
voice_os
```

### **What Starts Automatically:**
- 🐍 Python backend (port 8000)
- 🌐 Frontend server (port 5173)
- 🔗 Both services connected
- 🎯 Application ready to use

### **Access Points:**
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## 🔒 Security Notes

- Your API key is stored locally in `os/.env`
- The file is not shared or uploaded anywhere
- Keep your API key secure and don't share it
- You can regenerate your API key anytime from Google AI Studio

## 📞 Support

If you encounter issues:

1. **Check the setup logs** in your terminal
2. **Verify your API key** format and validity
3. **Try manual setup** if automatic fails
4. **Check file permissions** in the `os/` directory

Your Voice OS is now ready for voice-controlled automation! 🎉 