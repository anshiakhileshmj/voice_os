import os
import sys
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

    def initialize_google(self):
        if self.google_api_key:
            api_key = self.google_api_key
        else:
            api_key = os.getenv("GOOGLE_API_KEY")
        genai.configure(api_key=api_key, transport="rest")
        model = genai.GenerativeModel("gemini-1.5-flash")
        return model

    def validation(self):
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