import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { APIError } from '@/lib/api/client';

describe('APIError', () => {
  it('should create APIError with all properties', () => {
    const error = new APIError(
      'NOT_FOUND',
      'Resource not found',
      404,
      { id: '123' },
      'trace-123'
    );

    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
    expect(error.status).toBe(404);
    expect(error.details).toEqual({ id: '123' });
    expect(error.traceId).toBe('trace-123');
    expect(error.name).toBe('APIError');
  });

  it('should create APIError with default values', () => {
    const error = new APIError('ERROR', 'An error occurred', 500);

    expect(error.details).toBeNull();
    expect(error.traceId).toBe('');
  });

  it('should extend Error', () => {
    const error = new APIError('ERROR', 'An error occurred', 500);

    expect(error instanceof Error).toBe(true);
    expect(error instanceof APIError).toBe(true);
  });

  it('should create from response', () => {
    const errorDetail = {
      code: 'VALIDATION_ERROR',
      message: 'Invalid input',
      details: { field: 'email' },
      trace_id: 'trace-456',
    };

    const error = APIError.fromResponse(errorDetail, 400);

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.status).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
    expect(error.traceId).toBe('trace-456');
  });
});

describe('API Client Integration', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('should handle successful response', async () => {
    const mockResponse = {
      success: true,
      data: { id: 1, name: 'Test' },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: 'req-123',
        duration_ms: 50,
      },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    // Import dynamically to ensure fetch mock is in place
    const { api } = await import('@/lib/api/client');
    const result = await api.get<{ id: number; name: string }>('/test');

    expect(result).toEqual(mockResponse.data);
  });

  it('should handle error response', async () => {
    const mockResponse = {
      success: false,
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: null,
        trace_id: 'trace-err',
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: 'req-456',
        duration_ms: 30,
      },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { api } = await import('@/lib/api/client');

    await expect(api.get('/not-found')).rejects.toThrow(APIError);
  });

  it('should handle 204 No Content', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
    } as Response);

    const { api } = await import('@/lib/api/client');
    const result = await api.delete('/resource');

    expect(result).toBeUndefined();
  });

  it('should send POST with body', async () => {
    const mockResponse = {
      success: true,
      data: { id: 1, name: 'Created' },
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: 'req-789',
        duration_ms: 100,
      },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { api } = await import('@/lib/api/client');
    const body = { name: 'New Item' };
    await api.post('/items', body);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  });

  it('should include correct headers', async () => {
    const mockResponse = {
      success: true,
      data: null,
      error: null,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: 'req-headers',
        duration_ms: 20,
      },
    };

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const { api } = await import('@/lib/api/client');
    await api.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      })
    );
  });
});
