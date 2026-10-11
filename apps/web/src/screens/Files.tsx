import { fileChunks, extractPlainText, type LibraryChunk } from "@cache/core";
import { MobileBack } from "../components/Shell";
import { addFileMeta, deleteFile, sendPrompt, setScreen, useCache } from "../hooks";
import { extractPdfText } from "../lib/ocr";

export function Files() {
  const { files } = useCache();

  async function onPick(list: FileList | null) {
    if (!list) return;
    for (const file of Array.from(list)) {
      let raw = "";
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) raw = await extractPdfText(file);
      else raw = await file.text();
      const text = extractPlainText(raw, file.type || "text/plain");
      const id = `file_${Date.now()}_${file.name}`;
      const chunks = fileChunks(id, file.name, text).map((c, i) => ({
        id: c.id,
        documentId: id,
        title: file.name,
        category: "general" as const,
        source: "Your Files",
        license: "user",
        text: c.text,
        ordinal: i,
      })) satisfies LibraryChunk[];
      addFileMeta(
        { id, name: file.name, mime: file.type || "text/plain", bytes: file.size, addedAt: Date.now(), textChars: text.length },
        chunks,
      );
    }
  }

  return (
    <div className="stack">
      <MobileBack />
      <div className="page-head">
        <p className="kicker">Local RAG</p>
        <h2>Files</h2>
        <p>Import PDFs and text. Chat can cite them on-device.</p>
      </div>
      <div className="card stack">
        <input
          type="file"
          multiple
          accept=".pdf,.txt,.md,.html"
          onChange={(e) => void onPick(e.target.files)}
        />
        {files.map((f) => (
          <div key={f.id} className="list-item">
            <div>
              <strong>{f.name}</strong>
              <div className="muted">{(f.bytes / 1024).toFixed(1)} KB · {f.textChars} chars</div>
            </div>
            <div className="row">
              <button
                className="btn ghost"
                onClick={() => {
                  setScreen("chat");
                  void sendPrompt(`What are the key field procedures in my file “${f.name}”?`);
                }}
              >
                Ask AI
              </button>
              <button className="btn danger" onClick={() => deleteFile(f.id)}>Delete</button>
            </div>
          </div>
        ))}
        {files.length === 0 && <p className="muted">Nothing imported yet.</p>}
      </div>
    </div>
  );
}
