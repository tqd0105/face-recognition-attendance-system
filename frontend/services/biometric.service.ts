import axios from "axios";
import { http } from "@/services/http";

type BiometricCheckResponse = {
  has_face_data?: boolean;
  has_biometrics?: boolean;
  data?: {
    id?: number;
    quality_score?: number;
    created_at?: string;
  };
};

type BiometricHistoryResponse = {
  data?: Array<{
    id?: number;
    student_id?: number;
    quality_score?: number;
    created_at?: string;
  }>;
};

type BiometricEnrollResponse = {
  message?: string;
  data?: {
    id?: number;
    student_id?: number;
    quality_score?: number;
  };
};

function extractApiMessage(error: unknown): string | null {
  const axiosError = axios.isAxiosError(error) ? error : null;
  return (
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.message ||
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.detail ||
    (axiosError?.response?.data as { message?: string; error?: string; detail?: string } | undefined)?.error ||
    null
  );
}

export const biometricService = {
  async checkEnrollment(studentId: number): Promise<{ hasFaceData: boolean; createdAt?: string }> {
    const { data } = await http.get<BiometricCheckResponse>(`/api/biometrics/student/${studentId}`);
    return {
      hasFaceData: Boolean(data?.has_face_data ?? data?.has_biometrics),
      createdAt: data?.data?.created_at,
    };
  },

  async enroll(studentId: number, imageBlob: Blob, filename = "enrollment.jpg"): Promise<void> {
    const formData = new FormData();
    formData.append("student_id", String(studentId));
    formData.append("image", imageBlob, filename);

    try {
      await http.post<BiometricEnrollResponse>("/api/biometrics/enroll", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (error) {
      const message = extractApiMessage(error);
      if (message) {
        throw new Error(message);
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot enroll face (HTTP ${status})` : "Cannot enroll face");
    }
  },

  async getEnrollmentHistory(studentId: number): Promise<Array<{ id: number; studentId: number; qualityScore?: number; createdAt?: string }>> {
    const { data } = await http.get<BiometricHistoryResponse>(`/api/biometrics/student/${studentId}/history`);
    const rows = Array.isArray(data?.data) ? data.data : [];
    return rows.map((item) => ({
      id: Number(item.id ?? 0),
      studentId: Number(item.student_id ?? 0),
      qualityScore: item.quality_score,
      createdAt: item.created_at,
    }));
  },

  async deleteAllEnrollments(studentId: number): Promise<void> {
    try {
      await http.delete(`/api/biometrics/student/${studentId}`);
    } catch (error) {
      const message = extractApiMessage(error);
      if (message) {
        throw new Error(message);
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete enrollment history (HTTP ${status})` : "Cannot delete enrollment history");
    }
  },

  async deleteEnrollmentById(enrollmentId: number): Promise<void> {
    try {
      await http.delete(`/api/biometrics/enrollment/${enrollmentId}`);
    } catch (error) {
      const message = extractApiMessage(error);
      if (message) {
        throw new Error(message);
      }

      const axiosError = axios.isAxiosError(error) ? error : null;
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete enrollment record (HTTP ${status})` : "Cannot delete enrollment record");
    }
  },
};
