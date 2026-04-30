import type { AnyRouter } from "@orpc/server";
import { ORPCError } from "@orpc/server";
import { attachmentLink, binaryObject } from "@wellfit-emr/db/schema/clinical";
import { and, asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

const nonEmptyStringSchema = z.string().min(1);

const binaryObjectSchema = z.object({
  createdAt: z.date(),
  encryptedKeyRef: z.string(),
  hashSha256: z.string(),
  id: z.string(),
  mimeType: z.string(),
  retentionClass: z.string(),
  sizeBytes: z.number(),
  storageLocator: z.string(),
});

const createBinaryObjectSchema = z.object({
  encryptedKeyRef: nonEmptyStringSchema,
  hashSha256: nonEmptyStringSchema,
  mimeType: nonEmptyStringSchema,
  retentionClass: nonEmptyStringSchema,
  sizeBytes: z.number().int(),
  storageLocator: nonEmptyStringSchema,
});

const attachmentLinkSchema = z.object({
  binaryId: z.string(),
  capturedAt: z.date(),
  classification: z.string(),
  id: z.string(),
  linkedEntityId: z.string(),
  linkedEntityType: z.string(),
  title: z.string(),
});

const createAttachmentLinkSchema = z.object({
  binaryId: nonEmptyStringSchema,
  capturedAt: z.coerce.date(),
  classification: nonEmptyStringSchema,
  linkedEntityId: nonEmptyStringSchema,
  linkedEntityType: nonEmptyStringSchema,
  title: nonEmptyStringSchema,
});

const listAttachmentLinksSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  linkedEntityId: nonEmptyStringSchema,
  linkedEntityType: nonEmptyStringSchema,
  offset: z.number().int().min(0).default(0),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

const listResponseSchema = z.object({
  items: z.array(attachmentLinkSchema),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
});

function throwCreateError(recordName: string): never {
  throw new ORPCError("INTERNAL_SERVER_ERROR", {
    message: `Failed to create ${recordName}.`,
  });
}

const createBinaryObjectProcedure = protectedProcedure
  .input(createBinaryObjectSchema)
  .output(binaryObjectSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(binaryObject)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("binary object");
  });

const createAttachmentLinkProcedure = protectedProcedure
  .input(createAttachmentLinkSchema)
  .output(attachmentLinkSchema)
  .handler(async ({ context, input }) => {
    const [created] = await context.db
      .insert(attachmentLink)
      .values({
        ...input,
        id: crypto.randomUUID(),
      })
      .returning();

    return created ?? throwCreateError("attachment link");
  });

const listAttachmentLinksProcedure = protectedProcedure
  .input(listAttachmentLinksSchema)
  .output(listResponseSchema)
  .handler(async ({ context, input }) => {
    const where = and(
      eq(attachmentLink.linkedEntityType, input.linkedEntityType),
      eq(attachmentLink.linkedEntityId, input.linkedEntityId)
    );
    const orderBy =
      input.sortDirection === "asc"
        ? asc(attachmentLink.capturedAt)
        : desc(attachmentLink.capturedAt);

    const [items, totalRows] = await Promise.all([
      context.db
        .select()
        .from(attachmentLink)
        .where(where)
        .orderBy(orderBy)
        .limit(input.limit)
        .offset(input.offset),
      context.db.select({ value: count() }).from(attachmentLink).where(where),
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

const getBinaryObjectProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(binaryObjectSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(binaryObject)
      .where(eq(binaryObject.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Binary object not found.",
      });
    }

    return found;
  });

const getAttachmentLinkProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(attachmentLinkSchema)
  .handler(async ({ context, input }) => {
    const [found] = await context.db
      .select()
      .from(attachmentLink)
      .where(eq(attachmentLink.id, input.id))
      .limit(1);

    if (!found) {
      throw new ORPCError("NOT_FOUND", {
        message: "Attachment link not found.",
      });
    }

    return found;
  });

const deleteBinaryObjectProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(binaryObject)
      .where(eq(binaryObject.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Binary object not found." });
    }
    await context.db.delete(binaryObject).where(eq(binaryObject.id, input.id));
    return true;
  });

const deleteAttachmentLinkProcedure = protectedProcedure
  .input(getByIdSchema)
  .output(z.boolean())
  .handler(async ({ context, input }) => {
    const [existing] = await context.db
      .select()
      .from(attachmentLink)
      .where(eq(attachmentLink.id, input.id))
      .limit(1);
    if (!existing) {
      throw new ORPCError("NOT_FOUND", {
        message: "Attachment link not found.",
      });
    }
    await context.db
      .delete(attachmentLink)
      .where(eq(attachmentLink.id, input.id));
    return true;
  });

export interface AttachmentsRouter extends Record<string, AnyRouter> {
  createBinaryObject: typeof createBinaryObjectProcedure;
  createLink: typeof createAttachmentLinkProcedure;
  deleteBinaryObject: typeof deleteBinaryObjectProcedure;
  deleteLink: typeof deleteAttachmentLinkProcedure;
  getBinaryObject: typeof getBinaryObjectProcedure;
  getLink: typeof getAttachmentLinkProcedure;
  listLinks: typeof listAttachmentLinksProcedure;
}

export const attachmentsRouter: AttachmentsRouter = {
  createBinaryObject: createBinaryObjectProcedure,
  createLink: createAttachmentLinkProcedure,
  deleteBinaryObject: deleteBinaryObjectProcedure,
  deleteLink: deleteAttachmentLinkProcedure,
  getBinaryObject: getBinaryObjectProcedure,
  getLink: getAttachmentLinkProcedure,
  listLinks: listAttachmentLinksProcedure,
};
