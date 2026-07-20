import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, eventSourcesTable } from "@workspace/db";
import {
  CreateSourceBody,
  UpdateSourceParams,
  UpdateSourceBody,
  DeleteSourceParams,
} from "@workspace/api-zod";

const router = Router();

// GET /sources
router.get("/sources", async (req, res) => {
  const sources = await db.select().from(eventSourcesTable).orderBy(eventSourcesTable.createdAt);
  res.json(sources);
});

// POST /sources
router.post("/sources", async (req, res) => {
  const parsed = CreateSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const [source] = await db
    .insert(eventSourcesTable)
    .values({
      ...parsed.data,
      active: parsed.data.active ?? true,
    })
    .returning();

  res.status(201).json(source);
});

// PATCH /sources/:id
router.patch("/sources/:id", async (req, res) => {
  const idParsed = UpdateSourceParams.safeParse({ id: Number(req.params["id"]) });
  if (!idParsed.success) {
    res.status(400).json({ error: "Invalid source id" });
    return;
  }

  const bodyParsed = UpdateSourceBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const [updated] = await db
    .update(eventSourcesTable)
    .set(bodyParsed.data)
    .where(eq(eventSourcesTable.id, idParsed.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Source not found" });
    return;
  }

  res.json(updated);
});

// DELETE /sources/:id
router.delete("/sources/:id", async (req, res) => {
  const parsed = DeleteSourceParams.safeParse({ id: Number(req.params["id"]) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid source id" });
    return;
  }

  await db.delete(eventSourcesTable).where(eq(eventSourcesTable.id, parsed.data.id));
  res.status(204).send();
});

export default router;
