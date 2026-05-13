import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { patientIdentifier } from "@wellfit-emr/db/schema/clinical";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const patientIdentifierSchema = z.object({
  createdAt: z.date(),
  id: z.string(),
  identifierSystem: z.string(),
  identifierType: z.string(),
  identifierValue: z.string(),
  isCurrent: z.boolean(),
  patientId: z.string(),
});

const createPatientIdentifierSchema = z.object({
  identifierSystem: nonEmptyStringSchema,
  identifierType: nonEmptyStringSchema,
  identifierValue: nonEmptyStringSchema,
  isCurrent: z.boolean().default(true),
  patientId: nonEmptyStringSchema,
});

const listPatientIdentifiersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: nonEmptyStringSchema,
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updatePatientIdentifierSchema = z.object({
  id: nonEmptyStringSchema,
  identifierSystem: nonEmptyStringSchema,
  identifierType: nonEmptyStringSchema,
  identifierValue: nonEmptyStringSchema,
  isCurrent: z.boolean(),
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(patientIdentifierSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createPatientIdentifierProcedure = protectedProcedure
  .input(createPatientIdentifierSchema)
  .output(patientIdentifierSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(patientIdentifier)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("patient identifier");
  });

const getPatientIdentifierProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(patientIdentifierSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(patientIdentifier)
      .where(eq(patientIdentifier.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient identifier not found.",
      });
    }

    return found;
  });

const listPatientIdentifiersProcedure = protectedProcedure
  .input(listPatientIdentifiersSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = eq(patientIdentifier.patientId, input.patientId);
    const orderBy =
      input.sortDirection === "asc"
        ? asc(patientIdentifier.createdAt)
        : desc(patientIdentifier.createdAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(patientIdentifier)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db
        .select({ value: count() })
        .from(patientIdentifier)
        .where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updatePatientIdentifierProcedure = protectedProcedure
  .input(updatePatientIdentifierSchema)
  .output(patientIdentifierSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(patientIdentifier)
      .set(values)
      .where(eq(patientIdentifier.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient identifier not found.",
      });
    }

    return updated;
  });

const deletePatientIdentifierProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(patientIdentifier)
      .where(eq(patientIdentifier.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient identifier not found.",
      });
    }
    await context.db
      .delete(patientIdentifier)
      .where(eq(patientIdentifier.id, input.id));
    return true;
  });

export interface PatientIdentifiersRouter extends Record<string, AnyRouter> {
  create: typeof createPatientIdentifierProcedure;
  delete: typeof deletePatientIdentifierProcedure;
  get: typeof getPatientIdentifierProcedure;
  list: typeof listPatientIdentifiersProcedure;
  update: typeof updatePatientIdentifierProcedure;
}

export const patientIdentifiersRouter: PatientIdentifiersRouter = {
  create: createPatientIdentifierProcedure,
  delete: deletePatientIdentifierProcedure,
  get: getPatientIdentifierProcedure,
  list: listPatientIdentifiersProcedure,
  update: updatePatientIdentifierProcedure,
};
