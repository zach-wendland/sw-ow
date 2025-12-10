/**
 * Production-grade API client with type safety, error handling,
 * and automatic retry logic.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorDetail {
  code: string;
  message: string;
  details: Record<string, unknown> | null;
  trace_id: string;
}

export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  duration_ms: number;
}

export interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: ErrorDetail | null;
  meta: ResponseMeta;
}

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export class APIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details: Record<string, unknown> | null = null,
    public readonly traceId: string = ""
  ) {
    super(message);
    this.name = "APIError";
  }

  static fromResponse(error: ErrorDetail, status: number): APIError {
    return new APIError(
      error.code,
      error.message,
      status,
      error.details,
      error.trace_id
    );
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// ============================================================================
// CORE FETCH WRAPPER
// ============================================================================

async function fetchWithTimeout(
  url: string,
  config: RequestConfig = {}
): Promise<Response> {
  const { timeout = DEFAULT_TIMEOUT, ...fetchConfig } = config;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry(
  url: string,
  config: RequestConfig = {}
): Promise<Response> {
  const { retries = MAX_RETRIES, retryDelay = RETRY_DELAY, ...fetchConfig } = config;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, fetchConfig);

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === "AbortError") {
        throw new APIError("TIMEOUT", "Request timed out", 408);
      }
    }

    if (attempt < retries) {
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
    }
  }

  throw new APIError(
    "NETWORK_ERROR",
    lastError?.message || "Network request failed",
    0
  );
}

// ============================================================================
// API CLIENT
// ============================================================================

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    options: RequestConfig & { body?: unknown } = {}
  ): Promise<T> {
    const { body, ...config } = options;

    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    };

    const response = await fetchWithRetry(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      ...config,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const json: APIResponse<T> = await response.json();

    if (!json.success || json.error) {
      throw APIError.fromResponse(
        json.error || {
          code: "UNKNOWN_ERROR",
          message: "An unknown error occurred",
          details: null,
          trace_id: json.meta?.request_id || "",
        },
        response.status
      );
    }

    return json.data as T;
  }

  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("GET", endpoint, config);
  }

  async post<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>("POST", endpoint, { ...config, body });
  }

  async patch<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>("PATCH", endpoint, { ...config, body });
  }

  async put<T>(
    endpoint: string,
    body?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>("PUT", endpoint, { ...config, body });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>("DELETE", endpoint, config);
  }
}

// Export singleton instance
export const api = new ApiClient("/api/py/v1");
export const apiPy = new ApiClient("/api/py");
