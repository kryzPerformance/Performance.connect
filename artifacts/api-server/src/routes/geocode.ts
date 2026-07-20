import { Router } from "express";
import { geocodingService } from "../services/geocoding";
import { GeocodeAddressBody } from "@workspace/api-zod";

const router = Router();

// POST /geocode
router.post("/geocode", async (req, res) => {
  const parsed = GeocodeAddressBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const result = await geocodingService.geocode(parsed.data);
  res.json(result);
});

export default router;
