import Anthropic from '@anthropic-ai/sdk';
import { isMockMode } from '@/lib/utils';

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const MODEL = 'claude-opus-4-6';
export const PROMPT_VERSION = 'critique-v1';

export function inMockMode(): boolean {
  return isMockMode();
}
