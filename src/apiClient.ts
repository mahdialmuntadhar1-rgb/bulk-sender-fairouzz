export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://bulk-sender-fairouzz-api.mahdialmuntadhar1.workers.dev";

export async function apiGet(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${path}`);
  }

  return response.json();
}

export async function apiPost(path: string, data: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  const responseText = await response.text();
  let payload: any = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = { raw: responseText };
  }

  if (!response.ok) {
    throw new Error(payload?.error || `API error ${response.status}: ${path}`);
  }

  return payload;
}