export const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5000";

export type UserRole = "guest" | "teacher" | "student";

export type AuthSession = {
  token: string;
  role: UserRole;
  displayName: string;
};

const TOKEN_KEY = "auth_token";
const ROLE_KEY = "auth_role";
const NAME_KEY = "auth_name";

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
    const storageToken = window.localStorage.getItem(TOKEN_KEY);
    if (storageToken?.trim()) {
      return storageToken.trim();
    }
  }

  return "";
}

export function getAuthSession(): AuthSession {
  const token = getAccessToken();

  if (typeof window === "undefined") {
    return {
      token,
      role: token ? "Teacher" : "Guest",
      displayName: token ? "Teacher" : "Chưa xác thực",
    };
  }

  const rawRole = window.localStorage.getItem(ROLE_KEY)?.trim() as UserRole | undefined;
  const role = token ? rawRole ?? "teacher" : "guest";
  const storedName = window.localStorage.getItem(NAME_KEY)?.trim();

  return {
    token,
    role,
    displayName: storedName || (role === "teacher" ? "Teacher" : role === "student" ? "Student" : "Guest"),
  };
}

export function setAccessToken(token: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
}

export function setAuthSession(token: string, role: Exclude<UserRole, "guest">, displayName?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ROLE_KEY, role);
  if (displayName?.trim()) {
    window.localStorage.setItem(NAME_KEY, displayName.trim());
  } else {
    window.localStorage.removeItem(NAME_KEY);
  }
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ROLE_KEY);
  window.localStorage.removeItem(NAME_KEY);
}
