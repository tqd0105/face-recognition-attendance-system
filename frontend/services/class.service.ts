import { http } from "@/services/http";
import axios from "axios";
import type { ClassItem, CreateClassPayload } from "@/types/models";

type HomeClassCreateResponse = {
  message?: string;
  data?: ClassItem;
};

type HomeClassListResponse = {
  message?: string;
  data?: ClassItem[];
};

function normalizeClassList(payload: ClassItem[] | HomeClassListResponse): ClassItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}

export const classService = {
  async getAll(): Promise<ClassItem[]> {
    try {
      const { data } = await http.get<ClassItem[] | HomeClassListResponse>("/api/home-classes");
      return normalizeClassList(data);
    } catch {
      const { data } = await http.get<ClassItem[] | HomeClassListResponse>("/api/classes");
      return normalizeClassList(data);
    }
  },

  async create(payload: CreateClassPayload): Promise<ClassItem> {
    const normalizedPayload = {
      class_code: payload.class_code?.trim() || undefined,
      major: payload.major?.trim() || undefined,
      department: payload.department?.trim() || undefined,
    };

    if (!normalizedPayload.class_code) {
      throw new Error("Class code is required");
    }

    if (!normalizedPayload.major) {
      throw new Error("Major is required");
    }

    try {
      const { data } = await http.post<HomeClassCreateResponse>("/api/classes", normalizedPayload);
      if (data?.data) {
        return data.data;
      }
      throw new Error(data?.message || "Cannot create class");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const { data } = await http.post<HomeClassCreateResponse>("/api/home-classes", normalizedPayload);
        if (data?.data) {
          return data.data;
        }
        throw new Error(data?.message || "Cannot create class");
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }

      if (axiosError?.response?.status === 500) {
        throw new Error("Server error while creating home class. Check duplicate class_code.");
      }

      throw new Error("Cannot create class");
    }
  },

  async update(id: number, payload: CreateClassPayload): Promise<ClassItem> {
    const normalizedPayload = {
      class_code: payload.class_code?.trim() || undefined,
      major: payload.major?.trim() || undefined,
      department: payload.department?.trim() || undefined,
    };

    if (!normalizedPayload.class_code) {
      throw new Error("Class code is required");
    }

    if (!normalizedPayload.major) {
      throw new Error("Major is required");
    }

    try {
      const { data } = await http.put<HomeClassCreateResponse>(`/api/home-classes/${id}`, normalizedPayload);
      if (data?.data) {
        return data.data;
      }
      throw new Error(data?.message || "Cannot update class");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const { data } = await http.put<HomeClassCreateResponse>(`/api/classes/${id}`, normalizedPayload);
        if (data?.data) {
          return data.data;
        }
        throw new Error(data?.message || "Cannot update class");
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot update class (HTTP ${status})` : "Cannot update class");
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await http.delete(`/api/home-classes/${id}`);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        await http.delete(`/api/classes/${id}`);
        return;
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete class (HTTP ${status})` : "Cannot delete class");
    }
  },
};
