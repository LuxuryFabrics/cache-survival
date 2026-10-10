/**
 * Offline STT hook. Prefers a downloaded whisper.cpp / transformers pack.
 * Never uses the cloud Web Speech API (that would break the air-gap).
 */

export async function transcribeBlob(_audio: Blob): Promise<string> {
  throw new Error("Whisper pack not loaded. Download whisper.cpp tiny.en in Packs.");
}

export async function recordOnce(ms = 8000): Promise<Blob> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.start();
  await new Promise((r) => setTimeout(r, ms));
  await new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
    rec.stop();
  });
  stream.getTracks().forEach((t) => t.stop());
  return new Blob(chunks, { type: rec.mimeType || "audio/webm" });
}
