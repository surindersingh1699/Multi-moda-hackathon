/**
 * Ingests curated interior design content into the Senso knowledge base.
 *
 * Usage:
 *   npx tsx scripts/ingest-design-content.ts
 *
 * Requires SENSO_API_KEY in .env.local
 */

import { DESIGN_CONTENT } from "./design-content";

const API = "https://sdk.senso.ai/api/v1";
const KEY = process.env.SENSO_API_KEY;

if (!KEY) {
  console.error("ERROR: SENSO_API_KEY is not set. Add it to .env.local");
  process.exit(1);
}

const headers = {
  "X-API-Key": KEY,
  "Content-Type": "application/json",
};

interface IngestResult {
  title: string;
  id?: string;
  status: "queued" | "completed" | "failed" | "timeout";
  error?: string;
}

async function ingestOne(entry: (typeof DESIGN_CONTENT)[number]): Promise<IngestResult> {
  const res = await fetch(`${API}/content/raw`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: entry.title,
      summary: entry.summary,
      text: entry.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { title: entry.title, status: "failed", error: `HTTP ${res.status}: ${body}` };
  }

  const data = await res.json();
  const contentId: string = data.id;
  console.log(`  Queued: ${entry.title} (id: ${contentId})`);

  // Poll for processing completion
  for (let attempt = 0; attempt < 30; attempt++) {
    await sleep(1000);
    const statusRes = await fetch(`${API}/content/${contentId}`, { headers });

    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.processing_status === "completed") {
        return { title: entry.title, id: contentId, status: "completed" };
      }
      if (statusData.processing_status === "failed") {
        return { title: entry.title, id: contentId, status: "failed", error: "Processing failed" };
      }
    }
  }

  return { title: entry.title, id: contentId, status: "timeout" };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\nIngesting ${DESIGN_CONTENT.length} content items into Senso...\n`);

  const results: IngestResult[] = [];

  for (const entry of DESIGN_CONTENT) {
    const result = await ingestOne(entry);
    results.push(result);

    const icon = result.status === "completed" ? "OK" : result.status === "timeout" ? "??" : "XX";
    console.log(`  [${icon}] ${result.title}`);

    await sleep(500);
  }

  console.log("\n--- Summary ---");
  const completed = results.filter((r) => r.status === "completed");
  const failed = results.filter((r) => r.status === "failed");
  const timedOut = results.filter((r) => r.status === "timeout");

  console.log(`Completed: ${completed.length}/${results.length}`);
  if (timedOut.length) console.log(`Timed out (may still be processing): ${timedOut.length}`);
  if (failed.length) {
    console.log(`Failed: ${failed.length}`);
    failed.forEach((f) => console.log(`  - ${f.title}: ${f.error}`));
  }

  console.log("\nContent IDs:");
  results
    .filter((r) => r.id)
    .forEach((r) => console.log(`  ${r.id}  ${r.title}`));

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
