import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import {
  organization,
  ripsExport,
  ripsExportEncounter,
} from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";
import {
  generateRipsPayload,
  RipsGenerationError,
} from "../services/rips-generator";
import { normalizeRipsPeriodBounds } from "../services/rips-period";
import { validateRipsPreflight } from "../services/rips-preflight-validator";

const nonEmptyStringSchema = z.string().min(1);

const ripsExportSchema = z.object({
  cuv: z.string().nullable(),
  generatedAt: z.date(),
  id: z.string(),
  invoiceNumber: z.string().nullable(),
  muvResponseJson: z.record(z.string(), z.any()).nullable(),
  noteNumber: z.string().nullable(),
  noteType: z.string().nullable(),
  numUsers: z.number().nullable(),
  operationType: z.string(),
  organizationTaxId: z.string().nullable(),
  payloadJson: z.record(z.string(), z.any()).nullable(),
  payerId: z.string(),
  periodFrom: z.date(),
  periodTo: z.date(),
  sentAt: z.date().nullable(),
  status: z.string(),
  totalValue: z.string().nullable(),
  validationResultJson: z.record(z.string(), z.any()).nullable(),
});

const createRipsExportSchema = z.object({
  generatedAt: z.coerce.date(),
  invoiceNumber: z.string().nullable().optional(),
  noteNumber: z.string().nullable().optional(),
  noteType: z.string().nullable().optional(),
  operationType: z
    .enum([
      "FEV_RIPS",
      "NC_PARCIAL",
      "ND",
      "NOTA_AJUSTE_RIPS",
      "RIPS_SIN_FACTURA",
      "CAPITA_PERIODO",
      "CAPITA_FINAL",
    ])
    .default("FEV_RIPS"),
  organizationTaxId: z.string().nullable().optional(),
  payerId: nonEmptyStringSchema,
  periodFrom: z.coerce.date(),
  periodTo: z.coerce.date(),
  status: nonEmptyStringSchema.default("draft"),
});

const listRipsExportsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  payerId: z.string().min(1).optional(),
  sortBy: z.enum(["generatedAt"]).default("generatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().min(1).optional(),
});

