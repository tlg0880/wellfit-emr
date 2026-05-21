import { generatePatientDocumentSummary } from "@wellfit-emr/api/services/patient-document-summary";
import {
  createStorageService,
  isAllowedMimeType,
  isAllowedSize,
} from "@wellfit-emr/api/services/storage";
import { auth } from "@wellfit-emr/auth";
import { db } from "@wellfit-emr/db";
import { patient, patientDocument } from "@wellfit-emr/db/schema/clinical";
import { eq } from "drizzle-orm";
import type { Context } from "hono";

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 200);
}

export async function patientDocumentsUploadHandler(c: Context) {
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

  const patientId = formData.get("patientId");
  const file = formData.get("file");

  if (typeof patientId !== "string" || !patientId) {
    return c.json({ error: "Missing or invalid patientId" }, 400);
  }
  if (!(file instanceof File)) {
    return c.json({ error: "Missing or invalid file" }, 400);
  }

  if (!isAllowedMimeType(file.type)) {
    return c.json({ error: `MIME type not allowed: ${file.type}` }, 400);
  }
  if (!isAllowedSize(file.size)) {
    return c.json({ error: "File size exceeds maximum allowed (20 MB)" }, 400);
  }

  const [foundPatient] = await db
    .select({ id: patient.id })
    .from(patient)
    .where(eq(patient.id, patientId))
    .limit(1);

  if (!foundPatient) {
    return c.json({ error: "Patient not found" }, 404);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const safeName = sanitizeFileName(file.name) || "documento-adjunto";
  const storageKey = `patient-documents/${patientId}/${crypto.randomUUID()}/${safeName}`;

  const storage = createStorageService();
  try {
    await storage.upload(storageKey, bytes, file.type);
  } catch (error) {
    console.error("[patient-documents-upload] storage upload failed", error);
    return c.json({ error: "Failed to upload file to storage" }, 500);
  }

  let created: typeof patientDocument.$inferSelect;
  try {
    const [inserted] = await db
      .insert(patientDocument)
      .values({
        id: crypto.randomUUID(),
        patientId,
        originalFileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        storageKey,
        uploadedByUserId: session.user.id,
        status: "pending",
        summaryText: null,
        summaryJson: null,
        extractedText: null,
        errorMessage: null,
      })
      .returning();

    if (!inserted) {
      throw new Error("Insert returned no record");
    }
    created = inserted;
  } catch (error) {
    console.error("[patient-documents-upload] db insert failed", error);
    await storage.delete(storageKey).catch((deleteError: unknown) => {
      console.error(
        "[patient-documents-upload] failed to cleanup uploaded object after db error",
        deleteError
      );
    });
    return c.json({ error: "Failed to persist document metadata" }, 500);
  }

  queueMicrotask(() => {
    generatePatientDocumentSummary(db, storage, created.id).catch(
      (err: unknown) => {
        console.error(
          "[patient-documents-upload] summary generation failed",
          err
        );
      }
    );
  });

  return c.json(created, 201);
}
