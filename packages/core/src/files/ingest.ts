/** Very small text normalizer for imported manuals / notes / PDF extracts. */

export function extractPlainText(raw: string, mime: string): string {
  if (mime === "text/html") {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }
  return raw.replace(/\u0000/g, " ").replace(/\s+\n/g, "\n").trim();
}

export function fileChunks(fileId: string, name: string, text: string): { id: string; documentId: string; title: string; text: string; ordinal: number }[] {
  const parts = text.split(/\n{2,}/).map((p) => p.trim()).filter((p) => p.length > 40);
  const out: { id: string; documentId: string; title: string; text: string; ordinal: number }[] = [];
  let buf = "";
  let ordinal = 0;
  const flush = () => {
    const t = buf.trim();
    if (t.length < 40) return;
    out.push({
      id: `${fileId}:${ordinal}`,
      documentId: fileId,
      title: name,
      text: t.slice(0, 1200),
      ordinal,
    });
    ordinal += 1;
    buf = "";
  };
  for (const p of parts) {
    if (buf.length + p.length > 700) flush();
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  flush();
  return out;
}
