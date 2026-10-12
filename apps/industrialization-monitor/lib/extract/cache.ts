// Disk cache of extraction results, keyed by (model, effort, prompt version, article text).
// Shared by the eval and the queue builders so an article is only paid for once per prompt.

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import type Anthropic from "@anthropic-ai/sdk";
import { EXTRACTION_EFFORT, EXTRACTION_MODEL, type ExtractionResult } from "./extract";

export const CACHE_DIR = "reports/extract-cache";

export type CacheEntry = {
  key: string;
  model: string;
  result: ExtractionResult | null;
  error: string | null;
  usage: Pick<Anthropic.Beta.BetaUsage, "input_tokens" | "output_tokens" | "cache_read_input_tokens" | "cache_creation_input_tokens">;
};

export const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

let promptVersion: string | null = null;
export async function getPromptVersion() {
  promptVersion ??= sha(await readFile("lib/extract/extract.ts", "utf8"));
  return promptVersion;
}

export async function cachePath(slug: string, text: string) {
  const key = sha([EXTRACTION_MODEL, EXTRACTION_EFFORT, await getPromptVersion(), text].join("|"));
  return { key, path: `${CACHE_DIR}/${slug}.${key}.json` };
}

export async function readCached(slug: string, text: string): Promise<CacheEntry | null> {
  const { path } = await cachePath(slug, text);
  try {
    return JSON.parse(await readFile(path, "utf8")) as CacheEntry;
  } catch {
    return null;
  }
}

export async function writeCached(slug: string, text: string, entry: Omit<CacheEntry, "key">) {
  const { key, path } = await cachePath(slug, text);
  await writeFile(path, JSON.stringify({ key, ...entry }, null, 2));
}
