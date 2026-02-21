export async function httpGet<T>(url: string): Promise<T> {
    const res = await fetch(url, {
        headers: { "content-type": "application/json" },
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
    }

    return (await res.json()) as T;
}
