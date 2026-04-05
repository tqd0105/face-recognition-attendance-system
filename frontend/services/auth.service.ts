import { http } from "@/services/http";
import axios from "axios";
import type { LoginPayload, LoginResponse } from "@/types/models";

function resolveLoginErrorMessage(error: unknown, role: LoginPayload["role"]): string {
  if (!axios.isAxiosError(error)) {
    return "Cannot sign in right now. Please try again.";
  }

  const payload = error.response?.data as { message?: string; error?: string; detail?: string } | undefined;
  const apiMessage = payload?.message || payload?.detail || payload?.error;
  const status = error.response?.status;

  if (apiMessage) {
    return apiMessage;
  }

  if (status === 401) {
    return "Incorrect email or password.";
  }

  if (status === 403 && role === "admin") {
    return "This account is not allowed to sign in as admin.";
  }

  if (status === 501 && role === "student") {
    return "Student login is temporarily unavailable.";
  }

  return "Cannot sign in right now. Please try again.";
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    try {
      const { data } = await http.post<LoginResponse>("/api/auth/login", {
        email: payload.email,
        password: payload.password,
        role: payload.role,
      });
      return data;
    } catch (error) {
      throw new Error(resolveLoginErrorMessage(error, payload.role));
    }
  },
};