const listResponseSchema = z.object({
  items: z.array(ripsExportSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createRipsExportProcedure = protectedProcedure
  .input(createRipsExportSchema)
  .output(ripsExportSchema)
  .handler(async ({ context, input }) => {
    const { periodFrom, periodTo } = normalizeRipsPeriodBounds(
      input.periodFrom,
      input.periodTo
    );

    const [created] = await context.db
      .insert(ripsExport)
      .values({
        ...input,
        periodFrom,
        periodTo,
        id: crypto.randomUUID(),
        payloadJson: null,
        validationResultJson: null,
        cuv: null,
        sentAt: null,
        muvResponseJson: null,
        numUsers: null,
        totalValue: null,
      })
      .returning();

    return created ?? throwCreateError("RIPS export");
  });

const listRipsExportsProcedure = protectedProcedure
  .input(listRipsExportsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.payerId ? eq(ripsExport.payerId, input.payerId) : undefined,
      input.status ? eq(ripsExport.status, input.status) : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc"
        ? asc(ripsExport.generatedAt)
        : desc(ripsExport.generatedAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(ripsExport)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(ripsExport).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const getRipsExportProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(ripsExportSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(ripsExport)
      .where(eq(ripsExport.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "RIPS export not found.",
      });
    }

    return found;
  });

const updateRipsExportSchema = z.object({
  id: nonEmptyStringSchema,
  invoiceNumber: z.string().nullable().optional(),
  noteNumber: z.string().nullable().optional(),
  noteType: z.string().nullable().optional(),
  operationType: createRipsExportSchema.shape.operationType.optional(),
  organizationTaxId: z.string().nullable().optional(),
  payerId: nonEmptyStringSchema.optional(),
  periodFrom: z.coerce.date().optional(),
  periodTo: z.coerce.date().optional(),
});

function exportGenerationInputsChanged(
  existing: typeof ripsExport.$inferSelect,
  next: {
    invoiceNumber: string | null;
    noteNumber: string | null;
    noteType: string | null;
    operationType: string;
    organizationTaxId: string | null;
    payerId: string;
    periodFrom: Date;
    periodTo: Date;
  }
): boolean {
  const existingPeriod = normalizeRipsPeriodBounds(
    new Date(existing.periodFrom),
    new Date(existing.periodTo)
  );
  const nextPeriod = normalizeRipsPeriodBounds(next.periodFrom, next.periodTo);

  return (
    existing.payerId !== next.payerId ||
    existing.operationType !== next.operationType ||
    (existing.organizationTaxId ?? null) !== next.organizationTaxId ||
    (existing.invoiceNumber ?? null) !== next.invoiceNumber ||
    (existing.noteType ?? null) !== next.noteType ||
    (existing.noteNumber ?? null) !== next.noteNumber ||
    existingPeriod.periodFrom.getTime() !== nextPeriod.periodFrom.getTime() ||
    existingPeriod.periodTo.getTime() !== nextPeriod.periodTo.getTime()
  );
}

const updateRipsExportProcedure = protectedProcedure
  .input(updateRipsExportSchema)
  .output(ripsExportSchema)
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(ripsExport)
      .where(eq(ripsExport.id, input.id))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "RIPS export not found." });
    }

    if (existing.status === "sent") {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "No se puede editar una exportación ya enviada. Cree una nueva exportación.",
      });
    }

    const periodFrom = input.periodFrom ?? new Date(existing.periodFrom);
    const periodTo = input.periodTo ?? new Date(existing.periodTo);
    const normalizedPeriod = normalizeRipsPeriodBounds(periodFrom, periodTo);

    const nextValues = {
      invoiceNumber:
        input.invoiceNumber === undefined
          ? existing.invoiceNumber
          : input.invoiceNumber,
      noteNumber:
        input.noteNumber === undefined ? existing.noteNumber : input.noteNumber,
      noteType:
        input.noteType === undefined ? existing.noteType : input.noteType,
      operationType: input.operationType ?? existing.operationType,
      organizationTaxId:
        input.organizationTaxId === undefined
          ? existing.organizationTaxId
          : input.organizationTaxId,
      payerId: input.payerId ?? existing.payerId,
      periodFrom: normalizedPeriod.periodFrom,
      periodTo: normalizedPeriod.periodTo,
    };

    const shouldInvalidatePayload = exportGenerationInputsChanged(
      existing,
      nextValues
    );

    if (shouldInvalidatePayload) {
      await context.db
        .delete(ripsExportEncounter)
        .where(eq(ripsExportEncounter.ripsExportId, existing.id));
    }

    const [updated] = await context.db
      .update(ripsExport)
      .set({
        ...nextValues,
        ...(shouldInvalidatePayload
          ? {
              cuv: null,
              muvResponseJson: null,
              numUsers: null,
              payloadJson: null,
              sentAt: null,
              status: "draft",
              totalValue: null,
              validationResultJson: null,
            }
          : {}),
      })
      .where(eq(ripsExport.id, input.id))
      .returning();

    return updated ?? throwCreateError("RIPS export update");
  });

const deleteRipsExportProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(ripsExport)
      .where(eq(ripsExport.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "RIPS export not found." });
    }
    await context.db.delete(ripsExport).where(eq(ripsExport.id, input.id));
    return true;
  });

const generatePayloadSchema = z.object({
  id: nonEmptyStringSchema,
});

