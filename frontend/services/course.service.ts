import { http } from "@/services/http";
import axios from "axios";
import type { CourseItem, CreateCoursePayload } from "@/types/models";

type CourseCreateResponse = {
  message?: string;
  data?: CourseItem;
};

type CourseListResponse = {
  message?: string;
  data?: CourseItem[];
};

function normalizeCourseList(payload: CourseItem[] | CourseListResponse): CourseItem[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}

export const courseService = {
  async getAll(): Promise<CourseItem[]> {
    try {
      const { data } = await http.get<CourseItem[] | CourseListResponse>("/api/courses");
      return normalizeCourseList(data);
    } catch {
      const { data } = await http.get<CourseItem[] | CourseListResponse>("/api/course-classes");
      return normalizeCourseList(data);
    }
  },

  async create(payload: CreateCoursePayload): Promise<CourseItem> {
    const normalizedPayload = {
      course_code: payload.course_code.trim(),
      course_name: payload.course_name.trim(),
      semester: payload.semester?.trim() || undefined,
    };

    try {
      const { data } = await http.post<CourseCreateResponse>("/api/courses", normalizedPayload);
      if (data?.data) {
        return data.data;
      }
      throw new Error(data?.message || "Cannot create course");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        const { data } = await http.post<CourseCreateResponse>("/api/course-classes", normalizedPayload);
        if (data?.data) {
          return data.data;
        }
        throw new Error(data?.message || "Cannot create course");
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }

      throw new Error("Cannot create course");
    }
  },

  async update(id: number, payload: CreateCoursePayload): Promise<CourseItem> {
    const normalizedPayload = {
      course_code: payload.course_code.trim(),
      course_name: payload.course_name.trim(),
      semester: payload.semester?.trim() || undefined,
    };

    try {
      const { data } = await http.put<CourseCreateResponse>(`/api/courses/${id}`, normalizedPayload);
      if (data?.data) {
        return data.data;
      }
      throw new Error(data?.message || "Cannot update course");
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot update course (HTTP ${status})` : "Cannot update course");
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await http.delete(`/api/courses/${id}`);
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
        (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete course (HTTP ${status})` : "Cannot delete course");
    }
  },
};
