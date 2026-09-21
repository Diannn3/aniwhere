import type { AniMessage, AniProvider, AniProviderEvent, AniSessionContext } from './types';

export class MockAniProvider implements AniProvider {
  readonly kind = 'mock' as const;
  private listeners = new Set<(event: AniProviderEvent) => void>();
  private context?: AniSessionContext;

  async connect(context: AniSessionContext) {
    this.context = context;
    this.emit({ type: 'status', status: 'ready' });
  }

  async sendText(text: string) {
    this.emit({ type: 'status', status: 'working' });
    const isFil = this.context?.language === 'fil';
    const message: AniMessage = {
      id: `mock-${Date.now()}`,
      role: 'ani',
      text: isFil
        ? 'Demo assistant lang ito sa development. Gagamitin ng live Ani ang AniWhere tools para sa market facts.'
        : 'This is the development assistant only. Live Ani will use AniWhere tools for market facts.',
      createdAt: Date.now(),
    };
    this.emit({ type: 'message', message });
    this.emit({ type: 'status', status: 'ready' });
    void text;
  }

  subscribe(listener: (event: AniProviderEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close() {
    this.emit({ type: 'status', status: 'idle' });
    this.listeners.clear();
  }

  private emit(event: AniProviderEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
