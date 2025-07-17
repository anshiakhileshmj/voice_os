import sys
import os
import subprocess
import platform
import base64
import json
import argparse
from dotenv import load_dotenv
import google.generativeai as genai
from PIL import Image

# "Objective for `operate`" : "Guideline for passing this test case given to Gemini"
TEST_CASES = {
    "Go to Github.com": "A Github page is visible.",
    "Go to Youtube.com and play a video": "The YouTube video player is visible.",
}

EVALUATION_PROMPT = """
Your job is to look at the given screenshot and determine if the following guideline is met in the image.
You must respond in the following format ONLY. Do not add anything else:
{{ "guideline_met": (true|false), "reason": "Explanation for why guideline was or wasn't met" }}
guideline_met must be set to a JSON boolean. True if the image meets the given guideline.
reason must be a string containing a justification for your decision.

Guideline: {guideline}
"""

SCREENSHOT_PATH = os.path.join("screenshots", "screenshot.png")

# Check if on a windows terminal that supports ANSI escape codes
def supports_ansi():
    plat = platform.system()
    supported_platform = plat != "Windows" or "ANSICON" in os.environ
    is_a_tty = hasattr(sys.stdout, "isatty") and sys.stdout.isatty()
    return supported_platform and is_a_tty

if supports_ansi():
    ANSI_GREEN = "\033[32m"
    ANSI_BRIGHT_GREEN = "\033[92m"
    ANSI_RESET = "\033[0m"
    ANSI_BLUE = "\033[94m"
    ANSI_YELLOW = "\033[33m"
    ANSI_RED = "\033[31m"
    ANSI_BRIGHT_MAGENTA = "\033[95m"
else:
    ANSI_GREEN = ""
    ANSI_BRIGHT_GREEN = ""
    ANSI_RESET = ""
    ANSI_BLUE = ""
    ANSI_YELLOW = ""
    ANSI_RED = ""
    ANSI_BRIGHT_MAGENTA = ""

def format_evaluation_prompt(guideline):
    return EVALUATION_PROMPT.format(guideline=guideline)

def parse_eval_content(content):
    try:
        res = json.loads(content)
        print(res["reason"])
        return res["guideline_met"]
    except Exception as e:
        print(
            "The model gave a bad evaluation response and it couldn't be parsed. Exiting..."
        )
        exit(1)

def evaluate_final_screenshot(guideline, gemini_model):
    """Load the final screenshot and return True or False if it meets the given guideline using Gemini."""
    with open(SCREENSHOT_PATH, "rb") as img_file:
        img = Image.open(img_file)
        prompt = format_evaluation_prompt(guideline)
        response = gemini_model.generate_content([prompt, img])
        eval_content = response.text.lstrip()
        return parse_eval_content(eval_content)

def run_test_case(objective, guideline, model, gemini_model):
    """Returns True if the result of the test with the given prompt meets the given guideline for the given model."""
    # Run `operate` with the model to evaluate and the test case prompt
    subprocess.run(
        ["operate", "-m", model, "--prompt", f'"{objective}"'],
        stdout=subprocess.DEVNULL,
    )

    try:
        result = evaluate_final_screenshot(guideline, gemini_model)
    except OSError:
        print("[Error] Couldn't open the screenshot for evaluation")
        return False

    return result

def get_test_model():
    parser = argparse.ArgumentParser(
        description="Run the MJAK with a specified model."
    )
    parser.add_argument(
        "-m",
        "--model",
        help="Specify the model to evaluate.",
        required=False,
        default="gemini-1.5-flash",
    )
    return parser.parse_args().model

def main():
    load_dotenv()
    google_api_key = os.getenv("GOOGLE_API_KEY")
    if not google_api_key:
        print("[Error] GOOGLE_API_KEY not found in environment or .env file.")
        sys.exit(1)
    genai.configure(api_key=google_api_key, transport="rest")
    gemini_model = genai.GenerativeModel("gemini-1.5-flash")

    model = get_test_model()

    print(f"{ANSI_BLUE}[EVALUATING MODEL `{model}`]{ANSI_RESET}")
    print(f"{ANSI_BRIGHT_MAGENTA}[STARTING EVALUATION]{ANSI_RESET}")

    passed = 0
    failed = 0
    for objective, guideline in TEST_CASES.items():
        print(f"{ANSI_BLUE}[EVALUATING]{ANSI_RESET} '{objective}'")

        result = run_test_case(objective, guideline, model, gemini_model)
        if result:
            print(f"{ANSI_GREEN}[PASSED]{ANSI_RESET} '{objective}'")
            passed += 1
        else:
            print(f"{ANSI_RED}[FAILED]{ANSI_RESET} '{objective}'")
            failed += 1

    print(
        f"{ANSI_BRIGHT_MAGENTA}[EVALUATION COMPLETE]{ANSI_RESET} {passed} test{'' if passed == 1 else 's'} passed, {failed} test{'' if failed == 1 else 's'} failed"
    )

if __name__ == "__main__":
    main()