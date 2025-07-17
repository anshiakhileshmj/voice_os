import sys
import os
import time
import asyncio
from prompt_toolkit.shortcuts import message_dialog
from prompt_toolkit import prompt
from operate.exceptions import ModelNotRecognizedException
import platform

from operate.models.prompts import (
    USER_QUESTION,
    get_system_prompt,
)
from operate.config import Config
from operate.utils.style import (
    ANSI_GREEN,
    ANSI_RESET,
    ANSI_YELLOW,
    ANSI_RED,
    ANSI_BRIGHT_MAGENTA,
    ANSI_BLUE,
    style,
)
from operate.utils.operating_system import OperatingSystem
from operate.models.apis import get_next_action

# Load configuration
config = Config()
operating_system = OperatingSystem()

def main(model, terminal_prompt, verbose_mode=False):
    """
    Main function for the MJAK.

    Parameters:
    - model: The model used for generating responses.
    - terminal_prompt: A string representing the prompt provided in the terminal.

    Returns:
    None
    """

    config.verbose = verbose_mode
    config.validation()  # No arguments, Gemini only

    # Skip message dialog if prompt was given directly
    if not terminal_prompt:
        message_dialog(
            title="MJAK",
            text="Let's automate your life",
            style=style,
        ).run()
    else:
        print("Running direct prompt...")

    # Clear the console
    if platform.system() == "Windows":
        os.system("cls")
    else:
        print("\033c", end="")

    if terminal_prompt:
        objective = terminal_prompt
    else:
        print(
            f"[{ANSI_GREEN}MJAK {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]\n{USER_QUESTION}"
        )
        print(f"{ANSI_YELLOW}[User]{ANSI_RESET}")
        objective = prompt(style=style)

    system_prompt = get_system_prompt(model, objective)
    system_message = {"role": "system", "content": system_prompt}
    messages = [system_message]

    loop_count = 0
    session_id = None

    while True:
        if config.verbose:
            print("[MJAK] loop_count", loop_count)
        try:
            operations, session_id = asyncio.run(
                get_next_action(model, messages, objective, session_id)
            )
            if not operations:
                print(f"{ANSI_GREEN}[MJAK]{ANSI_RESET} No operations to perform, exiting.")
                break
            stop = operate(operations, model)
            if stop:
                break
            loop_count += 1
            if loop_count > 10:
                break
        except ModelNotRecognizedException as e:
            print(
                f"{ANSI_GREEN}[MJAK]{ANSI_RED}[Error] -> {e} {ANSI_RESET}"
            )
            break
        except Exception as e:
            print(
                f"{ANSI_GREEN}[MJAK]{ANSI_RED}[Error] -> {e} {ANSI_RESET}"
            )
            break

def operate(operations, model):
    if config.verbose:
        print("[MJAK][operate]")
    for operation in operations:
        if config.verbose:
            print("[MJAK][operate] operation", operation)
        time.sleep(1)
        operate_type = operation.get("operation", "").lower()
        operate_thought = operation.get("thought", "")
        operate_detail = ""
        if config.verbose:
            print("[MJAK][operate] operate_type", operate_type)

        if operate_type == "press" or operate_type == "hotkey":
            keys = operation.get("keys", [])
            operate_detail = keys
            operating_system.press(keys)
        elif operate_type == "write":
            content = operation.get("content", "")
            operate_detail = content
            operating_system.write(content)
        elif operate_type == "click":
            x = operation.get("x")
            y = operation.get("y")
            click_detail = {"x": x, "y": y}
            operate_detail = click_detail
            operating_system.mouse(click_detail)
        elif operate_type == "done":
            summary = operation.get("summary", "")
            print(
                f"[{ANSI_GREEN}MJAK {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]"
            )
            print(f"{ANSI_BLUE}Objective Complete: {ANSI_RESET}{summary}\n")
            return True
        else:
            print(
                f"{ANSI_GREEN}[MJAK]{ANSI_RED}[Error] unknown operation response :({ANSI_RESET}"
            )
            print(
                f"{ANSI_GREEN}[MJAK]{ANSI_RED}[Error] AI response {ANSI_RESET}{operation}"
            )
            return True

        print(
            f"[{ANSI_GREEN}MJAK {ANSI_RESET}|{ANSI_BRIGHT_MAGENTA} {model}{ANSI_RESET}]"
        )
        print(f"{operate_thought}")
        print(f"{ANSI_BLUE}Action: {ANSI_RESET}{operate_type} {operate_detail}\n")

    return False