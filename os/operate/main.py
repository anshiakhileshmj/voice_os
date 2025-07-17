import argparse
from operate.utils.style import ANSI_BRIGHT_MAGENTA
from operate.operate import main

def main_entry():
    parser = argparse.ArgumentParser(description="Run the MJAK with Gemini 1.5 Flash (Google).")
    parser.add_argument(
        "-m",
        "--model",
        help="Specify the model to use (default and only: gemini-1.5-flash)",
        required=False,
        default="gemini-1.5-flash",
    )
    parser.add_argument("--verbose", help="Run operate in verbose mode", action="store_true")
    parser.add_argument("--prompt", help="Directly input the objective prompt", type=str, required=False)
    # Removed --voice, as voice mode is not supported

    try:
        args = parser.parse_args()
        main(
            args.model,
            terminal_prompt=args.prompt,
            verbose_mode=args.verbose,
        )
    except KeyboardInterrupt:
        print(f"\n{ANSI_BRIGHT_MAGENTA}Exiting...")

if __name__ == "__main__":
    main_entry()