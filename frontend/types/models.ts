export type UserRole = "guest" | "teacher" | "student";

export type AuthUser = {
  token: string;
  role: UserRole;
  displayName: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  role: Exclude<UserRole, "guest">;
};

export type LoginResponse = {
  token: string;
  teacher_name?: string;
  message?: string;
};

export type Student = {
  id: number;
  student_code?: string;
  name: string;
  email?: string;
  home_class_id?: number;
  status?: string;
  // Legacy alias for older backend responses.
  class_id?: number;
};

export type CreateStudentPayload = {
  student_code: string;
  name: string;
  email?: string;
  home_class_id?: number;
  // Legacy alias for older backend payloads.
  class_id?: number;
};

export type ClassItem = {
  id: number;
  course_code?: string;
  course_name?: string;
  teacher_id?: number;
  semester?: string;
  // Legacy aliases for older backend responses.
  class_code?: string;
  name?: string;
  lecturer?: string;
};

export type CreateClassPayload = {
  course_code?: string;
  course_name?: string;
  teacher_id?: number;
  semester?: string;
  class_code?: string;
  name?: string;
  lecturer?: string;
};

export type Session = {
  id: number;
  course_class_id: number;
  session_date: string;
  status?: "scheduled" | "active" | "completed" | "canceled";
  // Legacy aliases for older backend responses.
  class_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
};

export type CreateSessionPayload = {
  course_class_id: number;
  session_date: string;
  status?: "scheduled" | "active" | "completed" | "canceled";
  // Legacy aliases for older backend payloads.
  class_id: number;
  session_name: string;
  start_time: string;
  end_time: string;
};

export type AttendancePayload = {
  session_id: number;
  student_id: number;
  status?: "present" | "late" | "absent";
  confidence_score?: number;
  image_base64?: string;
};

export type AttendanceItem = {
  id: string;
  session_id: number;
  student_id: number;
  status: string;
  confidence_score?: number;
  check_in_time: string;
  // Legacy alias for local cache compatibility.
  created_at: string;
};
