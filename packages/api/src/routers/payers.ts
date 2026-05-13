import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { payer } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const payerSchema = z.object({
  code: z.string(),
  id: z.string(),
  name: z.string(),
  payerType: z.string(),
  status: z.string(),
});

const createPayerSchema = z.object({
  code: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  payerType: nonEmptyStringSchema,
  status: nonEmptyStringSchema.default("active"),
});

const listPayersSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  search: z.string().min(1).optional(),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
  status: z.string().min(1).optional(),
});

const updatePayerSchema = z.object({
  code: nonEmptyStringSchema,
  id: nonEmptyStringSchema,
  name: nonEmptyStringSchema,
  payerType: nonEmptyStringSchema,
  status: nonEmptyStringSchema,
});

const getByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(payerSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createPayerProcedure = protectedProcedure
  .input(createPayerSchema)
  .output(payerSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(payer)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("payer");
  });

const getPayerProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(payerSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(payer)
      .where(eq(payer.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Payer not found.",
      });
    }

    return found;
  });

const listPayersProcedure = protectedProcedure
  .input(listPayersSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.status ? eq(payer.status, input.status) : undefined,
      input.search
        ? or(
            like(payer.name, `%${input.search}%`),
            like(payer.code, `%${input.search}%`),
            like(payer.payerType, `%${input.search}%`)
          )
        : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;
    const orderBy =
      input.sortDirection === "asc" ? asc(payer.name) : desc(payer.name);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(payer)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(payer).where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updatePayerProcedure = protectedProcedure
  .input(updatePayerSchema)
  .output(payerSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(payer)
      .set(values)
      .where(eq(payer.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Payer not found.",
      });
    }

    return updated;
  });

const deletePayerProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(payer)
      .where(eq(payer.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Payer not found.",
      });
    }
    await context.db.delete(payer).where(eq(payer.id, input.id));
    return true;
  });

export interface PayersRouter extends Record<string, AnyRouter> {
  create: typeof createPayerProcedure;
  delete: typeof deletePayerProcedure;
  get: typeof getPayerProcedure;
  list: typeof listPayersProcedure;
  update: typeof updatePayerProcedure;
}

export const payersRouter: PayersRouter = {
  create: createPayerProcedure,
  delete: deletePayerProcedure,
  get: getPayerProcedure,
  list: listPayersProcedure,
  update: updatePayerProcedure,
};
