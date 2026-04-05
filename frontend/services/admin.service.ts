import { http } from "@/services/http";

type AdminOverviewResponse = {
  data?: {
    teachers?: number;
    students?: { total?: number; active?: number; inactive?: number };
    home_classes?: number;
    course_classes?: number;
    sessions?: { scheduled?: number; active?: number; completed?: number; canceled?: number };
    attendance?: { today?: number; total?: number };
  };
};

type GuardrailsResponse = {
  data?: {
    biometric_min_quality?: number;
    biometric_reenroll_min_similarity?: number;
    biometric_duplicate_similarity_threshold?: number;
    biometric_self_vs_other_margin?: number;
    biometric_strict_uniqueness?: boolean;
    session_lifecycle_interval_ms?: number;
  };
};

export const adminService = {
  async getOverview() {
    const { data } = await http.get<AdminOverviewResponse>("/api/auth/admin/overview");
    return data?.data;
  },

  async getGuardrails() {
    const { data } = await http.get<GuardrailsResponse>("/api/auth/admin/guardrails");
    return data?.data;
  },
};
