# Whisper transcription with word timestamps -> work/asr.json
import json, sys
from faster_whisper import WhisperModel
model_name = sys.argv[2] if len(sys.argv) > 2 else "large-v3"
m = WhisperModel(model_name, device="cpu", compute_type="int8", cpu_threads=4)
import subprocess, numpy as np
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
audio = np.frombuffer(raw, np.float32)
segs, info = m.transcribe(audio, language="hi", word_timestamps=True, beam_size=5, vad_filter=False,
                          condition_on_previous_text=False)
out = []
for s in segs:
    out.append({"start": s.start, "end": s.end, "text": s.text.strip(),
                "words": [{"s": w.start, "e": w.end, "w": w.word} for w in s.words]})
    print(f"{s.start:7.2f} {s.end:7.2f} {s.text}", flush=True)
import os; os.makedirs("work", exist_ok=True)
json.dump(out, open("work/asr.json", "w"), ensure_ascii=False, indent=1)
