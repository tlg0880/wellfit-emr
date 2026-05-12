import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { coverage } from "@wellfit-emr/db/schema/clinical";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);
const optionalNullableStringSchema = z.string().min(1).nullable().optional();
const optionalDateSchema = z.coerce.date().nullable().optional();

const coverageSchema = z.object({
  affiliateType: z.string(),
  coveragePlanCode: z.string().nullable(),
  effectiveFrom: z.date(),
  effectiveTo: z.date().nullable(),
  id: z.string(),
  patientId: z.string(),
  payerId: z.string(),
  policyNumber: z.string().nullable(),
});

const createCoverageSchema = z.object({
  affiliateType: nonEmptyStringSchema,
  coveragePlanCode: optionalNullableStringSchema,
  effectiveFrom: z.coerce.date(),
  effectiveTo: optionalDateSchema,
  patientId: nonEmptyStringSchema,
  payerId: nonEmptyStringSchema,
  policyNumber: optionalNullableStringSchema,
});

const listCoverageSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: nonEmptyStringSchema,
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updateCoverageSchema = z.object({
  affiliateType: nonEmptyStringSchema,
  coveragePlanCode: optionalNullableStringSchema,
  effectiveFrom: z.coerce.date(),
  effectiveTo: optionalDateSchema,
  id: nonEmptyStringSchema,
  payerId: nonEmptyStringSchema,
  policyNumber: optionalNullableStringSchema,
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(coverageSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createCoverageProcedure = protectedProcedure
  .input(createCoverageSchema)
  .output(coverageSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(coverage)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("coverage");
  });

const getCoverageProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(coverageSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(coverage)
      .where(eq(coverage.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Coverage not found.",
      });
    }

    return found;
  });

const listCoverageProcedure = protectedProcedure
  .input(listCoverageSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = eq(coverage.patientId, input.patientId);
    const orderBy =
      input.sortDirection === "asc"
        ? asc(coverage.effectiveFrom)
        : desc(coverage.effectiveFrom);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(coverage)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(coverage).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updateCoverageProcedure = protectedProcedure
  .input(updateCoverageSchema)
  .output(coverageSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(coverage)
      .set(values)
      .where(eq(coverage.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Coverage not found.",
      });
    }

    return updated;
  });

const deleteCoverageProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(coverage)
      .where(eq(coverage.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Coverage not found.",
      });
    }
    await context.db.delete(coverage).where(eq(coverage.id, input.id));
    return true;
  });

export interface CoverageRouter extends Record<string, AnyRouter> {
  create: typeof createCoverageProcedure;
  delete: typeof deleteCoverageProcedure;
  get: typeof getCoverageProcedure;
  list: typeof listCoverageProcedure;
  update: typeof updateCoverageProcedure;
}

export const coverageRouter: CoverageRouter = {
  create: createCoverageProcedure,
  delete: deleteCoverageProcedure,
  get: getCoverageProcedure,
  list: listCoverageProcedure,
  update: updateCoverageProcedure,
};
