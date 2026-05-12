import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { practitionerRole } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const practitionerRoleSchema = z.object({
  endAt: z.date().nullable(),
  id: z.string(),
  organizationId: z.string(),
  practitionerId: z.string(),
  roleCode: z.string(),
  siteId: z.string().nullable(),
  startAt: z.date(),
});

const createPractitionerRoleSchema = z.object({
  endAt: z.coerce.date().nullable().optional(),
  organizationId: nonEmptyStringSchema,
  practitionerId: nonEmptyStringSchema,
  roleCode: nonEmptyStringSchema,
  siteId: z.string().min(1).nullable().optional(),
  startAt: z.coerce.date(),
});

const listPractitionerRolesSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  practitionerId: z.string().min(1).optional(),
  roleCode: z.string().min(1).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updatePractitionerRoleSchema = z.object({
  endAt: z.coerce.date().nullable().optional(),
  id: nonEmptyStringSchema,
  organizationId: nonEmptyStringSchema,
  practitionerId: nonEmptyStringSchema,
  roleCode: nonEmptyStringSchema,
  siteId: z.string().min(1).nullable().optional(),
  startAt: z.coerce.date(),
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(practitionerRoleSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createPractitionerRoleProcedure = protectedProcedure
  .input(createPractitionerRoleSchema)
  .output(practitionerRoleSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(practitionerRole)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("practitioner role");
  });

const listPractitionerRolesProcedure = protectedProcedure
  .input(listPractitionerRolesSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.practitionerId
        ? eq(practitionerRole.practitionerId, input.practitionerId)
        : undefined,
      input.roleCode
        ? eq(practitionerRole.roleCode, input.roleCode)
        : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc"
        ? asc(practitionerRole.startAt)
        : desc(practitionerRole.startAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(practitionerRole)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(practitionerRole).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updatePractitionerRoleProcedure = protectedProcedure
  .input(updatePractitionerRoleSchema)
  .output(practitionerRoleSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(practitionerRole)
      .set(values)
      .where(eq(practitionerRole.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Practitioner role not found.",
      });
    }

    return updated;
  });

const deletePractitionerRoleProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(practitionerRole)
      .where(eq(practitionerRole.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Practitioner role not found.",
      });
    }
    await context.db
      .delete(practitionerRole)
      .where(eq(practitionerRole.id, input.id));
    return true;
  });

export interface PractitionerRolesRouter extends Record<string, AnyRouter> {
  create: typeof createPractitionerRoleProcedure;
  delete: typeof deletePractitionerRoleProcedure;
  list: typeof listPractitionerRolesProcedure;
  update: typeof updatePractitionerRoleProcedure;
}

export const practitionerRolesRouter: PractitionerRolesRouter = {
  create: createPractitionerRoleProcedure,
  delete: deletePractitionerRoleProcedure,
  list: listPractitionerRolesProcedure,
  update: updatePractitionerRoleProcedure,
};
