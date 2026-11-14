"""CAN.2 - transcrição local (container Whisper/faster-whisper). Nenhum áudio sai da máquina.

transcrever(bytes, nome) -> {"texto", "confianca", "sem_fala"}
confianca: média de exp(avg_logprob) dos segmentos (0 a 1). Abaixo do limiar, o atendimento confirma com o cidadão (anexo D3, item k).
"""
import json, math, urllib.request, uuid
from db import _env

LIMIAR_CONFIANCA = 0.55
LIMITE_BYTES = 10 * 1024 * 1024


def transcrever(dados, nome="audio.webm"):
    if not dados or len(dados) > LIMITE_BYTES:
        raise ValueError("áudio vazio ou maior que 10 MB")
    url = _env().get("STT_URL", "http://127.0.0.1:9000") + "/asr?task=transcribe&language=pt&output=json&encode=true&vad_filter=true"
    fronteira = uuid.uuid4().hex
    corpo = (f"--{fronteira}\r\nContent-Disposition: form-data; name=\"audio_file\"; filename=\"{nome}\"\r\n"
             f"Content-Type: application/octet-stream\r\n\r\n").encode() + dados + f"\r\n--{fronteira}--\r\n".encode()
    req = urllib.request.Request(url, data=corpo, headers={"Content-Type": f"multipart/form-data; boundary={fronteira}"})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = json.loads(r.read())
    segs = d.get("segments") or []
    texto = " ".join(s.get("text", "").strip() for s in segs).strip() or (d.get("text") or "").strip()
    confianca = sum(math.exp(s.get("avg_logprob", -5)) for s in segs) / len(segs) if segs else 0.0
    sem_fala = bool(segs) and all(s.get("no_speech_prob", 0) > 0.6 for s in segs)
    return {"texto": texto, "confianca": round(confianca, 3), "sem_fala": sem_fala or not texto}
