import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { encounterParticipant } from "@wellfit-emr/db/schema/clinical";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const encounterParticipantSchema = z.object({
  encounterId: z.string(),
  endedAt: z.date().nullable(),
  id: z.string(),
  participantRole: z.string(),
  practitionerId: z.string(),
  startedAt: z.date(),
});

const createEncounterParticipantSchema = z.object({
  encounterId: nonEmptyStringSchema,
  endedAt: z.coerce.date().nullable().optional(),
  participantRole: nonEmptyStringSchema,
  practitionerId: nonEmptyStringSchema,
  startedAt: z.coerce.date(),
});

const listEncounterParticipantsSchema = z.object({
  encounterId: nonEmptyStringSchema,
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  sortDirection: z.enum(["asc", "desc"]).default("asc"),
});

const updateEncounterParticipantSchema = z.object({
  encounterId: nonEmptyStringSchema,
  endedAt: z.coerce.date().nullable().optional(),
  id: nonEmptyStringSchema,
  participantRole: nonEmptyStringSchema,
  practitionerId: nonEmptyStringSchema,
  startedAt: z.coerce.date(),
});

const deleteByIdSchema = z.object({
  id: nonEmptyStringSchema,
});

const listResponseSchema = z.object({
  items: z.array(encounterParticipantSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createEncounterParticipantProcedure = protectedProcedure
  .input(createEncounterParticipantSchema)
  .output(encounterParticipantSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(encounterParticipant)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("encounter participant");
  });

const listEncounterParticipantsProcedure = protectedProcedure
  .input(listEncounterParticipantsSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = eq(encounterParticipant.encounterId, input.encounterId);
    const orderBy =
      input.sortDirection === "asc"
        ? asc(encounterParticipant.startedAt)
        : desc(encounterParticipant.startedAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(encounterParticipant)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db
        .select({ value: count() })
        .from(encounterParticipant)
        .where(where),
    ]);

    return {
      items,
      limit: input.limit,
      offset: input.offset,
      total: totalRows.at(0)?.value ?? 0,
    };
  });

const updateEncounterParticipantProcedure = protectedProcedure
  .input(updateEncounterParticipantSchema)
  .output(encounterParticipantSchema)
  .handler(async ({ context, input }) => {
    const { id, ...values } = input;
    const [updated] = await context.db
      .update(encounterParticipant)
      .set(values)
      .where(eq(encounterParticipant.id, id))
      .returning();

    if (!updated) {
      throw new ORPCError("NOT_FOUND", {
        message: "Encounter participant not found.",
      });
    }

    return updated;
  });

const deleteEncounterParticipantProcedure = protectedProcedure
  .input(deleteByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(encounterParticipant)
      .where(eq(encounterParticipant.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Encounter participant not found.",
      });
    }
    await context.db
      .delete(encounterParticipant)
      .where(eq(encounterParticipant.id, input.id));
    return true;
  });

export interface EncounterParticipantsRouter extends Record<string, AnyRouter> {
  create: typeof createEncounterParticipantProcedure;
  delete: typeof deleteEncounterParticipantProcedure;
  list: typeof listEncounterParticipantsProcedure;
  update: typeof updateEncounterParticipantProcedure;
}

export const encounterParticipantsRouter: EncounterParticipantsRouter = {
  create: createEncounterParticipantProcedure,
  delete: deleteEncounterParticipantProcedure,
  list: listEncounterParticipantsProcedure,
  update: updateEncounterParticipantProcedure,
};
