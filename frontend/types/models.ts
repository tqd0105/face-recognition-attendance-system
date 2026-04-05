export type UserRole = "guest" | "teacher" | "student" | "admin";

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
  student_name?: string;
  role?: Exclude<UserRole, "guest">;
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
  status?: string;
  // Legacy alias for older backend payloads.
  class_id?: number;
};

export type ClassItem = {
  id: number;
  class_code?: string;
  major?: string;
  department?: string;
  created_at?: string;
};

export type CreateClassPayload = {
  class_code?: string;
  major?: string;
  department?: string;
};

export type CourseItem = {
  id: number;
  course_code?: string;
  course_name?: string;
  home_class_id?: number;
  home_class_code?: string;
  teacher_id?: number;
  teacher_code?: string;
  semester?: string;
  created_at?: string;
  enrolled_count?: number;
  home_class_breakdown?: Array<{
    class_code: string;
    count: number;
  }>;
};

export type CreateCoursePayload = {
  course_code: string;
  course_name: string;
  semester?: string;
  home_class_id?: number;
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
  student_code?: string;
  student_name?: string;
  student_email?: string;
  home_class_code?: string;
  home_class_major?: string;
  home_class_department?: string;
  course_code?: string;
  course_name?: string;
  teacher_id?: number;
  teacher_name?: string;
  session_date?: string;
  session_start_time?: string;
  session_end_time?: string;
  session_status?: string;
};

export type StudentAttendanceHistoryItem = {
  attendance_id: number;
  status: string;
  check_in_time?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  course_name?: string;
  course_code?: string;
};

export type RealtimeDetection = {
  status: "matched" | "rejected" | "unknown";
  student_id: number | null;
  student_code: string | null;
  name: string;
  similarity: number;
  bbox: number[];
  reason?: string;
  quality_score?: number;
  face_area_ratio?: number;
};

export type RealtimeRecognizeResponse = {
  session_id: number;
  threshold: number;
  detections: RealtimeDetection[];
  checked_in: Array<{
    id: number;
    session_id: number;
    student_id: number;
    status: string;
    confidence_score?: number;
    check_in_time: string;
  }>;
};
