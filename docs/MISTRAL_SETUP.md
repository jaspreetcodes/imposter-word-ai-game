# Basic Mistral 7B Instruct Setup (Hugging Face)

Steps to run **Mistral-7B-Instruct-v0.3** locally for inference. Official model card: [mistralai/Mistral-7B-Instruct-v0.3](https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.3).

---

## Do I need an API key?

- **Mistral (Mistral AI cloud):** You do **not** need a Mistral API key for this setup. The model card describes **running the model yourself** (locally or on your own server) via `mistral_inference` or Hugging Face `transformers`. A Mistral API key is only for [Mistral’s hosted API](https://console.mistral.ai/) (their cloud).
- **Hugging Face:** The model `mistralai/Mistral-7B-Instruct-v0.3` is **Apache 2.0** and **not gated**, so you can download it without logging in. If you want to avoid rate limits or use other gated models later:
  1. Go to [Hugging Face → Settings → Access Tokens](https://huggingface.co/settings/tokens).
  2. Create a token (read is enough).
  3. Run `huggingface-cli login` and paste the token, or set env var `HF_TOKEN` (or `HUGGING_FACE_HUB_TOKEN`).

**Summary:** No Mistral API key. Hugging Face token optional (recommended if you hit rate limits or use gated repos).

---

## Model card summary

- **What it is:** Mistral-7B-Instruct-v0.3 is an **instruct-tuned** LLM (7B parameters) from Mistral-7B-v0.3.
- **v0.3 changes:** Extended vocabulary (32,768), v3 tokenizer, and function-calling support.
- **Ways to run:** (1) Official **mistral_inference** (install → download → `mistral-chat` CLI or Python `Transformer` + `generate`), (2) **Hugging Face transformers** (`pipeline("text-generation", model="mistralai/Mistral-7B-Instruct-v0.3")`).
- **Limitation:** No built-in moderation; add guardrails for user-facing use.

---

## Prerequisites

- **Python 3.8+** and pip (use `python3` and `pip3` if that’s what’s on your system, e.g. on macOS)
- **Enough disk space** for the model (~14GB+ for 7B in safetensors)
- **GPU** recommended (e.g. CUDA); CPU is slower but possible with smaller batch sizes

---

## Option A: Official Mistral inference (`mistral_inference`)

Recommended by the model card for best compatibility.

### 1. Install

```bash
pip3 install mistral_inference
```

You may need `huggingface_hub` for downloading:

```bash
pip3 install huggingface_hub
```

### 2. Download the model

```python
from huggingface_hub import snapshot_download
from pathlib import Path

mistral_models_path = Path.home().joinpath('mistral_models', '7B-Instruct-v0.3')
mistral_models_path.mkdir(parents=True, exist_ok=True)

snapshot_download(
    repo_id="mistralai/Mistral-7B-Instruct-v0.3",
    allow_patterns=["params.json", "consolidated.safetensors", "tokenizer.model.v3"],
    local_dir=mistral_models_path,
)
```

### 3. Run chat (CLI)

After install, a `mistral-chat` CLI is available:

```bash
mistral-chat $HOME/mistral_models/7B-Instruct-v0.3 --instruct --max_tokens 256
```

### 4. Instruct following (Python)

```python
from pathlib import Path
from mistral_inference.transformer import Transformer
from mistral_inference.generate import generate
from mistral_common.tokens.tokenizers.mistral import MistralTokenizer
from mistral_common.protocol.instruct.messages import UserMessage
from mistral_common.protocol.instruct.request import ChatCompletionRequest

mistral_models_path = Path.home().joinpath('mistral_models', '7B-Instruct-v0.3')
tokenizer = MistralTokenizer.from_file(f"{mistral_models_path}/tokenizer.model.v3")
model = Transformer.from_folder(mistral_models_path)

completion_request = ChatCompletionRequest(
    messages=[UserMessage(content="Explain Machine Learning to me in a nutshell.")]
)
tokens = tokenizer.encode_chat_completion(completion_request).tokens
out_tokens, _ = generate(
    [tokens], model, max_tokens=64, temperature=0.0,
    eos_id=tokenizer.instruct_tokenizer.tokenizer.eos_id,
)
result = tokenizer.instruct_tokenizer.tokenizer.decode(out_tokens[0])
print(result)
```

---

## Option B: Hugging Face `transformers`

Easier if you already use `transformers`; no separate model download script.

### 1. Install

```bash
pip3 install transformers torch
```

### 2. Optional tokenizer deps

If you see errors about `sentencepiece` or `protobuf`, install:

```bash
pip3 install sentencepiece protobuf
```

### 3. Generate (pipeline)

```python
from transformers import pipeline

messages = [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Who are you?"},
]
chatbot = pipeline("text-generation", model="mistralai/Mistral-7B-Instruct-v0.3")
out = chatbot(messages)
print(out)
```

The first run will download the model from Hugging Face (requires login if the model is gated).

---

## Model details (from official card)

- **Mistral-7B-Instruct-v0.3** is an instruct fine-tuned version of Mistral-7B-v0.3.
- **Changes in v0.3:** extended vocabulary (32k), v3 tokenizer, function calling support.
- **License:** Apache 2.0.
- **Limitation:** No built-in moderation; add guardrails if deploying for user-facing content.

---

## Test with CLI (input → output)

A small script in the repo runs Mistral from the command line so you can verify it works:

```bash
pip3 install transformers torch sentencepiece protobuf
python3 scripts/mistral_cli.py "Explain machine learning in one sentence."
# or
echo "What is 2+2?" | python3 scripts/mistral_cli.py
```

First run will download the model (~14GB). Output is printed to stdout.

---

## Using this for the word game

- Run inference **offline or in a backend** (never in the browser). See [AI_SECURITY_CONSIDERATIONS.md](./AI_SECURITY_CONSIDERATIONS.md).
- The word pipeline in `scripts/wordPipeline/` is designed to use static word lists and optional AI (e.g. Mistral) for categorization/filtering; you can call Mistral from a small Python backend or script that the pipeline invokes.
