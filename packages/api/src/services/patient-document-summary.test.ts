import { describe, expect, mock, test } from "bun:test";
import { patient, patientDocument } from "@wellfit-emr/db/schema/clinical";
import type { generateText } from "ai";
import { eq } from "drizzle-orm";
import { createTestContext } from "../test-utils";
import {
  extractTextFromDocument,
  generatePatientDocumentSummary,
} from "./patient-document-summary";

function createMinimalPdf(text: string): Uint8Array {
  const escapedText = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const stream = `BT /F1 24 Tf 72 720 Td (${escapedText}) Tj ET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(pdf.length);
    pdf += object;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

describe("extractTextFromDocument", () => {
  test("extracts text and page count from a real PDF using unpdf", async () => {
    const extracted = await extractTextFromDocument(
      createMinimalPdf("Paciente con PDF de prueba"),
      "application/pdf"
    );

    expect(extracted.text).toContain("Paciente con PDF de prueba");
    expect(extracted.pdfTotalPages).toBe(1);
    expect(extracted.errorMessage).toBeUndefined();
  });

  test("accepts PDF MIME types with parameters", async () => {
    const extracted = await extractTextFromDocument(
      createMinimalPdf("PDF con content type parametrizado"),
      "application/pdf; charset=binary"
    );

    expect(extracted.text).toContain("PDF con content type parametrizado");
    expect(extracted.pdfTotalPages).toBe(1);
  });
});

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

  test("extracts text from PDF and generates summary", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () => new Uint8Array([1, 2, 3])),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "application/pdf", size: 100 })),
      upload: mock(async () => undefined),
    };

    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        resumenGeneral: "Resumen PDF",
        puntosClinicamenteRelevantes: ["Punto relevante"],
        fechasImportantes: [],
        advertencias: "Ninguna",
        limitaciones: "Texto corto",
        disclaimer: "Disclaimer",
      },
    })) as unknown as typeof generateText;

    const fakeExtract = mock(async () => ({
      text: "Texto extraído del PDF.",
      pdfTotalPages: 5,
    }));

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
        sizeBytes: 100,
        storageKey: "s3://bucket/scan.pdf",
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
      fakeGenerateText,
      fakeExtract
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
    expect(updated.extractedText).toBe("Texto extraído del PDF.");
    expect(updated.summaryText).toBe("Resumen PDF");
    expect(updated.summaryJson).toMatchObject({ pdfTotalPages: 5 });
    expect(fakeExtract).toHaveBeenCalled();
  });

  test("normalizes array fields returned by the model", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () => new Uint8Array([1, 2, 3])),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "application/pdf", size: 100 })),
      upload: mock(async () => undefined),
    };

    const fakeGenerateText = mock(async () => ({
      text: "fake",
      output: {
        resumenGeneral: "Resumen PDF no clínico",
        puntosClinicamenteRelevantes: ["No aplica"],
        fechasImportantes: ["23 de noviembre de 2024"],
        advertencias: [
          "Contiene datos personales.",
          "No es un documento clínico.",
        ],
        limitaciones: [
          "No contiene información médica.",
          "Requiere revisión del archivo original.",
        ],
        disclaimer: "Disclaimer",
      },
    })) as unknown as typeof generateText;

    const fakeExtract = mock(async () => ({
      text: "Texto extraído de un derecho de petición.",
      pdfTotalPages: 4,
    }));

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
        originalFileName: "derecho-peticion.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        storageKey: "s3://bucket/derecho-peticion.pdf",
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
      fakeGenerateText,
      fakeExtract
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
    expect(updated.summaryJson).toMatchObject({
      advertencias: "Contiene datos personales.\nNo es un documento clínico.",
      limitaciones:
        "No contiene información médica.\nRequiere revisión del archivo original.",
      pdfTotalPages: 4,
    });
  });

  test("marks PDF with empty extracted text as failed", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () => new Uint8Array([1, 2, 3])),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "application/pdf", size: 3 })),
      upload: mock(async () => undefined),
    };

    const fakeExtract = mock(async () => ({ text: "", pdfTotalPages: 2 }));

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

    await generatePatientDocumentSummary(
      ctx.db,
      storage,
      doc.id,
      undefined,
      fakeExtract
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

    expect(updated.status).toBe("failed");
    expect(updated.errorMessage).toContain("no contiene texto extraíble");
    expect(updated.summaryJson).toMatchObject({ pdfTotalPages: 2 });
  });

  test("marks unsupported mime type as failed with limitation summary", async () => {
    const ctx = createTestContext();
    const storage = {
      get: mock(async () => new Uint8Array([1, 2, 3])),
      delete: mock(async () => undefined),
      head: mock(async () => ({ mimeType: "image/png", size: 3 })),
      upload: mock(async () => undefined),
    };

    const fakeExtract = mock(async () => ({ text: null }));

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
        originalFileName: "scan.png",
        mimeType: "image/png",
        sizeBytes: 3,
        storageKey: "s3://bucket/scan.png",
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
      undefined,
      fakeExtract
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

    expect(updated.status).toBe("failed");
    expect(updated.errorMessage).toContain("no admite extracción automática");
  });
});
