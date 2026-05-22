import { extractPatientAutofillFromPdf } from "@wellfit-emr/api/services/patient-pdf-autofill";
import { auth } from "@wellfit-emr/auth";
import { db } from "@wellfit-emr/db";
import type { Context } from "hono";

const MAX_PATIENT_AUTOFILL_PDF_SIZE_BYTES = 20 * 1024 * 1024;
const PDF_MIME_TYPE = "application/pdf";

function getBaseMimeType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

function inferMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }
  return file.name.toLowerCase().endsWith(".pdf") ? PDF_MIME_TYPE : "";
}

export async function patientsPdfAutofillHandler(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: "Invalid form data" }, 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return c.json({ error: "Missing or invalid file" }, 400);
  }

  const mimeType = inferMimeType(file);
  if (getBaseMimeType(mimeType) !== PDF_MIME_TYPE) {
    return c.json({ error: "Solo se admiten archivos PDF" }, 400);
  }
  if (file.size <= 0 || file.size > MAX_PATIENT_AUTOFILL_PDF_SIZE_BYTES) {
    return c.json({ error: "El PDF debe pesar entre 1 byte y 20 MB" }, 400);
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await extractPatientAutofillFromPdf(db, bytes, mimeType, {
      fileName: file.name,
    });
    return c.json(result, 200);
  } catch (error) {
    console.error("[patients-pdf-autofill] extraction failed", error);
    return c.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo extraer información del PDF",
      },
      422
    );
  }
}
