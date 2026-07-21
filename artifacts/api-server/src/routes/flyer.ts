import { Router } from "express";
import { parseFlyerImage } from "../services/flyer-parser";
import { ParseFlyerBody } from "@workspace/api-zod";
import {
  flyerParseRateLimit,
  consumeDailyAiQuota,
  secondsUntilDailyReset,
} from "../middleware/rate-limit";

const router = Router();

// POST /events/parse-flyer
router.post("/events/parse-flyer", flyerParseRateLimit, async (req, res) => {
  const parsed = ParseFlyerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { imageData, isUrl = false } = parsed.data;

  // Only valid requests consume the global daily AI budget
  if (!consumeDailyAiQuota()) {
    res.setHeader("Retry-After", String(secondsUntilDailyReset()));
    res.status(429).json({
      error:
        "The flyer scanner has reached its daily limit. Please fill in the event details manually, or try again tomorrow.",
    });
    return;
  }

  try {
    const result = await parseFlyerImage(imageData, isUrl);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Flyer parsing failed");
    res.status(500).json({ error: "Flyer parsing failed" });
  }
});

export default router;
