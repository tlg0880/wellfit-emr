import { describe, expect, mock, test } from "bun:test";
import { patient, patientDocument } from "@wellfit-emr/db/schema/clinical";
import type { generateText } from "ai";
import { eq } from "drizzle-orm";
import { createTestContext } from "../test-utils";
import { generatePatientDocumentSummary } from "./patient-document-summary";

describe("generatePatientDocumentSummary", () => {
  test("extracts text from plain text and generates summary", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () =>
        new TextEncoder().encode("Paciente con diabetes tipo 2.")
      ),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "text/plain", size: 100 })),
      upload: mock(async () => undefined),
    };

    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        resumenGeneral: "Resumen de prueba",
        puntosClinicamenteRelevantes: ["Diabetes tipo 2"],
        fechasImportantes: [],
        advertencias: "Ninguna",
        limitaciones: "Texto corto",
        disclaimer: "Disclaimer",
      },
    })) as unknown as typeof generateText;

    const patientId = crypto.randomUUID();
    await ctx.db.insert(patient).values({
      id: patientId,
      primaryDocumentType: "CC",
      primaryDocumentNumber: crypto.randomUUID(),
      firstName: "Test",
      lastName1: "User",
      birthDate: new Date("1990-01-01"),
      sexAtBirth: "M",
    });

    const docs = await ctx.db
      .insert(patientDocument)
      .values({
        id: crypto.randomUUID(),
        patientId,
        originalFileName: "note.txt",
        mimeType: "text/plain",
        sizeBytes: 100,
        storageKey: "s3://bucket/note.txt",
        uploadedByUserId: null,
        status: "pending",
      })
      .returning();
    if (!docs[0]) {
      throw new Error("Expected doc to be defined");
    }
    const doc = docs[0];

    await generatePatientDocumentSummary(
      ctx.db,
      storage,
      doc.id,
      fakeGenerateText
    );

    const updatedRows = await ctx.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, doc.id))
      .limit(1);
    if (!updatedRows[0]) {
      throw new Error("Expected updated row to be defined");
    }
    const updated = updatedRows[0];

    expect(updated.status).toBe("completed");
    expect(updated.extractedText).toBe("Paciente con diabetes tipo 2.");
    expect(updated.summaryText).toBe("Resumen de prueba");
    expect(fakeGenerateText).toHaveBeenCalled();
  });

  test("marks unsupported mime type as failed with limitation summary", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () => new Uint8Array([1, 2, 3])),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "application/pdf", size: 3 })),
      upload: mock(async () => undefined),
    };

    const patientId = crypto.randomUUID();
    await ctx.db.insert(patient).values({
      id: patientId,
      primaryDocumentType: "CC",
      primaryDocumentNumber: crypto.randomUUID(),
      firstName: "Test",
      lastName1: "User",
      birthDate: new Date("1990-01-01"),
      sexAtBirth: "M",
    });

    const docs = await ctx.db
      .insert(patientDocument)
      .values({
        id: crypto.randomUUID(),
        patientId,
        originalFileName: "scan.pdf",
        mimeType: "application/pdf",
        sizeBytes: 3,
        storageKey: "s3://bucket/scan.pdf",
        uploadedByUserId: null,
        status: "pending",
      })
      .returning();
    if (!docs[0]) {
      throw new Error("Expected doc to be defined");
    }
    const doc = docs[0];

    await generatePatientDocumentSummary(ctx.db, storage, doc.id);

    const updatedRows = await ctx.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, doc.id))
      .limit(1);
    if (!updatedRows[0]) {
      throw new Error("Expected updated row to be defined");
    }
    const updated = updatedRows[0];

    expect(updated.status).toBe("failed");
    expect(updated.errorMessage).toContain("no admite extracción automática");
  });
});
