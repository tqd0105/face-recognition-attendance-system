import { http } from "@/services/http";
import axios from "axios";
import type { CreateStudentPayload, Student } from "@/types/models";

type StudentApiResponse = Partial<Student> & {
  home_class_id?: number;
};

type StudentCreateResponse = {
  message?: string;
  data?: StudentApiResponse;
};

type StudentListResponse = {
  message?: string;
  data?: StudentApiResponse[];
};

function normalizeStudentList(payload: StudentApiResponse[] | StudentListResponse): StudentApiResponse[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}

function extractApiMessage(error: unknown): string | null {
  const axiosError = axios.isAxiosError(error) ? error : null;
  return (
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error ||
    null
  );
}

function normalizeStudent(data: StudentApiResponse): Student {
  const homeClassId = data.home_class_id ?? data.class_id;
  return {
    id: Number(data.id ?? 0),
    student_code: data.student_code,
    name: data.name ?? "",
    email: data.email,
    home_class_id: homeClassId,
    class_id: homeClassId,
    status: data.status,
  };
}

export const studentService = {
  async getAll(): Promise<Student[]> {
    const { data } = await http.get<StudentApiResponse[] | StudentListResponse>("/api/students");
    return normalizeStudentList(data).map(normalizeStudent);
  },

  async create(payload: CreateStudentPayload): Promise<Student> {
    const normalizedPayload = {
      student_code: payload.student_code,
      name: payload.name,
      email: payload.email,
      home_class_id: payload.home_class_id ?? payload.class_id,
    };

    try {
      const { data } = await http.post<StudentCreateResponse | StudentApiResponse>("/api/students", normalizedPayload);
      const payloadData = (data as StudentCreateResponse)?.data ?? (data as StudentApiResponse);
      return normalizeStudent(payloadData);
    } catch {
      const fallbackPayload = {
        student_code: payload.student_code,
        name: payload.name,
        email: payload.email,
        class_id: payload.home_class_id ?? payload.class_id,
      };
      const { data } = await http.post<StudentCreateResponse | StudentApiResponse>("/api/students", fallbackPayload);
      const payloadData = (data as StudentCreateResponse)?.data ?? (data as StudentApiResponse);
      return normalizeStudent(payloadData);
    }
  },

  async update(id: number, payload: CreateStudentPayload): Promise<Student> {
    const normalizedPayload = {
      student_code: payload.student_code,
      name: payload.name,
      email: payload.email,
      home_class_id: payload.home_class_id ?? payload.class_id,
    };

    try {
      const { data } = await http.put<StudentCreateResponse | StudentApiResponse>(`/api/students/${id}`, normalizedPayload);
      const payloadData = (data as StudentCreateResponse)?.data ?? (data as StudentApiResponse);
      return normalizeStudent(payloadData);
    } catch (error) {
      const message = extractApiMessage(error);
      if (message) {
        throw new Error(message);
      }
      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot update student (HTTP ${status})` : "Cannot update student");
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await http.delete(`/api/students/${id}`);
    } catch (error) {
      const message = extractApiMessage(error);
      if (message) {
        throw new Error(message);
      }
      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete student (HTTP ${status})` : "Cannot delete student");
    }
  },
};
