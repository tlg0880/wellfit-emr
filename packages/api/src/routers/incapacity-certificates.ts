import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { incapacityCertificate } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);
const optionalNullableStringSchema = z.string().min(1).nullable().optional();

const incapacityCertificateSchema = z.object({
  conceptText: z.string(),
  destinationEntity: z.string().nullable(),
  encounterId: z.string(),
  endDate: z.date(),
  id: z.string(),
  issuedAt: z.date(),
  issuedBy: z.string(),
  patientId: z.string(),
  signedAt: z.date(),
  startDate: z.date(),
});

const createIncapacityCertificateSchema = z.object({
  conceptText: nonEmptyStringSchema,
  destinationEntity: optionalNullableStringSchema,
  encounterId: nonEmptyStringSchema,
  endDate: z.coerce.date(),
  issuedAt: z.coerce.date(),
  issuedBy: nonEmptyStringSchema,
  patientId: nonEmptyStringSchema,
  signedAt: z.coerce.date(),
  startDate: z.coerce.date(),
});

const listIncapacityCertificatesSchema = z.object({
  encounterId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: z.string().min(1).optional(),
  sortBy: z.enum(["issuedAt"]).default("issuedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

const listResponseSchema = z.object({
  items: z.array(incapacityCertificateSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createIncapacityCertificateProcedure = protectedProcedure
  .input(createIncapacityCertificateSchema)
  .output(incapacityCertificateSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(incapacityCertificate)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("incapacity certificate");
  });

const listIncapacityCertificatesProcedure = protectedProcedure
  .input(listIncapacityCertificatesSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.patientId
        ? eq(incapacityCertificate.patientId, input.patientId)
        : undefined,
      input.encounterId
        ? eq(incapacityCertificate.encounterId, input.encounterId)
        : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc"
        ? asc(incapacityCertificate.issuedAt)
        : desc(incapacityCertificate.issuedAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(incapacityCertificate)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db
        .select({ value: count() })
        .from(incapacityCertificate)
        .where(where),
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

const getIncapacityCertificateProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(incapacityCertificateSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(incapacityCertificate)
      .where(eq(incapacityCertificate.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Incapacity certificate not found.",
      });
    }

    return found;
  });

const deleteIncapacityCertificateProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(incapacityCertificate)
      .where(eq(incapacityCertificate.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Incapacity certificate not found.",
      });
    }
    await context.db
      .delete(incapacityCertificate)
      .where(eq(incapacityCertificate.id, input.id));
    return true;
  });

export interface IncapacityCertificatesRouter
  extends Record<string, AnyRouter> {
  create: typeof createIncapacityCertificateProcedure;
  delete: typeof deleteIncapacityCertificateProcedure;
  get: typeof getIncapacityCertificateProcedure;
  list: typeof listIncapacityCertificatesProcedure;
}

export const incapacityCertificatesRouter: IncapacityCertificatesRouter = {
  create: createIncapacityCertificateProcedure,
  delete: deleteIncapacityCertificateProcedure,
  get: getIncapacityCertificateProcedure,
  list: listIncapacityCertificatesProcedure,
};
