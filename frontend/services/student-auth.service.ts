import { http } from "@/services/http";
import axios from "axios";

function resolveChangePasswordErrorMessage(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return "Cannot change password right now. Please try again.";
  }

  const payload = error.response?.data as { message?: string; error?: string; detail?: string } | undefined;
  const apiMessage = payload?.message || payload?.detail || payload?.error;
  const status = error.response?.status;

  if (apiMessage) {
    return apiMessage;
  }

  if (status === 400) {
    return "Please enter both current password and new password.";
  }

  if (status === 401) {
    return "Current password is incorrect.";
  }

  if (status === 422) {
    return "New password must be at least 6 characters.";
  }

  if (status === 503) {
    return "Your account password is not initialized. Please contact administrator.";
  }

  return "Cannot change password right now. Please try again.";
}

export const studentAuthService = {
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await http.patch("/api/auth/student/change-password", {
        current_password: currentPassword,
        new_password: newPassword,
      });
    } catch (error) {
      throw new Error(resolveChangePasswordErrorMessage(error));
    }
  },
};
