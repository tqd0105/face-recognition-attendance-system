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
