import { Router } from "express";
import { parseFlyerImage } from "../services/flyer-parser";
import { ParseFlyerBody } from "@workspace/api-zod";

const router = Router();

// POST /events/parse-flyer
router.post("/events/parse-flyer", async (req, res) => {
  const parsed = ParseFlyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { imageData, isUrl = false } = parsed.data;

  try {
    const result = await parseFlyerImage(imageData, isUrl);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Flyer parsing failed");
    res.status(500).json({ error: "Flyer parsing failed" });
  }
});

export default router;
