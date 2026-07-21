/**
 * Daily automatic scan of active discovery sources.
 * Runs once shortly after startup (if a source is overdue) and then
 * every 24 hours. Sources are checked one at a time with a polite delay.
 */

import { db, eventSourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { checkSource } from "../services/source-scraper";
import { logger } from "./logger";

const SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000; // every 24h
const STARTUP_DELAY_MS = 5 * 60 * 1000; // wait 5 min after boot
const BETWEEN_SOURCES_MS = 10_000; // 10s between sources

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function scanActiveSources(): Promise<void> {
  const sources = await db
    .select()
    .from(eventSourcesTable)
    .where(eq(eventSourcesTable.active, true));

  const scannable = sources.filter(
    (s) => s.url && s.type !== "instagram" && s.type !== "facebook" && s.type !== "manual",
  );

  logger.info({ count: scannable.length }, "Auto-scan: checking active discovery sources");

  for (const source of scannable) {
    // Skip sources checked within the last 20 hours (e.g. manually)
    if (source.lastCheckedAt && Date.now() - new Date(source.lastCheckedAt).getTime() < 20 * 60 * 60 * 1000) {
      continue;
    }
    try {
      const result = await checkSource(source);
      logger.info({ sourceId: source.id, ...result }, "Auto-scan: source checked");
    } catch (err) {
      logger.error({ err, sourceId: source.id }, "Auto-scan: source check failed");
    }
    await sleep(BETWEEN_SOURCES_MS);
  }
}

export function startSourceScanScheduler(): void {
  setTimeout(() => {
    scanActiveSources().catch((err) => logger.error({ err }, "Auto-scan failed"));
    setInterval(
      () => scanActiveSources().catch((err) => logger.error({ err }, "Auto-scan failed")),
      SCAN_INTERVAL_MS,
    ).unref();
  }, STARTUP_DELAY_MS).unref();
}
