import type { AniProvider, AniProviderEvent, AniSessionContext, AniToolResult } from './types';

export const ANI_LIVE_MODEL = 'gemini-3.8-live';

/**
 * Production boundary for Gemini Live.
 *
 * The current AniWhere deployment is static and intentionally has no trusted
 * token-minting endpoint. This provider therefore fails closed until a backend
 * supplies a short-lived, constrained ephemeral token. Never add GEMINI_API_KEY
 * to browser code or a PUBLIC_ environment variable.
 */
export class GeminiLiveAniProvider implements AniProvider {
  readonly kind = 'gemini-live' as const;
  private listeners = new Set<(event: AniProviderEvent) => void>();

  async connect(_context: AniSessionContext): Promise<void> {
    this.emit({ type: 'status', status: 'offline' });
    throw new Error('Ani Live is not configured: secure ephemeral-token provisioning is required.');
  }

  async sendText(_text: string): Promise<void> {
    throw new Error('Ani Live is unavailable until a secure session is established.');
  }

  async startListening(): Promise<void> {
    throw new Error('Ani Live is unavailable until a secure session is established.');
  }

  async stopListening(): Promise<void> {}

  async submitToolResult(_result: AniToolResult): Promise<void> {
    throw new Error('Ani Live is unavailable until a secure session is established.');
  }

  subscribe(listener: (event: AniProviderEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close(): Promise<void> {
    this.emit({ type: 'status', status: 'idle' });
  }

  private emit(event: AniProviderEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
