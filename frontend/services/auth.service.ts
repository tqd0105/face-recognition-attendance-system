// i:\tttn\project\face-recognition-attendance-system\frontend\services\auth.service.ts

import { http } from "@/services/http";
import type { LoginPayload, LoginResponse } from "@/types/models";

type ApiErrorLike = {
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
      detail?: string;
      error?: string;
    };
  };
};

function resolveLoginErrorMessage(error: unknown, role: LoginPayload["role"]): string {
  const apiError = error as ApiErrorLike;
  const responseData = apiError?.response?.data;
  const status = apiError?.response?.status;

  const apiMessage = responseData?.message || responseData?.detail || responseData?.error;
  if (apiMessage) {
    return apiMessage;
  }

  if (status === 401) {
    return "T├ái khoß║ún hoß║╖c mß║¡t khß║⌐u kh├┤ng ch├¡nh x├íc.";
  }

  if (status === 403) {
    if (role === "admin") return "T├ái khoß║ún n├áy kh├┤ng c├│ quyß╗ün quß║ún trß╗ï.";
    return "T├ái khoß║ún cß╗ºa bß║ín ─æang bß╗ï kh├│a hoß║╖c kh├┤ng c├│ quyß╗ün truy cß║¡p.";
  }

  // 3. Sß╗¡ dß╗Ñng message mß║╖c ─æß╗ïnh cß╗ºa ─æß╗æi t╞░ß╗úng Error nß║┐u c├│
  if (apiError?.message && apiError.message !== "Network Error") {
    return apiError.message;
  }

  return "Kh├┤ng thß╗â ─æ─âng nhß║¡p l├║c n├áy. Vui l├▓ng thß╗¡ lß║íi sau.";
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
    } catch (error: unknown) {
      // N├⌐m ra lß╗ùi vß╗¢i th├┤ng b├ío ─æ├ú ─æ╞░ß╗úc xß╗¡ l├╜
      throw new Error(resolveLoginErrorMessage(error, payload.role));
    }
  },
};
