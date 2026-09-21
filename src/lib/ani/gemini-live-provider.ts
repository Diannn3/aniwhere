import { ANI_SYSTEM_INSTRUCTION } from './system-instruction';
import { ANI_TOOL_DECLARATIONS } from './tool-declarations';
import type { AniMessage, AniProvider, AniProviderEvent, AniSessionContext, AniToolName, AniToolResult } from './types';

export const ANI_LIVE_MODEL = 'gemini-3.8-live';
const LIVE_ENDPOINT = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained';
const TOOL_NAMES = new Set<string>(ANI_TOOL_DECLARATIONS.map((tool) => tool.name));

type LiveMessage = {
  setupComplete?: object;
  toolCall?: { functionCalls?: Array<{ id?: string; name?: string; args?: Record<string, unknown> }> };
  sessionResumptionUpdate?: { resumable?: boolean; newHandle?: string };
  goAway?: { timeLeft?: string };
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    turnComplete?: boolean;
    interrupted?: boolean;
  };
};

export class GeminiLiveAniProvider implements AniProvider {
  readonly kind = 'gemini-live' as const;
  private listeners = new Set<(event: AniProviderEvent) => void>();
  private socket?: WebSocket;
  private micStream?: MediaStream;
  private micContext?: AudioContext;
  private micNode?: AudioWorkletNode;
  private playbackContext?: AudioContext;
  private playbackAt = 0;
  private outputTranscript = '';
  private inputTranscript = '';
  private inputTranscriptEmitted = false;
  private suppressAudio = false;
  private sessionContext?: AniSessionContext;
  private resumptionHandle?: string;
  private reconnecting = false;
  private reconnectAttempts = 0;
  private closedByUser = false;

  async connect(context: AniSessionContext): Promise<void> {
    this.sessionContext = context;
    this.closedByUser = false;
    this.reconnectAttempts = 0;
    await this.openSocket();
  }

