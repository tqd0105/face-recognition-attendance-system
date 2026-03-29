export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

export function backendUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return `${BACKEND_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authHeaders(token?: string): HeadersInit {
  if (!token?.trim()) {
    return {};
  }

  return {
    Authorization: `Bearer ${token.trim()}`,
  };
}

export function getAccessToken(): string {
  const envToken = process.env.NEXT_PUBLIC_AUTH_TOKEN;
  if (envToken?.trim()) {
    return envToken.trim();
  }

  if (typeof window !== "undefined") {
    const storageToken = window.localStorage.getItem("auth_token");
    if (storageToken?.trim()) {
      return storageToken.trim();
    }
  }

  return "";
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("auth_token", token);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem("auth_token");
}
