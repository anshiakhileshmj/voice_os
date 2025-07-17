ome
<h1 align="center">MJAK Framework</h1>

<p align="center">
  <strong>A framework to enable multimodal models to operate a computer.</strong>
</p>
<p align="center">
  Using the same inputs and outputs as a human operator, the model views the screen and decides on a series of mouse and keyboard actions to reach an objective. Released Nov 2023, the MJAK Framework was one of the first examples of using a multimodal model to view the screen and operate a computer.
</p>

<div align="center">
  <img src="https://github.com/OthersideAI/MJAK/blob/main/readme/MJAK.png" width="750"  style="margin: 10px;"/>
</div>

<!--
:rotating_light: **OUTAGE NOTIFICATION: gpt-4o**
**This model is currently experiencing an outage so the MJAK may not work as expected.**
-->


## Key Features
- **Compatibility**: Designed for various multimodal models.
- **Integration**: Currently integrated with **GPT-4o, GPT-4.1, o1, Gemini Pro Vision, Claude 3, Qwen-VL and LLaVa.**
- **Future Plans**: Support for additional models.

## Demo
https://github.com/OthersideAI/MJAK/assets/42594239/9e8abc96-c76a-46fb-9b13-03678b3c67e0


## Run `MJAK`

1. **Install the project**
```
pip install MJAK
```
2. **Run the project**
```
operate
```
3. **Enter your OpenAI Key**: If you don't have one, you can obtain an OpenAI key [here](https://platform.openai.com/account/api-keys). If you need you change your key at a later point, run `vim .env` to open the `.env` and replace the old key. 

<div align="center">
  <img src="https://github.com/OthersideAI/MJAK/blob/main/readme/key.png" width="300"  style="margin: 10px;"/>
</div>

4. **Give Terminal app the required permissions**: As a last step, the Terminal app will ask for permission for "Screen Recording" and "Accessibility" in the "Security & Privacy" page of Mac's "System Preferences".

<div align="center">
  <img src="https://github.com/OthersideAI/MJAK/blob/main/readme/terminal-access-1.png" width="300"  style="margin: 10px;"/>
  <img src="https://github.com/OthersideAI/MJAK/blob/main/readme/terminal-access-2.png" width="300"  style="margin: 10px;"/>
</div>

## Using `operate` Modes

#### OpenAI models

The default model for the project is gpt-4o which you can use by simply typing `operate`. To try running OpenAI's new `o1` model, use the command below.

```
operate -m o1-with-ocr
```

To experiment with OpenAI's latest `gpt-4.1` model, run:

```
operate -m gpt-4.1-with-ocr
```


### Multimodal Models  `-m`
Try Google's `gemini-pro-vision` by following the instructions below. Start `operate` with the Gemini model
```
operate -m gemini-pro-vision
```

**Enter your Google AI Studio API key when terminal prompts you for it** If you don't have one, you can obtain a key [here](https://makersuite.google.com/app/apikey) after setting up your Google AI Studio account. You may also need [authorize credentials for a desktop application](https://ai.google.dev/palm_docs/oauth_quickstart). It took me a bit of time to get it working, if anyone knows a simpler way, please make a PR.

#### Try Claude `-m claude-3`
Use Claude 3 with Vision to see how it stacks up to GPT-4-Vision at operating a computer. Navigate to the [Claude dashboard](https://console.anthropic.com/dashboard) to get an API key and run the command below to try it. 

```
operate -m claude-3
```

#### Try qwen `-m qwen-vl`
Use Qwen-vl with Vision to see how it stacks up to GPT-4-Vision at operating a computer. Navigate to the [Qwen dashboard](https://bailian.console.aliyun.com/) to get an API key and run the command below to try it. 

```
operate -m qwen-vl
```

#### Try LLaVa Hosted Through Ollama `-m llava`
If you wish to experiment with the MJAK Framework using LLaVA on your own machine, you can with Ollama!   
*Note: Ollama currently only supports MacOS and Linux. Windows now in Preview*   

First, install Ollama on your machine from https://ollama.ai/download.   

Once Ollama is installed, pull the LLaVA model:
```
ollama pull llava
```
This will download the model on your machine which takes approximately 5 GB of storage.   

When Ollama has finished pulling LLaVA, start the server:
```
ollama serve
```

That's it! Now start `operate` and select the LLaVA model:
```
operate -m llava
```   
**Important:** Error rates when using LLaVA are very high. This is simply intended to be a base to build off of as local multimodal models improve over time.

Learn more about Ollama at its [GitHub Repository](https://www.github.com/ollama/ollama)

### Voice Mode `--voice`
The framework supports voice inputs for the objective. Try voice by following the instructions below. 
**Clone the repo** to a directory on your computer:
```
git clone https://github.com/OthersideAI/MJAK.git
```
**Cd into directory**:
```
cd MJAK
```
Install the additional `requirements-audio.txt`
```
pip install -r requirements-audio.txt
```
**Install device requirements**
For mac users:
```
brew install portaudio
```
For Linux users:
```
sudo apt install portaudio19-dev python3-pyaudio
```
Run with voice mode
```
operate --voice
```

### Optical Character Recognition Mode `-m gpt-4-with-ocr`
The MJAK Framework now integrates Optical Character Recognition (OCR) capabilities with the `gpt-4-with-ocr` mode. This mode gives GPT-4 a hash map of clickable elements by coordinates. GPT-4 can decide to `click` elements by text and then the code references the hash map to get the coordinates for that element GPT-4 wanted to click. 

Based on recent tests, OCR performs better than `som` and vanilla GPT-4 so we made it the default for the project. To use the OCR mode you can simply write: 

 `operate` or `operate -m gpt-4-with-ocr` will also work. 

### Set-of-Mark Prompting `-m gpt-4-with-som`
The MJAK Framework now supports Set-of-Mark (SoM) Prompting with the `gpt-4-with-som` command. This new visual prompting method enhances the visual grounding capabilities of large multimodal models.

Learn more about SoM Prompting in the detailed arXiv paper: [here](https://arxiv.org/abs/2310.11441).

For this initial version, a simple YOLOv8 model is trained for button detection, and the `best.pt` file is included under `model/weights/`. Users are encouraged to swap in their `best.pt` file to evaluate performance improvements. If your model outperforms the existing one, please contribute by creating a pull request (PR).

Start `operate` with the SoM model

```
operate -m gpt-4-with-som
```


## OpenAI Rate Limiting Note
The ```gpt-4o``` model is required. To unlock access to this model, your account needs to spend at least \$5 in API credits. Pre-paying for these credits will unlock access if you haven't already spent the minimum \$5.   
Learn more **[here](https://platform.openai.com/docs/guides/rate-limits?context=tier-one)**


python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

GOOGLE_API_KEY=your-gemini-api-key-here

python -m operate.main