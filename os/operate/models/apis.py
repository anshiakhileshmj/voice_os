
import os
import time
import traceback
import json
from PIL import Image
import requests
from requests.exceptions import Timeout, ConnectionError

from operate.config import Config
from operate.models.prompts import get_system_prompt
from operate.utils.screenshot import capture_screen_with_cursor
from operate.utils.style import ANSI_BRIGHT_MAGENTA, ANSI_GREEN, ANSI_RED, ANSI_RESET

config = Config()

def extract_json_from_code_block(content):
    """
    Strips Markdown code block and language tag from model output.
    """
    content = content.strip()
    # Remove triple backticks and any language tag
    if content.startswith("```"):
        # Remove the opening ```
        content = content[3:]
        # Remove leading 'json' etc. if present
        content = content.lstrip(" \n")
        if content.startswith("json"):
            content = content[4:].lstrip(" \n")
        # Remove the closing ```
        if "```" in content:
            content = content[:content.index("```")]
    return content.strip()

async def get_next_action(model, messages, objective, session_id):
    if config.verbose:
        print("[MJAK][get_next_action] model", model)
    if model == "gemini-1.5-flash":
        return call_gemini_flash(messages, objective)
    raise Exception(f"Model not recognized: {model}")

def call_gemini_flash(messages, objective):
    if config.verbose:
        print("[MJAK][call_gemini_flash]")
    
    max_retries = 3
    retry_delay = 5  # seconds
    
    for attempt in range(max_retries):
        try:
            print(f"[call_gemini_flash] Attempt {attempt + 1}/{max_retries}")
            
            # Take screenshot
            screenshots_dir = "screenshots"
            os.makedirs(screenshots_dir, exist_ok=True)
            screenshot_filename = os.path.join(screenshots_dir, "screenshot.png")
            capture_screen_with_cursor(screenshot_filename)
            time.sleep(1)

            prompt = get_system_prompt("gemini-1.5-flash", objective)
            model = config.initialize_google()
            if config.verbose:
                print("[call_gemini_flash] model", model)

            if not model:
                print("[call_gemini_flash] ERROR: Failed to initialize Gemini model")
                return [], None

            print(f"[call_gemini_flash] Calling Gemini API with timeout handling...")
            
            # Configure generation with shorter timeout and better settings
            generation_config = {
                "temperature": 0.7,
                "top_p": 0.8,
                "top_k": 40,
                "max_output_tokens": 2048,
            }
            
            # Use a more robust approach with explicit timeout
            response = model.generate_content(
                [prompt, Image.open(screenshot_filename)],
                generation_config=generation_config,
                stream=False
            )
            
            content = response.text.strip()
            if config.verbose:
                print("[call_gemini_flash] raw response text:", content)
            
            if not content:
                print("[Gemini Error] Empty response. Check your API key and quota.")
                if attempt < max_retries - 1:
                    print(f"[call_gemini_flash] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                return [], None

            # NEW: Strip Markdown code block if present
            content_stripped = extract_json_from_code_block(content)
            if config.verbose:
                print("[call_gemini_flash] extracted JSON text:", content_stripped)
            
            try:
                content_json = json.loads(content_stripped)
                if isinstance(content_json, list) and len(content_json) == 0:
                    print("[Gemini Info] No actions returned by model. Ending operation loop.")
                    return [], None
                
                print(f"[call_gemini_flash] Successfully generated {len(content_json) if isinstance(content_json, list) else 1} actions")
                return content_json, None
                
            except json.JSONDecodeError as e:
                print(f"[Gemini Error] JSON decode error on attempt {attempt + 1}: {e}")
                print("[Gemini Error] Response not valid JSON after stripping codeblock. Full response:")
                print(content)
                print("[Gemini Error] Extracted for JSON parsing:")
                print(content_stripped)
                
                if attempt < max_retries - 1:
                    print(f"[call_gemini_flash] Retrying in {retry_delay} seconds...")
                    time.sleep(retry_delay)
                    continue
                else:
                    raise e

        except Timeout as e:
            print(f"[Gemini Error] Timeout on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print(f"[call_gemini_flash] Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                continue
            else:
                print("[Gemini Error] Max retries exceeded due to timeout")
                return [], None
                
        except ConnectionError as e:
            print(f"[Gemini Error] Connection error on attempt {attempt + 1}: {e}")
            if attempt < max_retries - 1:
                print(f"[call_gemini_flash] Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                continue
            else:
                print("[Gemini Error] Max retries exceeded due to connection error")
                return [], None
                
        except Exception as e:
            print(f"[Gemini Error] Unexpected error on attempt {attempt + 1}: {e}")
            if config.verbose:
                traceback.print_exc()
            
            if attempt < max_retries - 1:
                print(f"[call_gemini_flash] Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                continue
            else:
                print("[Gemini Error] Max retries exceeded due to unexpected error")
                return [], None

    print("[call_gemini_flash] All retry attempts failed")
    return [], None
