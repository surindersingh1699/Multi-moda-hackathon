const SENSO_API_URL = "https://sdk.senso.ai/api/v1";

function getApiKey(): string {
  const key = process.env.SENSO_API_KEY;
  if (!key) throw new Error("SENSO_API_KEY is not set");
  return key;
}

function headers(): Record<string, string> {
  return {
    "X-API-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface SensoContentResponse {
  id: string;
  type: string;
  title: string;
  processing_status: string;
  created_at: string;
}

export interface SensoSearchResult {
  query: string;
  answer: string;
  results: {
    content_id: string;
    chunk_text: string;
    score: number;
    title: string;
  }[];
  total_results: number;
  processing_time_ms: number;
}

export interface SensoGenerateResult {
  generated_text: string;
  sources: {
    content_id: string;
    chunk_text: string;
    score: number;
    title: string;
  }[];
  processing_time_ms: number;
  content_id?: string;
}

export async function ingestContent(data: {
  title: string;
  summary: string;
  text: string;
}): Promise<SensoContentResponse> {
  const res = await fetch(`${SENSO_API_URL}/content/raw`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Senso ingest failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function waitForProcessing(
  contentId: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${SENSO_API_URL}/content/${contentId}`, {
      headers: headers(),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.processing_status === "completed") return true;
      if (data.processing_status === "failed") return false;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }
  return false;
}

export async function searchContent(
  query: string,
  maxResults = 5
): Promise<SensoSearchResult> {
  const res = await fetch(`${SENSO_API_URL}/search`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ query, max_results: maxResults }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Senso search failed (${res.status}): ${body}`);
  }

  return res.json();
}

export async function generateContent(data: {
  content_type: string;
  instructions: string;
  save?: boolean;
  max_results?: number;
}): Promise<SensoGenerateResult> {
  const res = await fetch(`${SENSO_API_URL}/generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Senso generate failed (${res.status}): ${body}`);
  }

  return res.json();
}