  private async openSocket(): Promise<void> {
    const tokenEndpoint = import.meta.env.PUBLIC_ANI_SESSION_ENDPOINT;
    if (!tokenEndpoint) {
      this.emit({ type: 'status', status: 'offline' });
      throw new Error('Ani Live is not configured: PUBLIC_ANI_SESSION_ENDPOINT is missing.');
    }

    this.emit({ type: 'status', status: 'connecting' });
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
    });
    if (!tokenResponse.ok) {
      this.emit({ type: 'status', status: 'offline' });
      throw new Error('Ani Live session provisioning failed.');
    }

    const payload = await tokenResponse.json() as { token?: string; model?: string };
    if (!payload.token) throw new Error('Ani Live session token was missing.');

    const model = payload.model || ANI_LIVE_MODEL;
    const url = `${LIVE_ENDPOINT}?access_token=${encodeURIComponent(payload.token)}`;
    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(url);
      this.socket = socket;
      const timeout = window.setTimeout(() => {
        socket.close();
        reject(new Error('Ani Live connection timed out.'));
      }, 12_000);

      socket.onopen = () => {
        socket.send(JSON.stringify({
          setup: {
            model: `models/${model}`,
            generationConfig: { responseModalities: ['AUDIO'] },
            systemInstruction: { parts: [{ text: ANI_SYSTEM_INSTRUCTION }] },
            tools: [{ functionDeclarations: ANI_TOOL_DECLARATIONS }],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            sessionResumption: this.resumptionHandle ? { handle: this.resumptionHandle } : {},
            contextWindowCompression: { slidingWindow: {} },
          },
        }));
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(String(event.data)) as LiveMessage;
        if (message.sessionResumptionUpdate?.resumable && message.sessionResumptionUpdate.newHandle) {
          this.resumptionHandle = message.sessionResumptionUpdate.newHandle;
        }
        if (message.goAway && !this.closedByUser) {
          void this.reconnect();
        }
        if (message.setupComplete) {
          window.clearTimeout(timeout);
          this.emit({ type: 'status', status: 'ready' });
          resolve();
        }
        this.handleMessage(message);
      };
      socket.onerror = () => {
        window.clearTimeout(timeout);
        this.emit({ type: 'status', status: 'error' });
        reject(new Error('Ani Live WebSocket failed.'));
      };
      socket.onclose = () => {
        window.clearTimeout(timeout);
        if (this.closedByUser || this.reconnecting) return;
        this.emit({ type: 'status', status: 'offline' });
        if (this.resumptionHandle && this.reconnectAttempts < 2) {
          void this.reconnect();
        }
      };
    });
  }

  private async reconnect(): Promise<void> {
    if (this.reconnecting || this.closedByUser || !this.sessionContext) return;
    this.reconnecting = true;
    this.reconnectAttempts += 1;
    this.emit({ type: 'status', status: 'connecting' });
    try {
      if (this.socket?.readyState === WebSocket.OPEN) {
        this.socket.close(1000, 'Ani session resuming');
      }
      await this.openSocket();
      this.reconnectAttempts = 0;
    } catch {
      this.emit({ type: 'status', status: 'offline' });
    } finally {
      this.reconnecting = false;
    }
  }

  async sendText(text: string): Promise<void> {
    this.assertReady();
    this.outputTranscript = '';
    this.inputTranscript = '';
    this.inputTranscriptEmitted = true;
    this.suppressAudio = false;
    this.emit({ type: 'status', status: 'working' });
    this.socket!.send(JSON.stringify({
      clientContent: {
        turns: [{ role: 'user', parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  }

  async startListening(): Promise<void> {
    this.assertReady();
    if (this.micStream) return;
    this.inputTranscript = '';
    this.inputTranscriptEmitted = false;
    this.outputTranscript = '';
    this.suppressAudio = false;
    this.micStream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    this.micContext = new AudioContext({ sampleRate: 16_000 });
    await this.micContext.audioWorklet.addModule('/ani/pcm-capture-worklet.js');
    const source = this.micContext.createMediaStreamSource(this.micStream);
    this.micNode = new AudioWorkletNode(this.micContext, 'ani-pcm-capture', { numberOfInputs: 1, numberOfOutputs: 0 });
    this.micNode.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      if (this.socket?.readyState !== WebSocket.OPEN) return;
      const pcm = floatToPcm16(new Float32Array(event.data));
      this.socket.send(JSON.stringify({
        realtimeInput: { audio: { data: bytesToBase64(new Uint8Array(pcm.buffer)), mimeType: 'audio/pcm;rate=16000' } },
      }));
    };
    source.connect(this.micNode);
    this.emit({ type: 'status', status: 'listening' });
  }

  async stopListening(): Promise<void> {
    this.micNode?.disconnect();
    this.micNode = undefined;
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micStream = undefined;
    await this.micContext?.close();
    this.micContext = undefined;
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ realtimeInput: { audioStreamEnd: true } }));
    }
    this.emit({ type: 'status', status: 'working' });
  }

  stopOutput(): void {
    this.suppressAudio = true;
    this.stopPlayback();
    this.emit({ type: 'status', status: this.micStream ? 'listening' : 'ready' });
  }

  async submitToolResult(result: AniToolResult): Promise<void> {
    this.assertReady();
    this.socket!.send(JSON.stringify({
      toolResponse: {
        functionResponses: [{ id: result.requestId, name: result.tool, response: { result } }],
      },
    }));
  }

  subscribe(listener: (event: AniProviderEvent) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async close(): Promise<void> {
    this.closedByUser = true;
    this.reconnecting = false;
    this.resumptionHandle = undefined;
    this.sessionContext = undefined;
    await this.stopMedia();
    this.socket?.close(1000, 'Ani panel closed');
    this.socket = undefined;
    this.emit({ type: 'status', status: 'idle' });
  }

  private handleMessage(message: LiveMessage) {
    const inputText = message.serverContent?.inputTranscription?.text;
    if (inputText) this.inputTranscript += inputText;

    const outputText = message.serverContent?.outputTranscription?.text;
    if (outputText) {
      this.flushVoiceInputTranscript();
      this.outputTranscript += outputText;
      this.emit({ type: 'status', status: 'speaking' });
    }

    for (const part of message.serverContent?.modelTurn?.parts || []) {
      if (!this.suppressAudio && part.inlineData?.data && part.inlineData.mimeType?.startsWith('audio/pcm')) {
        this.flushVoiceInputTranscript();
        void this.playPcm24k(part.inlineData.data);
        this.emit({ type: 'status', status: 'speaking' });
      }
    }

    for (const call of message.toolCall?.functionCalls || []) {
      if (!call.id || !call.name || !TOOL_NAMES.has(call.name)) {
        this.emit({ type: 'error', error: 'Ani requested an unsupported action.' });
        continue;
      }
      this.emit({
        type: 'tool_request',
        toolRequest: {
          id: call.id,
          name: call.name as AniToolName,
          args: call.args && typeof call.args === 'object' ? call.args : {},
        },
      });
    }

    if (message.serverContent?.interrupted) {
      this.stopPlayback();
      this.emit({ type: 'status', status: this.micStream ? 'listening' : 'ready' });
    }

    if (message.serverContent?.turnComplete) {
      this.flushVoiceInputTranscript();
      const text = this.outputTranscript.trim();
      if (text) this.emit({ type: 'message', message: this.message('ani', text) });
      this.outputTranscript = '';
      this.suppressAudio = false;
      this.emit({ type: 'status', status: this.micStream ? 'listening' : 'ready' });
    }
  }

  private flushVoiceInputTranscript() {
    if (this.inputTranscriptEmitted) return;
    const text = this.inputTranscript.trim();
    if (!text) return;
    this.emit({ type: 'message', message: this.message('farmer', text) });
    this.inputTranscriptEmitted = true;
  }

  private message(role: 'farmer' | 'ani', text: string): AniMessage {
    return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, createdAt: Date.now() };
  }

  private async playPcm24k(data: string) {
    const bytes = base64ToBytes(data);
    const sampleCount = Math.floor(bytes.byteLength / 2);
    if (!sampleCount) return;
    this.playbackContext ??= new AudioContext({ sampleRate: 24_000 });
    const samples = new Float32Array(sampleCount);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < sampleCount; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
    const buffer = this.playbackContext.createBuffer(1, sampleCount, 24_000);
    buffer.copyToChannel(samples, 0);
    const source = this.playbackContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackContext.destination);
    const now = this.playbackContext.currentTime;
    this.playbackAt = Math.max(now + 0.02, this.playbackAt);
    source.start(this.playbackAt);
    this.playbackAt += buffer.duration;
  }

  private stopPlayback() {
    this.playbackAt = 0;
    void this.playbackContext?.close();
    this.playbackContext = undefined;
  }

  private async stopMedia() {
    this.micNode?.disconnect();
    this.micStream?.getTracks().forEach((track) => track.stop());
    this.micNode = undefined;
    this.micStream = undefined;
    await this.micContext?.close();
    this.micContext = undefined;
    this.stopPlayback();
  }

  private assertReady() {
    if (this.socket?.readyState !== WebSocket.OPEN) throw new Error('Ani Live is not connected.');
  }

  private emit(event: AniProviderEvent) {
    for (const listener of this.listeners) listener(event);
  }
}

function floatToPcm16(input: Float32Array) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i]));
    output[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
