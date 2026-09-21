import type { AniMessage, AniOutletFacts, AniProvider, AniProviderEvent, AniSessionContext, AniToolResult } from './types';

export class MockAniProvider implements AniProvider {
  readonly kind = 'mock' as const;
  private listeners = new Set<(event: AniProviderEvent) => void>();
  private context?: AniSessionContext;

  async connect(context: AniSessionContext) {
    this.context = context;
    this.emit({ type: 'status', status: 'ready' });
  }

  async sendText(_text: string) {
    this.emit({ type: 'status', status: 'working' });
    this.emit({
      type: 'tool_request',
      toolRequest: { id: `mock-tool-${Date.now()}`, name: 'find_outlets', args: {} },
    });
  }

  async submitToolResult(result: AniToolResult) {
    const isFil = this.context?.language === 'fil';
    if (!result.ok) {
      this.emit({
        type: 'message',
        message: this.message(isFil ? 'Preview lang ito. Hindi nakumpleto ng AniWhere ang pagsusuri.' : 'Preview only. AniWhere could not complete that check.'),
      });
      this.emit({ type: 'status', status: 'ready' });
      return;
    }

    const outlets = Array.isArray(result.data) ? result.data as AniOutletFacts[] : [];
    const matches = outlets.filter((item) => item.fit.status === 'match').length;
    const partial = outlets.filter((item) => item.fit.status === 'partial').length;
    const confirm = outlets.filter((item) => item.fit.status === 'confirm').length;
    const text = isFil
      ? `Preview lang — demo data ito. Nakakita ang AniWhere ng ${matches} full match, ${partial} partial, at ${confirm} kailangang kumpirmahin. Buksan ang Discovery para makita ang eksaktong dami at ebidensya.`
      : `Preview only — this is demo data. AniWhere found ${matches} full match, ${partial} partial, and ${confirm} needing confirmation. Open Discovery for the exact quantities and evidence.`;
    this.emit({ type: 'message', message: this.message(text) });
    this.emit({ type: 'status', status: 'ready' });
  }

  subscribe(listener: (event: AniProviderEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close() {
    this.emit({ type: 'status', status: 'idle' });
    this.listeners.clear();
  }

  private message(text: string): AniMessage {
    return { id: `mock-${Date.now()}`, role: 'ani', text, createdAt: Date.now() };
  }

  private emit(event: AniProviderEvent) {
    for (const listener of this.listeners) listener(event);
  }
}
