import type { ApiErrorEnvelope } from "@intervu/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type TokenResolver = () => Promise<string | null>;

export class IntervuApiClient {
  constructor(
    private readonly baseUrl = API_URL,
    private readonly resolveToken: TokenResolver = async () =>
      process.env.NEXT_PUBLIC_AUTH_MODE === "mock" ? "demo-token" : null,
  ) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.resolveToken();
    const headers = new Headers(init.headers);
    if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
    if (token) headers.set("Authorization", `Bearer ${token}`);
    headers.set("X-Request-ID", crypto.randomUUID());

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });

    if (!response.ok) {
      let payload: ApiErrorEnvelope | null = null;
      try {
        payload = (await response.json()) as ApiErrorEnvelope;
      } catch {
        // The typed fallback below keeps transport failures useful without leaking internals.
      }
      throw new ApiClientError(
        payload?.error.message ?? "Intervu could not complete that request.",
        payload?.error.code ?? "REQUEST_FAILED",
        response.status,
        payload?.error.details,
      );
    }

    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" });
  }
}

export const apiClient = new IntervuApiClient();
