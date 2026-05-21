import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { patientDocument } from "@wellfit-emr/db/schema/clinical";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import { generatePatientDocumentSummary } from "../services/patient-document-summary";
import {
  createStorageService,
  isAllowedMimeType,
  isAllowedSize,
  type StorageService,
} from "../services/storage";

const nonEmptyStringSchema = z.string().min(1);

const patientDocumentSchema = z.object({
  createdAt: z.date(),
  errorMessage: z.string().nullable(),
  extractedText: z.string().nullable(),
  id: z.string(),
  mimeType: z.string(),
  originalFileName: z.string(),
  patientId: z.string(),
  sizeBytes: z.number(),
  status: z.string(),
  storageKey: z.string(),
  summaryJson: z.record(z.string(), z.unknown()).nullable(),
  summaryText: z.string().nullable(),
  updatedAt: z.date(),
  uploadedByUserId: z.string().nullable(),
});

const createPatientDocumentSchema = z.object({
  originalFileName: nonEmptyStringSchema,
  mimeType: nonEmptyStringSchema,
  patientId: nonEmptyStringSchema,
  sizeBytes: z.number().int().positive(),
  storageKey: nonEmptyStringSchema,
});

const listPatientDocumentsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: nonEmptyStringSchema,
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

const listResponseSchema = z.object({
  items: z.array(patientDocumentSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

let storageServiceFactory = createStorageService;

export function setPatientDocumentStorageServiceFactoryForTests(
  factory: () => StorageService
): void {
  storageServiceFactory = factory;
}

let summaryServiceRunner = generatePatientDocumentSummary;

export function setPatientDocumentSummaryServiceForTests(
  runner: typeof generatePatientDocumentSummary
): void {
  summaryServiceRunner = runner;
}

const createPatientDocumentProcedure = protectedProcedure
  .input(createPatientDocumentSchema)
  .output(patientDocumentSchema)
  .handler(async ({ context, input }) => {
    if (!isAllowedMimeType(input.mimeType)) {
      throw new ORPCError("BAD_REQUEST", {
        message: `MIME type not allowed: ${input.mimeType}.`,
      });
    }
    if (!isAllowedSize(input.sizeBytes)) {
      throw new ORPCError("BAD_REQUEST", {
        message: `File size exceeds maximum allowed (${
          20 * 1024 * 1024
        } bytes).`,
      });
    }

    const [created] = await context.db
      .insert(patientDocument)
      .values({
        ...input,
        id: crypto.randomUUID(),
        uploadedByUserId: context.session?.user?.id ?? null,
        status: "pending",
        summaryText: null,
        summaryJson: null,
        extractedText: null,
        errorMessage: null,
      })
      .returning();

    return created ?? throwCreateError("patient document");
  });

const listPatientDocumentsProcedure = protectedProcedure
  .input(listPatientDocumentsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = eq(patientDocument.patientId, input.patientId);
    const orderBy =
      input.sortDirection === "asc"
        ? asc(patientDocument.createdAt)
        : desc(patientDocument.createdAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(patientDocument)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(patientDocument).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const getPatientDocumentProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(patientDocumentSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient document not found.",
      });
    }

    return found;
  });

const generateSummarySchema = z.object({
  id: nonEmptyStringSchema,
});

const generateSummaryProcedure = protectedProcedure
  .input(generateSummarySchema)
  .output(patientDocumentSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient document not found.",
      });
    }

    await context.db
      .update(patientDocument)
      .set({ status: "processing" })
      .where(eq(patientDocument.id, input.id));

    const [updated] = await context.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, input.id))
      .limit(1);

    if (!updated) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to update document status.",
      });
    }

    const storage = storageServiceFactory();
    queueMicrotask(() => {
      summaryServiceRunner(context.db, storage, input.id).catch(
        (err: unknown) => {
          console.error(
            `[patient-documents] summary generation failed for ${input.id}`,
            err
          );
        }
      );
    });

    return updated;
  });

const deletePatientDocumentProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(patientDocument)
      .where(eq(patientDocument.id, input.id))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient document not found.",
      });
    }

    await context.db
      .delete(patientDocument)
      .where(eq(patientDocument.id, input.id));

    const storage = storageServiceFactory();
    try {
      await storage.delete(existing.storageKey);
    } catch (error) {
      console.error(
        `[patient-documents] failed to delete storage object ${existing.storageKey}`,
        error
      );
    }

    return true;
  });

export interface PatientDocumentsRouter extends Record<string, AnyRouter> {
  create: typeof createPatientDocumentProcedure;
  delete: typeof deletePatientDocumentProcedure;
  generateSummary: typeof generateSummaryProcedure;
  get: typeof getPatientDocumentProcedure;
  list: typeof listPatientDocumentsProcedure;
}

export const patientDocumentsRouter: PatientDocumentsRouter = {
  create: createPatientDocumentProcedure,
  delete: deletePatientDocumentProcedure,
  generateSummary: generateSummaryProcedure,
  get: getPatientDocumentProcedure,
  list: listPatientDocumentsProcedure,
};
