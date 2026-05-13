// i:\tttn\project\face-recognition-attendance-system\frontend\services\auth.service.ts

import { http } from "@/services/http";
import axios from "axios";
import type { LoginPayload, LoginResponse } from "@/types/models";

function resolveLoginErrorMessage(error: any, role: LoginPayload["role"]): string {
  // Lß║Ñy dß╗» liß╗çu phß║ún hß╗ôi tß╗½ lß╗ùi (nß║┐u c├│)
  const responseData = error?.response?.data;
  const status = error?.response?.status;

  // 1. ╞»u ti├¬n lß║Ñy message trß╗▒c tiß║┐p tß╗½ Backend trß║ú vß╗ü
  const apiMessage = responseData?.message || responseData?.detail || responseData?.error;
  if (apiMessage) {
    return apiMessage;
  }

  // 2. Nß║┐u kh├┤ng c├│ message tß╗½ API, dß╗▒a tr├¬n HTTP Status Code
  if (status === 401) {
    return "T├ái khoß║ún hoß║╖c mß║¡t khß║⌐u kh├┤ng ch├¡nh x├íc.";
  }

  if (status === 403) {
    if (role === "admin") return "T├ái khoß║ún n├áy kh├┤ng c├│ quyß╗ün quß║ún trß╗ï.";
    return "T├ái khoß║ún cß╗ºa bß║ín ─æang bß╗ï kh├│a hoß║╖c kh├┤ng c├│ quyß╗ün truy cß║¡p.";
  }

  // 3. Sß╗¡ dß╗Ñng message mß║╖c ─æß╗ïnh cß╗ºa ─æß╗æi t╞░ß╗úng Error nß║┐u c├│
  if (error?.message && error.message !== "Network Error") {
    return error.message;
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
    } catch (error: any) {
      // N├⌐m ra lß╗ùi vß╗¢i th├┤ng b├ío ─æ├ú ─æ╞░ß╗úc xß╗¡ l├╜
      throw new Error(resolveLoginErrorMessage(error, payload.role));
    }
  },
};
