#!/usr/bin/env python3
"""
CLI to test Mistral-7B-Instruct-v0.3: reads a prompt from argv or stdin and prints model output.
Uses Hugging Face transformers (no Mistral API key; HF token optional for download).

Usage:
  pip3 install transformers torch sentencepiece protobuf
  python3 scripts/mistral_cli.py "Your question here"
  echo "Your question" | python3 scripts/mistral_cli.py
"""

import sys


def main() -> None:
    if len(sys.argv) > 1:
        prompt = " ".join(sys.argv[1:])
    else:
        prompt = sys.stdin.read().strip() or "Say hello in one sentence."

    if not prompt:
        print("Usage: python mistral_cli.py <prompt>", file=sys.stderr)
        sys.exit(1)

    try:
        from transformers import pipeline
    except ImportError:
        print("Install: pip3 install transformers torch sentencepiece protobuf", file=sys.stderr)
        sys.exit(1)

    print("Loading model (first run may download ~14GB)...", file=sys.stderr)
    chatbot = pipeline(
        "text-generation",
        model="mistralai/Mistral-7B-Instruct-v0.3",
        max_new_tokens=64,
    )
    messages = [
        {"role": "system", "content": "You are a helpful assistant. Reply briefly."},
        {"role": "user", "content": prompt},
    ]
    out = chatbot(messages, return_full_text=False)
    if out and len(out) > 0 and "generated_text" in out[0]:
        print(out[0]["generated_text"].strip())
    else:
        print(out, file=sys.stderr)


if __name__ == "__main__":
    main()
