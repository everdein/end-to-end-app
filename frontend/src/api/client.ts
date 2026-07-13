import { getAuthorizationHeader } from './auth';

const REQUEST_ID_HEADER = 'X-Request-ID';

type ResponseErrorDetails = {
  message: string;
  requestId?: string;
};

export class ApiError extends Error {
  readonly requestId: string;
  readonly status: number;

  constructor(message: string, status: number, requestId: string) {
    super(`${message} (Request ID: ${requestId})`);
    this.name = 'ApiError';
    this.requestId = requestId;
    this.status = status;
  }
}

async function responseErrorDetails(res: Response): Promise<ResponseErrorDetails> {
  if (res.status === 401) {
    return { message: 'HTTP 401 Unauthorized: sign in to access financial data' };
  }

  const text = await res.text().catch(() => '');

  if (!text) {
    return { message: `HTTP ${res.status} ${res.statusText}` };
  }

  try {
    const problem = JSON.parse(text) as {
      detail?: unknown;
      requestId?: unknown;
      title?: unknown;
    };
    const detail = typeof problem.detail === 'string' ? problem.detail : undefined;
    const requestId = typeof problem.requestId === 'string' ? problem.requestId : undefined;
    const title = typeof problem.title === 'string' ? problem.title : undefined;
    return {
      message: `HTTP ${res.status} ${res.statusText}: ${detail ?? title ?? text}`,
      requestId,
    };
  } catch {
    return { message: `HTTP ${res.status} ${res.statusText}: ${text}` };
  }
}

async function assertOk(res: Response, clientRequestId: string): Promise<void> {
  if (!res.ok) {
    const details = await responseErrorDetails(res);
    const requestId = res.headers.get(REQUEST_ID_HEADER) ?? details.requestId ?? clientRequestId;
    throw new ApiError(details.message, res.status, requestId);
  }
}

export async function httpGet<T>(url: string): Promise<T> {
  const { requestId, response } = await apiFetch(url, {}, 'application/json');

  await assertOk(response, requestId);

  return (await response.json()) as T;
}

export async function httpGetBlob(url: string): Promise<Blob> {
  const { requestId, response } = await apiFetch(url);

  await assertOk(response, requestId);

  return await response.blob();
}

export async function httpPost<T, B = unknown>(url: string, body: B): Promise<T> {
  const { requestId, response } = await apiFetch(
    url,
    {
      method: 'POST',
      body: JSON.stringify(body as unknown),
    },
    'application/json'
  );

  await assertOk(response, requestId);

  return (await response.json()) as T;
}

export async function httpPostRaw<T>(
  url: string,
  body: string | Blob | ArrayBuffer,
  contentType: string
): Promise<T> {
  const { requestId, response } = await apiFetch(url, { method: 'POST', body }, contentType);

  await assertOk(response, requestId);

  return (await response.json()) as T;
}

export async function httpPut<T, B = unknown>(url: string, body: B): Promise<T> {
  const { requestId, response } = await apiFetch(
    url,
    {
      method: 'PUT',
      body: JSON.stringify(body as unknown),
    },
    'application/json'
  );

  await assertOk(response, requestId);

  return (await response.json()) as T;
}

export async function httpDelete(url: string): Promise<void> {
  const { requestId, response } = await apiFetch(url, { method: 'DELETE' }, 'application/json');

  await assertOk(response, requestId);
}

async function apiFetch(
  url: string,
  init: NonNullable<Parameters<typeof fetch>[1]> = {},
  contentType?: string
): Promise<{ requestId: string; response: Response }> {
  const requestId = createRequestId();
  const response = await fetch(url, {
    ...init,
    headers: requestHeaders(requestId, contentType),
  });

  return { requestId, response };
}

function requestHeaders(requestId: string, contentType?: string) {
  const headers: Record<string, string> = { [REQUEST_ID_HEADER]: requestId };
  const authorization = getAuthorizationHeader();

  if (contentType) {
    headers['content-type'] = contentType;
  }

  if (authorization) {
    headers.Authorization = authorization;
  }

  return headers;
}

function createRequestId() {
  return globalThis.crypto.randomUUID();
}
