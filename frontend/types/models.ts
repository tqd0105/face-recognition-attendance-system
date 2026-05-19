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
  parent_email?: string;
  home_class_id?: number;
  status?: string;
  // Legacy alias for older backend responses.
  class_id?: number;
};

export type CreateStudentPayload = {
  student_code: string;
  name: string;
  email?: string;
  parent_email?: string;
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
  created_by?: number;
  created_by_label?: string;
  created_by_name?: string;
  created_by_code?: string;
  created_by_role?: "teacher" | "admin";
  teacher_name?: string;
  teacher_code?: string;
  attendance_count?: number;
  total_attendance_records?: number;
  enrolled_count?: number;
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
  session_name?: string;
  session_date?: string;
  session_start_time?: string;
  session_end_time?: string;
  session_status?: string;
};

export type StudentAttendanceHistoryItem = {
  attendance_id: number;
  session_id: number;
  status: string;
  check_in_time?: string;
  confidence_score?: number;
  session_name?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  course_name?: string;
  course_code?: string;
  student_code?: string;
  student_name?: string;
};

export type StudentDashboardSessionItem = {
  session_id: number;
  session_name?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  session_status?: string;
  course_class_id: number;
  course_code?: string;
  course_name?: string;
  teacher_name?: string;
  attendance_id?: number;
  attendance_status?: string;
  check_in_time?: string;
  display_status?: string;
};

export type NotificationLogItem = {
  id: number;
  notification_type: "schedule_reminder" | "late_attendance" | "absent_attendance" | string;
  session_id?: number;
  student_id?: number;
  recipient_email: string;
  recipient_role: "student" | "parent" | string;
  subject: string;
  status: "pending" | "sent" | "failed" | "skipped" | string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at?: string;
  student_code?: string;
  student_name?: string;
  session_name?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  course_code?: string;
  course_name?: string;
  teacher_name?: string;
};

export type NotificationLogResponse = {
  message?: string;
  data: NotificationLogItem[];
  page?: number;
  limit?: number;
};

export type StudentDashboardSummary = {
  total_sessions: number;
  attended_sessions: number;
  present_count: number;
  late_count: number;
  excused_count: number;
  absent_count: number;
  attendance_rate: number;
};

export type StudentDashboardCourseStat = {
  course_class_id: number;
  course_code?: string;
  course_name?: string;
  total_sessions: number;
  attended_sessions: number;
  absent_count: number;
  attendance_rate: number;
};

export type StudentDashboardResponse = {
  today: {
    date: string;
    total_sessions: number;
    checked_in_sessions: number;
    remaining_sessions: number;
    sessions: StudentDashboardSessionItem[];
  };
  timetable: {
    from?: string | null;
    to?: string | null;
    sessions: StudentDashboardSessionItem[];
  };
  summary: StudentDashboardSummary;
  course_stats: StudentDashboardCourseStat[];
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
