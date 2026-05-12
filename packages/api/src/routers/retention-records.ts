import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { retentionRecord } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const retentionRecordSchema = z.object({
  disposalEligibilityDate: z.date(),
  entityId: z.string(),
  entityType: z.string(),
  id: z.string(),
  legalHoldFlag: z.boolean(),
  retentionClass: z.string(),
  triggerDate: z.date(),
});

const createRetentionRecordSchema = z.object({
  disposalEligibilityDate: z.coerce.date(),
  entityId: nonEmptyStringSchema,
  entityType: nonEmptyStringSchema,
  legalHoldFlag: z.boolean().default(false),
  retentionClass: nonEmptyStringSchema,
  triggerDate: z.coerce.date(),
});

const listRetentionRecordsSchema = z.object({
  entityId: z.string().min(1).optional(),
  entityType: z.string().min(1).optional(),
  legalHoldFlag: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updateRetentionRecordSchema = z.object({
  disposalEligibilityDate: z.coerce.date(),
  entityId: nonEmptyStringSchema,
  entityType: nonEmptyStringSchema,
  id: nonEmptyStringSchema,
  legalHoldFlag: z.boolean(),
  retentionClass: nonEmptyStringSchema,
  triggerDate: z.coerce.date(),
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(retentionRecordSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createRetentionRecordProcedure = protectedProcedure
  .input(createRetentionRecordSchema)
  .output(retentionRecordSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(retentionRecord)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("retention record");
  });

const getRetentionRecordProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(retentionRecordSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(retentionRecord)
      .where(eq(retentionRecord.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Retention record not found.",
      });
    }

    return found;
  });

const listRetentionRecordsProcedure = protectedProcedure
  .input(listRetentionRecordsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.entityType
        ? eq(retentionRecord.entityType, input.entityType)
        : undefined,
      input.entityId ? eq(retentionRecord.entityId, input.entityId) : undefined,
      input.legalHoldFlag === undefined
        ? undefined
        : eq(retentionRecord.legalHoldFlag, input.legalHoldFlag),
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc"
        ? asc(retentionRecord.triggerDate)
        : desc(retentionRecord.triggerDate);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(retentionRecord)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(retentionRecord).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updateRetentionRecordProcedure = protectedProcedure
  .input(updateRetentionRecordSchema)
  .output(retentionRecordSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(retentionRecord)
      .set(values)
      .where(eq(retentionRecord.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Retention record not found.",
      });
    }

    return updated;
  });

const deleteRetentionRecordProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(retentionRecord)
      .where(eq(retentionRecord.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Retention record not found.",
      });
    }
    await context.db
      .delete(retentionRecord)
      .where(eq(retentionRecord.id, input.id));
    return true;
  });

export interface RetentionRecordsRouter extends Record<string, AnyRouter> {
  create: typeof createRetentionRecordProcedure;
  delete: typeof deleteRetentionRecordProcedure;
  get: typeof getRetentionRecordProcedure;
  list: typeof listRetentionRecordsProcedure;
  update: typeof updateRetentionRecordProcedure;
}

export const retentionRecordsRouter: RetentionRecordsRouter = {
  create: createRetentionRecordProcedure,
  delete: deleteRetentionRecordProcedure,
  get: getRetentionRecordProcedure,
  list: listRetentionRecordsProcedure,
  update: updateRetentionRecordProcedure,
};
