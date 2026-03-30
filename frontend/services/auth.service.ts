import { http } from "@/services/http";
import type { LoginPayload, LoginResponse } from "@/types/models";

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await http.post<LoginResponse>("/api/auth/login", {
      email: payload.email,
      password: payload.password,
    });
    return data;
  },
};
