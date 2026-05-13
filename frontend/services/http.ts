import axios from "axios";
import { BACKEND_BASE_URL, getAccessToken } from "@/lib/backend";

export const http = axios.create({
  baseURL: BACKEND_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // Nß║┐u c├│ message tß╗½ server, g├ín n├│ v├áo error.message ─æß╗â dß╗à ─æß╗ìc
    if (axios.isAxiosError(error) && error.response?.data?.message) {
      error.message = error.response.data.message;
    }
    return Promise.reject(error);
  }
);

