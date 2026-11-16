// Doar pe server (rute API). Nu importați din componente client.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-5-5";

/** Timeout-ul impus de CLAUDE.md: după 5 s trecem pe fallback ca demo-ul să nu se blocheze. */
export const AI_TIMEOUT_MS = 5_000;

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  // maxRetries: 0 — un retry ar depăși bugetul de 5 secunde.
  client ??= new Anthropic({ timeout: AI_TIMEOUT_MS, maxRetries: 0 });
  return client;
}
