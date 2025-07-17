import os
import time
import traceback
import json
from PIL import Image

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
    time.sleep(1)
    try:
        screenshots_dir = "screenshots"
        os.makedirs(screenshots_dir, exist_ok=True)
        screenshot_filename = os.path.join(screenshots_dir, "screenshot.png")
        capture_screen_with_cursor(screenshot_filename)
        time.sleep(1)

        prompt = get_system_prompt("gemini-1.5-flash", objective)
        model = config.initialize_google()
        if config.verbose:
            print("[call_gemini_flash] model", model)

        response = model.generate_content([prompt, Image.open(screenshot_filename)])
        content = response.text.strip()
        if config.verbose:
            print("[call_gemini_flash] raw response text:", content)
        if not content:
            print("[Gemini Error] Empty response. Check your API key and quota.")
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
            return content_json, None
        except Exception as e:
            print("[Gemini Error] Response not valid JSON after stripping codeblock. Full response:")
            print(content)
            print("[Gemini Error] Extracted for JSON parsing:")
            print(content_stripped)
            raise e

    except Exception as e:
        print(
            f"{ANSI_GREEN}[MJAK]{ANSI_BRIGHT_MAGENTA}[Operate] Gemini call failed. {ANSI_RESET}",
            e,
        )
        if config.verbose:
            traceback.print_exc()
        return [], None