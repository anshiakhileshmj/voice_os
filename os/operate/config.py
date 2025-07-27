
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
                return data.get('apiKey')
            else:
                print(f"Failed to get API key from backend: {response.status_code}")
                return None
        except Exception as e:
            print(f"Error getting API key from backend: {e}")
            return None

    def initialize_google(self):
        # First try to get API key from Supabase
        api_key = self.get_api_key_from_supabase()
        
        # Fallback to local environment or user input
        if not api_key:
            if self.google_api_key:
                api_key = self.google_api_key
            else:
                api_key = os.getenv("GOOGLE_API_KEY")
        
        if not api_key:
            print("No API key found. Please ensure the backend is configured with GEMINI_API_KEY.")
            return None
            
        genai.configure(api_key=api_key, transport="rest")
        model = genai.GenerativeModel("gemini-1.5-flash")
        return model

    def validation(self):
        # Updated validation - try backend first, then fallback
        api_key = self.get_api_key_from_supabase()
        if not api_key:
            print("Warning: Could not get API key from backend, will try local configuration...")
            self.require_api_key("GOOGLE_API_KEY", "Google API key", True)

    def require_api_key(self, key_name, key_description, is_required):
        key_exists = bool(os.environ.get(key_name))
        if is_required and not key_exists:
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
