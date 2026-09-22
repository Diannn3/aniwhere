import type { FitResult, HarvestQuery } from '../domain/types';

export type AniAvatarState =
  | 'idle' | 'attentive' | 'listening' | 'thinking' | 'working'
  | 'speaking' | 'success' | 'uncertain' | 'error' | 'offline';

export type AniLanguage = 'en' | 'fil';
export type AniProviderStatus = 'idle' | 'connecting' | 'ready' | 'listening' | 'working' | 'speaking' | 'offline' | 'error';

export interface AniMessage {
  id: string;
  role: 'farmer' | 'ani' | 'system';
  text: string;
  createdAt: number;
}

export interface AniProviderEvent {
  type: 'status' | 'message' | 'tool_request' | 'error';
  status?: AniProviderStatus;
  message?: AniMessage;
  toolRequest?: AniToolRequest;
  error?: string;
}

export interface AniProvider {
  readonly kind: 'mock' | 'gemini-live';
  connect(context: AniSessionContext): Promise<void>;
  sendText(text: string): Promise<void>;
  startListening?(): Promise<void>;
  stopListening?(): Promise<void>;
  stopOutput?(): void;
  submitToolResult?(result: AniToolResult): Promise<void>;
  subscribe(listener: (event: AniProviderEvent) => void): () => void;
  close(): Promise<void>;
}

export interface AniSessionContext {
  language: AniLanguage;
  dataMode: 'demo' | 'pilot';
  harvest: HarvestQuery;
}

export type AniToolName =
  | 'set_harvest_context' | 'find_outlets' | 'get_outlet_details'
  | 'compare_outlets' | 'explain_current_fit_facts' | 'get_confirmation_questions'
  | 'set_or_update_transport_amount' | 'get_route_estimate' | 'navigate_to' | 'save_outlet';

export interface AniToolRequest {
  id: string;
  name: AniToolName;
  args: Record<string, unknown>;
}

export interface AniFitFacts {
  status: FitResult['status'];
  statusLabel: string;
  acceptedKg: number | null;
  remainingKg: number | null;
  buyerPostedPricePerKg: number | null;
  referencePricePerKg: number | null;
  demoPricePerKg: number | null;
  grossAmount: number | null;
  enteredTransport: number | null;
  afterTransportAmount: number | null;
  evidenceKind: FitResult['evidenceKind'];
  sourceLabel: string | null;
  updatedAt: string | null;
  validUntil: string | null;
  unknowns: string[];
  confirmationQuestions: string[];
}

export interface AniOutletFacts {
  id: string;
  slug: string;
  name: string;
  municipality: string;
  fit: AniFitFacts;
}

export interface AniRouteFacts {
  outletId: string;
  outletName: string;
  originMunicipality: string;
  originName: string;
  originBasis: 'municipality_centroid';
  source: 'road' | 'straight_line';
  straightLineDistanceKm: number;
  roadDistanceKm: number | null;
  roadDurationMinutes: number | null;
  provider: 'openrouteservice' | null;
  profile: 'driving-car' | null;
  generatedAt: string | null;
  geometryAvailable: boolean;
}

export interface AniToolResult {
  requestId: string;
  tool: AniToolName;
  ok: boolean;
  dataMode: 'demo' | 'pilot';
  data?: unknown;
  error?: { code: 'invalid_arguments' | 'not_found' | 'not_allowed' | 'unavailable'; message: string };
}
