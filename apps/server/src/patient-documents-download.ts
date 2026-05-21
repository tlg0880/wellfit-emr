import { createStorageService } from "@wellfit-emr/api/services/storage";
import { auth } from "@wellfit-emr/auth";
import { db } from "@wellfit-emr/db";
import { patientDocument } from "@wellfit-emr/db/schema/clinical";
import { eq } from "drizzle-orm";
import type { Context } from "hono";

export async function patientDocumentsDownloadHandler(
  c: Context
): Promise<Response> {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const documentId = c.req.param("documentId");
  if (!documentId) {
    return c.json({ error: "Missing documentId" }, 400);
  }

  const [doc] = await db
    .select()
    .from(patientDocument)
    .where(eq(patientDocument.id, documentId))
    .limit(1);

  if (!doc) {
    return c.json({ error: "Document not found" }, 404);
  }

  const storage = createStorageService();
  let bytes: Uint8Array;
  try {
    bytes = await storage.get(doc.storageKey);
  } catch (error) {
    console.error(
      `[patient-documents-download] failed to get storage object ${doc.storageKey}`,
      error
    );
    return c.json({ error: "Failed to retrieve file from storage" }, 500);
  }

  const fallbackName =
    doc.originalFileName.replace(/[^\w.-]/g, "_").slice(0, 200) ||
    "documento-adjunto";
  const encodedName = encodeURIComponent(doc.originalFileName);

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`,
      "Content-Length": String(bytes.length),
    },
  });
}
