import { http } from "@/services/http";

export const studentAuthService = {
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.patch("/api/auth/student/change-password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },
};
