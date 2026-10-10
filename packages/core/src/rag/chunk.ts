import type { LibraryChunk, LibraryDocument } from "../types.js";

const TARGET = 700;
const OVERLAP = 80;

/** Split a document into overlapping prose chunks for FTS + citation. */
export function chunkDocument(doc: LibraryDocument): LibraryChunk[] {
  const paragraphs = doc.body
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: LibraryChunk[] = [];
  let buf = "";
  let ordinal = 0;

  const flush = () => {
    const text = buf.trim();
    if (!text) return;
    chunks.push({
      id: `${doc.id}:${ordinal}`,
      documentId: doc.id,
      title: doc.title,
      category: doc.category,
      source: doc.source,
      license: doc.license,
      text,
      ordinal,
    });
    ordinal += 1;
    buf = text.slice(-OVERLAP);
  };

  for (const p of paragraphs) {
    if (buf.length + p.length + 1 > TARGET && buf.length > 120) flush();
    buf = buf ? `${buf} ${p}` : p;
  }
  flush();
  return chunks;
}

export function chunkAll(docs: LibraryDocument[]): LibraryChunk[] {
  return docs.flatMap(chunkDocument);
}
