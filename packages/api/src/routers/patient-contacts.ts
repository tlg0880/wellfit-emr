import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { patientContact } from "@wellfit-emr/db/schema/clinical";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);
const optionalNullableStringSchema = z.string().min(1).nullable().optional();

const patientContactSchema = z.object({
  address: z.string().nullable(),
  contactType: z.string(),
  email: z.string().nullable(),
  fullName: z.string().nullable(),
  id: z.string(),
  isPrimary: z.boolean(),
  patientId: z.string(),
  phone: z.string().nullable(),
  relationshipCode: z.string().nullable(),
});

const createPatientContactSchema = z.object({
  address: optionalNullableStringSchema,
  contactType: nonEmptyStringSchema,
  email: optionalNullableStringSchema,
  fullName: optionalNullableStringSchema,
  isPrimary: z.boolean().default(false),
  patientId: nonEmptyStringSchema,
  phone: optionalNullableStringSchema,
  relationshipCode: optionalNullableStringSchema,
});

const listPatientContactsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  patientId: nonEmptyStringSchema,
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updatePatientContactSchema = z.object({
  address: optionalNullableStringSchema,
  contactType: nonEmptyStringSchema,
  email: optionalNullableStringSchema,
  fullName: optionalNullableStringSchema,
  id: nonEmptyStringSchema,
  isPrimary: z.boolean(),
  phone: optionalNullableStringSchema,
  relationshipCode: optionalNullableStringSchema,
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(patientContactSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createPatientContactProcedure = protectedProcedure
  .input(createPatientContactSchema)
  .output(patientContactSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(patientContact)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("patient contact");
  });

const getPatientContactProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(patientContactSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(patientContact)
      .where(eq(patientContact.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient contact not found.",
      });
    }

    return found;
  });

const listPatientContactsProcedure = protectedProcedure
  .input(listPatientContactsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = eq(patientContact.patientId, input.patientId);
    const orderBy =
      input.sortDirection === "asc"
        ? asc(patientContact.contactType)
        : desc(patientContact.contactType);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(patientContact)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(patientContact).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updatePatientContactProcedure = protectedProcedure
  .input(updatePatientContactSchema)
  .output(patientContactSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(patientContact)
      .set(values)
      .where(eq(patientContact.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient contact not found.",
      });
    }

    return updated;
  });

const deletePatientContactProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(patientContact)
      .where(eq(patientContact.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Patient contact not found.",
      });
    }
    await context.db
      .delete(patientContact)
      .where(eq(patientContact.id, input.id));
    return true;
  });

export interface PatientContactsRouter extends Record<string, AnyRouter> {
  create: typeof createPatientContactProcedure;
  delete: typeof deletePatientContactProcedure;
  get: typeof getPatientContactProcedure;
  list: typeof listPatientContactsProcedure;
  update: typeof updatePatientContactProcedure;
}

export const patientContactsRouter: PatientContactsRouter = {
  get: getPatientContactProcedure,
  create: createPatientContactProcedure,
  delete: deletePatientContactProcedure,
  list: listPatientContactsProcedure,
  update: updatePatientContactProcedure,
};
