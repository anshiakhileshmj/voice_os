
import os
import sys
import requests
from dotenv import load_dotenv
import google.generativeai as genai
from prompt_toolkit.shortcuts import input_dialog

class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Config, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        load_dotenv()
        self.verbose = False
        self.google_api_key = None

    def get_api_key_from_supabase(self):
        """Get API key from Supabase backend"""
        try:
            response = requests.get('https://uasluhbtcpuigwkuslum.supabase.co/functions/v1/get-gemini-key')
            if response.status_code == 200:
                data = response.json()
                api_key = data.get('apiKey')
                if api_key:
                    print(f"[Config] Successfully retrieved API key from Supabase")
                    return api_key
                else:
                    print(f"[Config] No API key found in Supabase response")
                    return None
            else:
                print(f"[Config] Failed to get API key from Supabase: {response.status_code}")
                return None
        except Exception as e:
            print(f"[Config] Error getting API key from Supabase: {e}")
            return None

    def initialize_google(self):
        # Always try to get API key from Supabase first
        api_key = self.get_api_key_from_supabase()
        
        # Fallback to local environment only if Supabase fails
        if not api_key:
            print("[Config] Supabase API key fetch failed, trying local environment...")
            if self.google_api_key:
                api_key = self.google_api_key
            else:
                api_key = os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            print("[Config] ERROR: No API key found. Please ensure GEMINI_API_KEY is configured in Supabase.")
            return None
            
        try:
            genai.configure(api_key=api_key, transport="rest")
            model = genai.GenerativeModel("gemini-1.5-flash")
            print("[Config] Google Gemini model initialized successfully")
            return model
        except Exception as e:
            print(f"[Config] Error initializing Gemini model: {e}")
            return None

    def validation(self):
        # Updated validation - prioritize Supabase backend
        print("[Config] Validating configuration...")
        api_key = self.get_api_key_from_supabase()
        if api_key:
            print("[Config] Configuration valid - API key retrieved from Supabase")
            return True
        else:
            print("[Config] Warning: Could not get API key from Supabase")
            # Check local environment as fallback
            local_key = os.getenv("GOOGLE_API_KEY")
            if local_key:
                print("[Config] Found local GOOGLE_API_KEY as fallback")
                return True
            else:
                print("[Config] ERROR: No API key found in Supabase or local environment")
                return False

    def require_api_key(self, key_name, key_description, is_required):
        key_exists = bool(os.environ.get(key_name))
        if is_required and not key_exists:
            # Only prompt for local key if Supabase also failed
            supabase_key = self.get_api_key_from_supabase()
            if not supabase_key:
                print(f"[Config] Prompting for {key_description} as both Supabase and local sources failed")
                self.prompt_and_save_api_key(key_name, key_description)

    def prompt_and_save_api_key(self, key_name, key_description):
        key_value = input_dialog(
            title="API Key Required", text=f"Please enter your {key_description}:"
        ).run()
        if key_value is None:
            sys.exit("Operation cancelled by user.")
        if key_value:
            if key_name == "GOOGLE_API_KEY":
                self.google_api_key = key_value
            self.save_api_key_to_env(key_name, key_value)
            load_dotenv()

    @staticmethod
    def save_api_key_to_env(key_name, key_value):
        with open(".env", "a") as file:
            file.write(f"\n{key_name}='{key_value}'")
