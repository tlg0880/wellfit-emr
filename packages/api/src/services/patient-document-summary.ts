import { fireworks } from "@ai-sdk/fireworks";
import { patientDocument } from "@wellfit-emr/db/schema/clinical";
import { generateText, Output, zodSchema } from "ai";
import { eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { z } from "zod";
import type { Db } from "../context";
import type { StorageService } from "./storage";

const MAX_EXTRACTED_TEXT_LENGTH = 20_000;
const MAX_PROMPT_TEXT_LENGTH = 15_000;

const summarySchema = z.object({
  resumenGeneral: z.string(),
  puntosClinicamenteRelevantes: z.array(z.string()),
  fechasImportantes: z.array(z.string()),
  advertencias: z.string(),
  limitaciones: z.string(),
  disclaimer: z.string(),
});

interface ExtractedDocumentText {
  errorMessage?: string;
  pdfTotalPages?: number;
  text: string | null;
}

export async function extractTextFromDocument(
  bytes: Uint8Array,
  mimeType: string
): Promise<ExtractedDocumentText> {
  if (mimeType === "text/plain") {
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const text = decoder.decode(bytes);
    return {
      text:
        text.length > MAX_EXTRACTED_TEXT_LENGTH
          ? text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
          : text,
    };
  }

  if (mimeType === "application/pdf") {
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const { text, totalPages } = await extractText(pdf, { mergePages: true });
      return {
        text:
          text && text.length > MAX_EXTRACTED_TEXT_LENGTH
            ? text.slice(0, MAX_EXTRACTED_TEXT_LENGTH)
            : text,
        pdfTotalPages: totalPages,
      };
    } catch (error) {
      console.error("[patient-document-summary] PDF extraction failed", error);
      return {
        errorMessage:
          error instanceof Error
            ? error.message
            : "No se pudo extraer texto del PDF.",
        text: null,
      };
    }
  }

  return { text: null };
}

export async function generatePatientDocumentSummary(
  db: Db,
  storage: StorageService,
  documentId: string,
  generateTextFn: typeof generateText = generateText,
  extractFn: typeof extractTextFromDocument = extractTextFromDocument
) {
  await db
    .update(patientDocument)
    .set({ status: "processing" })
    .where(eq(patientDocument.id, documentId));

  let record: typeof patientDocument.$inferSelect | undefined;

  try {
    const [found] = await db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, documentId))
      .limit(1);

    if (!found) {
      throw new Error("Patient document not found.");
    }
    record = found;

    const bytes = await storage.get(record.storageKey);
    const {
      errorMessage: extractionErrorMessage,
      text: extractedText,
      pdfTotalPages,
    } = await extractFn(bytes, record.mimeType);

    if (extractedText == null || extractedText.trim() === "") {
      let limitationText =
        "El documento no contiene texto extraíble. Podría ser un archivo escaneado, protegido o con contenido solo visual.";
      if (extractionErrorMessage) {
        limitationText = `No se pudo extraer texto del documento: ${extractionErrorMessage}`;
      } else if (extractedText == null) {
        limitationText = `El formato ${record.mimeType} no admite extracción automática de texto. Se soporta text/plain y application/pdf.`;
      }

      const limitationSummary: Record<string, unknown> = {
        resumenGeneral:
          "No se pudo extraer texto del documento porque el formato no es compatible con extracción automática en esta versión.",
        puntosClinicamenteRelevantes: [],
        fechasImportantes: [],
        advertencias: "Requiere revisión manual del archivo original.",
        limitaciones: limitationText,
        disclaimer:
          "Este resumen es una ayuda para navegación y comprensión del documento. No sustituye el criterio médico ni la revisión directa del archivo.",
      };

      if (pdfTotalPages != null) {
        limitationSummary.pdfTotalPages = pdfTotalPages;
      }

      await db
        .update(patientDocument)
        .set({
          status: "failed",
          summaryText: String(limitationSummary.resumenGeneral),
          summaryJson: limitationSummary,
          extractedText: null,
          errorMessage: String(limitationSummary.limitaciones),
        })
        .where(eq(patientDocument.id, documentId));

      return;
    }

    const promptText =
      extractedText.length > MAX_PROMPT_TEXT_LENGTH
        ? `${extractedText.slice(0, MAX_PROMPT_TEXT_LENGTH)}\n\n[Texto truncado por límite de contexto.]`
        : extractedText;

    const { output: summaryOutput } = await generateTextFn({
      model: fireworks("accounts/fireworks/routers/kimi-k2p6-turbo"),
      system:
        "Eres un asistente médico que resume documentos clínicos adjuntos. Proporciona un resumen estructurado en español con los campos solicitados. Sé conciso y preciso. No inventes datos que no estén en el texto.",
      prompt: `A continuación se presenta el texto extraído de un documento adjunto de un paciente. Genera un resumen estructurado en JSON con estos campos:\n- resumenGeneral: resumen breve del contenido general\n- puntosClinicamenteRelevantes: lista de puntos médicamente relevantes\n- fechasImportantes: lista de fechas encontradas y su significado\n- advertencias: advertencias o información que requiera revisión médica\n- limitaciones: limitaciones del resumen o del documento (por ejemplo, si el texto está truncado o incompleto)\n- disclaimer: una frase estándar indicando que este resumen es una ayuda para navegación y comprensión y no reemplaza el criterio médico.\n\nTexto extraído:\n"""\n${promptText}\n"""`,
      output: Output.object({
        schema: zodSchema(summarySchema),
        name: "DocumentSummary",
      }),
    });

    const summaryJson: Record<string, unknown> = { ...summaryOutput };
    if (pdfTotalPages != null) {
      summaryJson.pdfTotalPages = pdfTotalPages;
    }

    await db
      .update(patientDocument)
      .set({
        status: "completed",
        summaryText: summaryOutput.resumenGeneral,
        summaryJson,
        extractedText,
        errorMessage: null,
      })
      .where(eq(patientDocument.id, documentId));
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown error during summary generation.";
    console.error(
      `[patient-document-summary] failed for document ${documentId}`,
      error
    );
    await db
      .update(patientDocument)
      .set({
        status: "failed",
        errorMessage,
      })
      .where(eq(patientDocument.id, documentId));
  }
}
