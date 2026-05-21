import { describe, expect, mock, test } from "bun:test";
import { createRouterClient } from "@orpc/server";

import type { Context } from "../context";
import { appRouter } from "./index";
import {
  setPatientDocumentStorageServiceFactoryForTests,
  setPatientDocumentSummaryServiceForTests,
} from "./patient-documents";

interface PatientDocumentsClient {
  patientDocuments: {
    create(input: unknown): Promise<unknown>;
    list(input: unknown): Promise<unknown>;
    get(input: unknown): Promise<unknown>;
    delete(input: unknown): Promise<unknown>;
    generateSummary(input: unknown): Promise<unknown>;
  };
}

interface MockDb {
  delete: ReturnType<typeof mock>;
  insert: ReturnType<typeof mock>;
  select: ReturnType<typeof mock>;
  update: ReturnType<typeof mock>;
}

const session = {
  user: {
    email: "clinician@example.com",
    id: "clinician-id",
    name: "Clinician",
  },
};

const patientDocumentRecord = {
  createdAt: new Date("2026-04-23T00:00:00.000Z"),
  errorMessage: null,
  extractedText: null,
  id: "doc-id",
  mimeType: "application/pdf",
  originalFileName: "report.pdf",
  patientId: "patient-id",
  sizeBytes: 1024,
  status: "pending",
  storageKey: "patient-id/report.pdf",
  summaryJson: null,
  summaryText: null,
  updatedAt: new Date("2026-04-23T00:00:00.000Z"),
  uploadedByUserId: "clinician-id",
};

function createMockContext(db: MockDb): Context {
  return {
    auth: { api: {} },
    db,
    headers: new Headers(),
    session,
  } as unknown as Context;
}

function createPatientDocumentsClient(db: MockDb): PatientDocumentsClient {
  return createRouterClient(appRouter, {
    context: createMockContext(db),
  }) as unknown as PatientDocumentsClient;
}

describe("patientDocumentsRouter", () => {
  test("creates a patient document with validation", async () => {
    const returning = mock(async () => [patientDocumentRecord]);
    const values = mock(() => ({ returning }));
    const insert = mock(() => ({ values }));
    const db = {
      insert,
      select: mock(),
      update: mock(),
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    const result = await client.patientDocuments.create({
      originalFileName: "report.pdf",
      mimeType: "application/pdf",
      patientId: "patient-id",
      sizeBytes: 1024,
      storageKey: "patient-id/report.pdf",
    });

    expect(result).toEqual(patientDocumentRecord);
    expect(insert).toHaveBeenCalled();
  });

  test("rejects disallowed mime type on create", async () => {
    const db = {
      insert: mock(),
      select: mock(),
      update: mock(),
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    await expect(
      client.patientDocuments.create({
        originalFileName: "report.exe",
        mimeType: "application/x-msdownload",
        patientId: "patient-id",
        sizeBytes: 1024,
        storageKey: "patient-id/report.exe",
      })
    ).rejects.toThrow();
  });

  test("rejects oversized file on create", async () => {
    const db = {
      insert: mock(),
      select: mock(),
      update: mock(),
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    await expect(
      client.patientDocuments.create({
        originalFileName: "big.pdf",
        mimeType: "application/pdf",
        patientId: "patient-id",
        sizeBytes: 50 * 1024 * 1024,
        storageKey: "patient-id/big.pdf",
      })
    ).rejects.toThrow();
  });

  test("lists patient documents with pagination", async () => {
    const offset = mock(async () => [patientDocumentRecord]);
    const limit = mock(() => ({ offset }));
    const orderBy = mock(() => ({ limit }));
    const where = mock(() => ({ orderBy }));
    const from = mock(() => ({ where }));

    const totalWhere = mock(async () => [{ value: 1 }]);
    const totalFrom = mock(() => ({ where: totalWhere }));

    const select = mock((projection?: unknown) => {
      if (projection) {
        return { from: totalFrom };
      }
      return { from };
    });

    const db = {
      insert: mock(),
      select,
      update: mock(),
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    const result = await client.patientDocuments.list({
      limit: 10,
      offset: 0,
      patientId: "patient-id",
    });

    expect(result).toEqual({
      items: [patientDocumentRecord],
      limit: 10,
      offset: 0,
      total: 1,
    });
  });

  test("gets a patient document by id", async () => {
    const limit = mock(async () => [patientDocumentRecord]);
    const where = mock(() => ({ limit }));
    const from = mock(() => ({ where }));
    const select = mock(() => ({ from }));

    const db = {
      insert: mock(),
      select,
      update: mock(),
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    const result = await client.patientDocuments.get({ id: "doc-id" });

    expect(result).toEqual(patientDocumentRecord);
  });

  test("triggers generateSummary and returns document", async () => {
    const summaryRun = mock(async () => undefined);
    setPatientDocumentSummaryServiceForTests(summaryRun);

    const limit = mock(async () => [patientDocumentRecord]);
    const whereSelect = mock(() => ({ limit }));
    const fromSelect = mock(() => ({ where: whereSelect }));
    const select = mock(() => ({ from: fromSelect }));

    const updateWhere = mock(async () => undefined);
    const updateSet = mock(() => ({ where: updateWhere }));
    const updateFn = mock(() => ({ set: updateSet }));

    const db = {
      insert: mock(),
      select,
      update: updateFn,
      delete: mock(),
    };
    const client = createPatientDocumentsClient(db);

    const result = await client.patientDocuments.generateSummary({
      id: "doc-id",
    });

    expect(result).toEqual(patientDocumentRecord);
    expect(select).toHaveBeenCalled();
    expect(updateFn).toHaveBeenCalled();
    expect(summaryRun).toHaveBeenCalled();
  });

  test("deletes a patient document and attempts storage cleanup", async () => {
    const storageDelete = mock(async () => undefined);
    setPatientDocumentStorageServiceFactoryForTests(() => ({
      delete: storageDelete,
      get: mock(async () => new Uint8Array()),
      head: mock(async () => ({ mimeType: "application/pdf", size: 1024 })),
      upload: mock(async () => undefined),
    }));
    const limit = mock(async () => [patientDocumentRecord]);
    const whereSelect = mock(() => ({ limit }));
    const fromSelect = mock(() => ({ where: whereSelect }));
    const select = mock(() => ({ from: fromSelect }));

    const deleteWhere = mock(async () => undefined);
    const deleteFn = mock(() => ({ where: deleteWhere }));

    const db = {
      insert: mock(),
      select,
      update: mock(),
      delete: deleteFn,
    };
    const client = createPatientDocumentsClient(db);

    const result = await client.patientDocuments.delete({ id: "doc-id" });

    expect(result).toBe(true);
    expect(select).toHaveBeenCalled();
    expect(deleteFn).toHaveBeenCalled();
    expect(storageDelete).toHaveBeenCalledWith(
      patientDocumentRecord.storageKey
    );
  });
});
