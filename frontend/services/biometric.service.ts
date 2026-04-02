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
};
