import { CATEGORY_LABELS, searchDocuments, type LibraryCategory, type LibraryDocument } from "@cache/core";
import { useEffect, useMemo, useState } from "react";
import { askField, clearLibraryOpen, useCache } from "../hooks";

const CATS = ["all", ...Object.keys(CATEGORY_LABELS)] as Array<LibraryCategory | "all">;

export function Library() {
  const s = useCache();
  const [q, setQ] = useState(s.libraryQuery);
  const [cat, setCat] = useState<LibraryCategory | "all">("all");
  const [open, setOpen] = useState<LibraryDocument | null>(null);

  useEffect(() => {
    if (s.libraryQuery) setQ(s.libraryQuery);
  }, [s.libraryQuery]);

  useEffect(() => {
    if (!s.libraryOpenId) return;
    const doc = s.library.find((d) => d.id === s.libraryOpenId);
    if (doc) setOpen(doc);
  }, [s.libraryOpenId, s.library]);

  useEffect(() => {
    document.querySelector(".workspace")?.scrollTo(0, 0);
  }, [open]);

  const hits = useMemo(() => searchDocuments(s.library, q, cat), [s.library, q, cat]);

  return (
    <div className="stack">
      <div className="page-head">
        <p className="kicker">On device</p>
        <h2>Library</h2>
        <p>{s.library.length} public-domain field documents. Search never leaves this device.</p>
      </div>
      {!open && (
        <>
          <input className="input" placeholder="Search manuals…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="chips scroll-chips">
            {CATS.map((c) => (
              <button key={c} className={`chip ${cat === c ? "on" : ""}`} onClick={() => setCat(c)}>
                {c === "all" ? "All" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </>
      )}
      {open ? (
        <article className="card stack">
          <div className="row split-head">
            <h3>{open.title}</h3>
            <span className="spacer" />
            <button
              className="btn ghost"
              onClick={() => {
                setOpen(null);
                clearLibraryOpen();
              }}
            >
              Back
            </button>
            <button
              className="btn primary"
              onClick={() => askField(`Summarize and apply this manual to field use: ${open.title}`, "general")}
            >
              Ask AI
            </button>
          </div>
          <p className="mono">{open.source} · {open.license}</p>
          <div className="doc-body">{open.body}</div>
        </article>
      ) : (
        <div className="card">
          {hits.slice(0, 80).map((d) => (
            <button key={d.id} className="list-item" style={{ width: "100%", background: "none", border: 0, textAlign: "left" }} onClick={() => setOpen(d)}>
              <div>
                <strong>{d.title}</strong>
                <div className="muted">{CATEGORY_LABELS[d.category]} · {d.source}</div>
              </div>
              <span className="mono">{d.tags.slice(0, 3).join(" · ")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
