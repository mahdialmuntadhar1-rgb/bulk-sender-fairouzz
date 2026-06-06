export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://bulk-sender-fairouzz-api.mahdialmuntadhar1.workers.dev";

export async function apiGet(path: string) {
  const response = await fetch(${API_BASE_URL});

  if (!response.ok) {
    throw new Error(API error : );
  }

  return response.json();
}
