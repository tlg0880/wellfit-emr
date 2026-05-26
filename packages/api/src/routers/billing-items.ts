import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { billingItem, payer } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);
const moneySchema = z.string().regex(/^\d+(\.\d{1,2})?$/, {
  message: "Use un valor decimal con máximo dos decimales",
});

const billingServiceTypeSchema = z.enum([
  "consulta",
  "procedimiento",
  "medicamento",
  "otro_servicio",
]);

const billingItemSchema = z.object({
  createdAt: z.date(),
  description: z.string().nullable(),
  encounterId: z.string(),
  id: z.string(),
  payerCode: z.string().nullable(),
  payerId: z.string(),
  payerName: z.string().nullable(),
  quantity: z.number(),
  serviceCode: z.string(),
  serviceId: z.string().nullable(),
  serviceType: billingServiceTypeSchema,
  totalValue: z.string(),
  unitValue: z.string(),
});

const createBillingItemSchema = z.object({
  description: z.string().min(1).nullable().optional(),
  encounterId: nonEmptyStringSchema,
  payerId: nonEmptyStringSchema,
  quantity: z.number().int().min(1).default(1),
  serviceCode: nonEmptyStringSchema,
  serviceId: z.string().min(1).nullable().optional(),
  serviceType: billingServiceTypeSchema,
  totalValue: moneySchema,
  unitValue: moneySchema,
});

const updateBillingItemSchema = createBillingItemSchema.extend({
  id: nonEmptyStringSchema,
});

const listBillingItemsSchema = z.object({
  encounterId: z.string().min(1).optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  payerId: z.string().min(1).optional(),
  serviceType: billingServiceTypeSchema.optional(),
});

const deleteBillingItemSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(billingItemSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

function mapBillingRow(row: {
  billingItem: typeof billingItem.$inferSelect;
  payerCode: string | null;
  payerName: string | null;
}) {
  return {
    ...row.billingItem,
    payerCode: row.payerCode,
    payerName: row.payerName,
    serviceType: billingServiceTypeSchema.parse(row.billingItem.serviceType),
  };
}

const createBillingItemProcedure = protectedProcedure
  .input(createBillingItemSchema)
  .output(billingItemSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(billingItem)
      .values({
        ...input,
        id: crypto.randomUUID(),
        description: input.description ?? null,
        serviceId: input.serviceId ?? null,
        createdAt: new Date(),
      })
      .returning();

    if (!created) {
      return throwCreateError("billing item");
    }

    const [found] = await context.db
      .select({
        billingItem,
        payerCode: payer.code,
        payerName: payer.name,
      })
      .from(billingItem)
      .leftJoin(payer, eq(billingItem.payerId, payer.id))
      .where(eq(billingItem.id, created.id))
      .limit(1);

    return found ? mapBillingRow(found) : throwCreateError("billing item");
  });

const updateBillingItemProcedure = protectedProcedure
  .input(updateBillingItemSchema)
  .output(billingItemSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(billingItem)
      .set({
        ...values,
        description: values.description ?? null,
        serviceId: values.serviceId ?? null,
      })
      .where(eq(billingItem.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Billing item not found.",
      });
    }

    const [found] = await context.db
      .select({
        billingItem,
        payerCode: payer.code,
        payerName: payer.name,
      })
      .from(billingItem)
      .leftJoin(payer, eq(billingItem.payerId, payer.id))
      .where(eq(billingItem.id, updated.id))
      .limit(1);

    return found ? mapBillingRow(found) : throwCreateError("billing item");
  });

const listBillingItemsProcedure = protectedProcedure
  .input(listBillingItemsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const filters = [
      input.encounterId
        ? eq(billingItem.encounterId, input.encounterId)
        : undefined,
      input.payerId ? eq(billingItem.payerId, input.payerId) : undefined,
      input.serviceType
        ? eq(billingItem.serviceType, input.serviceType)
        : undefined,
    ].filter((filter) => filter !== undefined);

    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, totalRows] = await Promise.all([
      context.db
        .select({
          billingItem,
          payerCode: payer.code,
          payerName: payer.name,
        })
        .from(billingItem)
        .leftJoin(payer, eq(billingItem.payerId, payer.id))
        .where(where)
        .orderBy(asc(billingItem.createdAt))
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(billingItem).where(where),
    ]);

    return {
      items: rows.map(mapBillingRow),
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const deleteBillingItemProcedure = protectedProcedure
  .input(deleteBillingItemSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(billingItem)
      .where(eq(billingItem.id, input.id))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Billing item not found.",
      });
    }

    await context.db.delete(billingItem).where(eq(billingItem.id, input.id));
    return true;
  });

export interface BillingItemsRouter extends Record<string, AnyRouter> {
  create: typeof createBillingItemProcedure;
  delete: typeof deleteBillingItemProcedure;
  list: typeof listBillingItemsProcedure;
  update: typeof updateBillingItemProcedure;
}

export const billingItemsRouter: BillingItemsRouter = {
  create: createBillingItemProcedure,
  delete: deleteBillingItemProcedure,
  list: listBillingItemsProcedure,
  update: updateBillingItemProcedure,
};