const generatePayloadProcedure = protectedProcedure
  .input(generatePayloadSchema)
  .output(ripsExportSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(ripsExport)
      .where(eq(ripsExport.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", { message: "RIPS export not found." });
    }

    const [org] = await context.db
      .select({ taxId: organization.taxId, repsCode: organization.repsCode })
      .from(organization)
      .limit(1);

    const organizationTaxId =
      found.organizationTaxId ?? org?.taxId ?? org?.repsCode ?? "000000000";

    const { periodFrom, periodTo } = normalizeRipsPeriodBounds(
      new Date(found.periodFrom),
      new Date(found.periodTo)
    );

    let result: Awaited<ReturnType<typeof generateRipsPayload>>;
    try {
      result = await generateRipsPayload(context.db, {
        payerId: found.payerId,
        periodFrom,
        periodTo,
        organizationTaxId,
        invoiceNumber: found.invoiceNumber,
        noteType: found.noteType,
        noteNumber: found.noteNumber,
        operationType: found.operationType,
      });
    } catch (error) {
      if (error instanceof RipsGenerationError) {
        throw new ORPCError("BAD_REQUEST", {
          message: error.message,
          data: { issues: error.issues },
        });
      }
      throw error;
    }

    // Delete old encounter links
    await context.db
      .delete(ripsExportEncounter)
      .where(eq(ripsExportEncounter.ripsExportId, found.id));

    // Insert new encounter links with real patient IDs
    if (result.serviceLinks.length > 0) {
      const links = result.serviceLinks.map((link) => ({
        id: crypto.randomUUID(),
        ripsExportId: found.id,
        encounterId: link.encounterId,
        patientId: link.patientId,
        userConsecutive: link.userConsecutive,
        serviceType: link.serviceType,
        serviceConsecutive: link.serviceConsecutive,
        includedAt: new Date(),
      }));

      await context.db.insert(ripsExportEncounter).values(links);
    }

    const [updated] = await context.db
      .update(ripsExport)
      .set({
        payloadJson: result.transaction as unknown as Record<string, unknown>,
        validationResultJson: null,
        numUsers: result.numUsers,
        totalValue: result.totalValue,
        periodFrom,
        periodTo,
        status: "generated",
      })
      .where(eq(ripsExport.id, input.id))
      .returning();

    return updated ?? throwCreateError("RIPS export update");
  });

const validatePayloadSchema = z.object({
  id: nonEmptyStringSchema,
});

const validatePayloadProcedure = protectedProcedure
  .input(validatePayloadSchema)
  .output(
    z.object({
      export: ripsExportSchema,
      validation: z.object({
        passed: z.boolean(),
        rejections: z.array(z.record(z.string(), z.any())),
        notifications: z.array(z.record(z.string(), z.any())),
        checkedRules: z.array(z.string()),
      }),
    })
  )
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(ripsExport)
      .where(eq(ripsExport.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", { message: "RIPS export not found." });
    }

    if (!found.payloadJson) {
      throw new ORPCError("BAD_REQUEST", {
        message: "RIPS export has no generated payload. Call generate first.",
      });
    }

    const transaction =
      found.payloadJson as unknown as import("../services/rips-generator").RipsTransaction;
    const validation = await validateRipsPreflight(context.db, transaction);

    const status = validation.passed ? "ready" : "locally_invalid";

    const [updated] = await context.db
      .update(ripsExport)
      .set({
        validationResultJson: validation as unknown as Record<string, unknown>,
        status,
      })
      .where(eq(ripsExport.id, input.id))
      .returning();

    if (!updated) {
      throwCreateError("RIPS export validation update");
    }

    return {
      export: updated,
      validation: {
        passed: validation.passed,
        rejections: validation.rejections as unknown as Record<
          string,
          unknown
        >[],
        notifications: validation.notifications as unknown as Record<
          string,
          unknown
        >[],
        checkedRules: validation.checkedRules,
      },
    };
  });

export interface RipsExportsRouter extends Record<string, AnyRouter> {
  create: typeof createRipsExportProcedure;
  delete: typeof deleteRipsExportProcedure;
  generatePayload: typeof generatePayloadProcedure;
  get: typeof getRipsExportProcedure;
  list: typeof listRipsExportsProcedure;
  update: typeof updateRipsExportProcedure;
  validatePayload: typeof validatePayloadProcedure;
}

export const ripsExportsRouter: RipsExportsRouter = {
  create: createRipsExportProcedure,
  delete: deleteRipsExportProcedure,
  generatePayload: generatePayloadProcedure,
  get: getRipsExportProcedure,
  list: listRipsExportsProcedure,
  update: updateRipsExportProcedure,
  validatePayload: validatePayloadProcedure,
};
