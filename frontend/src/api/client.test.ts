// cspell:ignore unstub
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError, httpGet, httpPut } from './client';

describe('API request correlation', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('adds a unique request ID to API requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: 1 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    await httpGet<{ version: number }>('/api/v1/financials');

    expect(fetchMock).toHaveBeenCalledOnce();
    const init = fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> };
    expect(init.headers['X-Request-ID']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('surfaces the backend request ID with API errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: 'The financial snapshot changed after it was loaded.',
          requestId: 'server-request-456',
          title: '409 CONFLICT',
        }),
        {
          headers: {
            'Content-Type': 'application/problem+json',
            'X-Request-ID': 'server-request-456',
          },
          status: 409,
          statusText: 'Conflict',
        }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const request = httpPut('/api/v1/financials', { version: 1 });

    await expect(request).rejects.toBeInstanceOf(ApiError);
    await expect(request).rejects.toMatchObject({
      requestId: 'server-request-456',
      status: 409,
    });
    await expect(request).rejects.toThrow('Request ID: server-request-456');
  });
});
