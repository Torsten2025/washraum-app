"""Offline authoring only. Piper and CC0 model files live outside the repository."""
import json
import sys
import wave
from pathlib import Path
from piper import PiperVoice

items = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
models = Path(sys.argv[2])
for language, name in [("de", "de_DE-thorsten-medium"), ("en", "en_US-joe-medium")]:
    voice = PiperVoice.load(models / (name + ".onnx"))
    for item in items:
        if item["language"] != language:
            continue
        target = Path(item["output"])
        if target.exists():
            continue
        with wave.open(str(target), "wb") as output:
            voice.synthesize_wav(item["text"], output)
        print(target.name, flush=True)
