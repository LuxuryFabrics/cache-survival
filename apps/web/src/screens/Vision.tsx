import { FIELD_ID_CATALOG, describeMatch, matchFieldId } from "@cache/core";
import { useState } from "react";
import { sendPrompt, setScreen } from "../hooks";
import { ocrImage } from "../lib/ocr";

export function Vision() {
  const [preview, setPreview] = useState<string>("");
  const [caption, setCaption] = useState("");
  const [ocr, setOcr] = useState("");
  const [result, setResult] = useState(describeMatch(undefined));

  async function onFile(file?: File) {
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    const text = await ocrImage(file);
    setOcr(text);
    const guess = matchFieldId(`${caption} ${file.name} ${text}`, FIELD_ID_CATALOG);
    setResult(describeMatch(guess, caption || file.name));
  }

  function identify() {
    const guess = matchFieldId(`${caption} ${ocr}`, FIELD_ID_CATALOG);
    const next = describeMatch(guess, caption);
    next.ocrText = ocr;
    setResult(next);
  }

  return (
    <div className="stack">
      <div>
        <p className="kicker">Local catalog · hybrid ID</p>
        <h2>Vision / Identify</h2>
        <p>Photos never upload. Matching uses the on-device field catalog plus optional local OCR. Unknown = do not eat.</p>
      </div>
      <div className="grid-2">
        <div className="card stack">
          <input type="file" accept="image/*" capture="environment" onChange={(e) => void onFile(e.target.files?.[0])} />
          {preview && <img src={preview} alt="Subject" style={{ width: "100%", borderRadius: 12 }} />}
          <textarea
            placeholder="Describe what you see: color, habitat, three leaflets, gills, hourglass…"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <button className="btn primary" onClick={identify}>Safety check</button>
        </div>
        <div className="card stack">
          <h3 className={`hazard-${result.hazard}`}>{result.label}</h3>
          <p className="mono">
            Hazard {result.hazard.toUpperCase()} · edible {result.edible ? "yes" : "no"} · toxic {result.toxic ? "yes" : "assume yes"}
          </p>
          <p className="lead">{result.summary}</p>
          <p>{result.safetyLine}</p>
          {result.lookalikes.length > 0 && <p className="muted">Lookalikes: {result.lookalikes.join(", ")}</p>}
          {ocr && (
            <div className="cite">
              <strong>OCR</strong>
              <div>{ocr}</div>
              <button
                className="btn ghost"
                onClick={() => {
                  setScreen("chat");
                  void sendPrompt(`Translate this photographed text to English and explain any field-relevant meaning:\n${ocr}`);
                }}
              >
                Translate with local AI
              </button>
            </div>
          )}
          <button
            className="btn"
            onClick={() => {
              setScreen("chat");
              void sendPrompt(`Identify and give a safety briefing. Caption: ${caption}. Catalog: ${result.label}. ${result.summary}`, {
                imageDescription: `${result.label} — ${result.summary}`,
                expertMode: "food-water",
              });
            }}
          >
            Ask AI about this photo
          </button>
        </div>
      </div>
    </div>
  );
}
