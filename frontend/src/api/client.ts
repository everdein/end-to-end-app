async function responseErrorMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');

  if (!text) {
    return `HTTP ${res.status} ${res.statusText}`;
  }

  try {
    const problem = JSON.parse(text) as { detail?: unknown; title?: unknown };
    const detail = typeof problem.detail === 'string' ? problem.detail : undefined;
    const title = typeof problem.title === 'string' ? problem.title : undefined;
    return `HTTP ${res.status} ${res.statusText}: ${detail ?? title ?? text}`;
  } catch {
    return `HTTP ${res.status} ${res.statusText}: ${text}`;
  }
}

async function assertOk(res: Response): Promise<void> {
  if (!res.ok) {
    throw new Error(await responseErrorMessage(res));
  }
}

export async function httpGet<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json' },
  });

  await assertOk(res);

  return (await res.json()) as T;
}

export async function httpGetBlob(url: string): Promise<Blob> {
  const res = await fetch(url);

  await assertOk(res);

  return await res.blob();
}

export async function httpPost<T, B = unknown>(url: string, body: B): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body as unknown),
  });

  await assertOk(res);

  return (await res.json()) as T;
}

export async function httpPostRaw<T>(
  url: string,
  body: string | Blob | ArrayBuffer,
  contentType: string
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
  });

  await assertOk(res);

  return (await res.json()) as T;
}

export async function httpPut<T, B = unknown>(url: string, body: B): Promise<T> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body as unknown),
  });

  await assertOk(res);

  return (await res.json()) as T;
}

export async function httpDelete(url: string): Promise<void> {
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
  });

  await assertOk(res);
}
