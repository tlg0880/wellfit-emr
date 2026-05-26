# PDF Source Extraction

Use this file when the compact references do not answer a detailed RIPS-FEV question and the agent needs to consult the source PDF directly.

## Source File

Primary source:

```text
resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf
```

In this repo, `unpdf` is available from `packages/api`, so run extraction commands from that directory and reference the PDF as `../../resources/...`.

## Extract Specific Pages

Use this command to print selected pages:

```bash
cd /Users/verzach3/Projects/wellfit-emr/packages/api
bun - <<'TS'
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const pdfPath =
  "../../resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf";
const pagesToPrint = [41, 42, 43]; // 1-based PDF pages

const bytes = readFileSync(pdfPath);
const pdf = await getDocumentProxy(new Uint8Array(bytes));
const { text, totalPages } = await extractText(pdf, { mergePages: false });
await pdf.destroy();

console.log(`TOTAL_PAGES=${totalPages}`);
for (const pageNumber of pagesToPrint) {
  console.log(`\n--- PAGE ${pageNumber} ---\n${text[pageNumber - 1]}`);
}
TS
```

## Search For Terms

Use this command to find pages containing terms:

```bash
cd /Users/verzach3/Projects/wellfit-emr/packages/api
bun - <<'TS'
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const pdfPath =
  "../../resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf";
const queries = ["tipoNota", "RIPS sin factura", "certificado digital"];

const bytes = readFileSync(pdfPath);
const pdf = await getDocumentProxy(new Uint8Array(bytes));
const { text } = await extractText(pdf, { mergePages: false });
await pdf.destroy();

for (const query of queries) {
  console.log(`\nQUERY ${query}`);
  text.forEach((pageText, index) => {
    const lower = pageText.toLowerCase();
    const needle = query.toLowerCase();
    const hit = lower.indexOf(needle);
    if (hit >= 0) {
      const snippet = pageText.slice(Math.max(0, hit - 220), hit + 420);
      console.log(`\n--- PAGE ${index + 1} ---\n${snippet}`);
    }
  });
}
TS
```

## Export Plain Text For Grep

Create a temporary extracted text file when repeated searches are needed:

```bash
cd /Users/verzach3/Projects/wellfit-emr/packages/api
bun - <<'TS' > /tmp/rips-fev-lineamientos.txt
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

const pdfPath =
  "../../resources/lineamientos-generacion-validacion-rips-factura-electronica-fev-doc-electronicos.pdf";
const bytes = readFileSync(pdfPath);
const pdf = await getDocumentProxy(new Uint8Array(bytes));
const { text, totalPages } = await extractText(pdf, { mergePages: false });
await pdf.destroy();

console.log(`TOTAL_PAGES=${totalPages}`);
text.forEach((pageText, index) => {
  console.log(`\n--- PAGE ${index + 1} ---\n${pageText}`);
});
TS
rg -n "RVC034|CargarFevRips|ApplicationResponse|CUV" /tmp/rips-fev-lineamientos.txt
```

Do not commit temporary extracted text files unless the user explicitly asks for a derived reference artifact.

## Useful Page Map

- Pages 14-18: purpose, scope, normative context, and update caveat.
- Pages 19-40: functional model, actors, operation scenarios, glosas, NC/ND, RIPS sin factura, cápita, agreement follow-up, overexecution.
- Pages 41-63: data generation and SISPRO reference tables.
- Pages 64-80: client/server modules and API Docker methods.
- Pages 81-103: RIPS validation rules: RVG and RVC.
- Pages 104-116: electronic document XML validations.
- Pages 117-123: special lineamientos: anticipos, RIPS sin factura example/discrepancy, preparaciones magistrales, urgencias observation, operation types.
- Pages 123-124: services for ERP/pagadores: CUV consultation and file download.
- Pages 125-137: sending mechanisms, digital certificate, API response, messages, CUV recovery.
- Pages 138-143: contingency and help desk.

## How To Use Extracted Text

- Prefer page-specific extraction over loading the whole PDF into context.
- When a rule looks contradictory, extract all pages where the field/rule appears and compare control changes, narrative guidance, examples, and validation tables.
- Record discrepancies in implementation comments or validation metadata rather than silently choosing one value.
- If an exact field type, endpoint URL, schema shape, or catalog value is needed and the PDF points to another official artifact, retrieve that artifact instead of inferring from the lineamiento.
