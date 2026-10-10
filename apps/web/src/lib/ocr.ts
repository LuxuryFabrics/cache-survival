import { optionalImport } from "./optional-import";

type TesseractMod = { recognize: (file: File, lang: string) => Promise<{ data: { text?: string } }> };
type PdfjsMod = {
  getDocument: (opts: { data: ArrayBuffer }) => { promise: Promise<{
    numPages: number;
    getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: { str?: string }[] }> }>;
  }> };
};

export async function ocrImage(file: File): Promise<string> {
  const tesseract = await optionalImport<TesseractMod>("tesseract.js");
  if (!tesseract) return "";
  try {
    const { data } = await tesseract.recognize(file, "eng");
    return String(data.text ?? "").trim();
  } catch {
    return "";
  }
}

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdfjs = await optionalImport<PdfjsMod>("pdfjs-dist");
  if (!pdfjs) {
    const asText = new TextDecoder().decode(buf);
    if (asText.includes("%PDF")) {
      return "[PDF binary imported. Install pdfjs-dist for text extraction, or export the manual as .txt/.md.]";
    }
    return asText;
  }
  try {
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str ?? "").join(" ") + "\n";
    }
    return text;
  } catch {
    return new TextDecoder().decode(buf);
  }
}
