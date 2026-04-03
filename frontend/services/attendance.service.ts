import { http } from "@/services/http";
import axios from "axios";
import { sessionService } from "@/services/session.service";
import type { AttendanceItem, AttendancePayload, RealtimeRecognizeResponse, StudentAttendanceHistoryItem } from "@/types/models";

const ATTENDANCE_CACHE_KEY = "fras_attendance_cache";

function readAttendanceCache(): AttendanceItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ATTENDANCE_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as AttendanceItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAttendanceCache(items: AttendanceItem[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(ATTENDANCE_CACHE_KEY, JSON.stringify(items));
}

function toAttendanceItem(payload: AttendancePayload): AttendanceItem {
  const nowIso = new Date().toISOString();
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    session_id: payload.session_id,
    student_id: payload.student_id,
    status: payload.status ?? "present",
    confidence_score: payload.confidence_score,
    check_in_time: nowIso,
    created_at: nowIso,
  };
}

type AttendanceApiRow = {
  id?: number | string;
  session_id?: number;
  student_id?: number;
  status?: string;
  confidence_score?: number;
  check_in_time?: string;
  created_at?: string;
  student_code?: string;
  name?: string;
  email?: string;
  home_class_code?: string;
  home_class_major?: string;
  home_class_department?: string;
  course_code?: string;
  course_name?: string;
  teacher_id?: number;
  teacher_name?: string;
  session_date?: string;
  start_time?: string;
  end_time?: string;
  session_status?: string;
};

type AttendanceApiResponse = {
  message?: string;
  data?: AttendanceApiRow;
};

type CheckInOneFaceResult = {
  item: AttendanceItem;
  message?: string;
};

type RealtimeRecognizeApiResponse = {
  message?: string;
  data?: RealtimeRecognizeResponse;
};

function normalizeAttendanceItem(row: AttendanceApiRow): AttendanceItem {
  const checkIn = row.check_in_time ?? row.created_at ?? new Date().toISOString();
  return {
    id: String(row.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    session_id: Number(row.session_id ?? 0),
    student_id: Number(row.student_id ?? 0),
    status: row.status ?? "present",
    confidence_score: row.confidence_score,
    check_in_time: checkIn,
    created_at: row.created_at ?? checkIn,
    student_code: row.student_code,
    student_name: row.name,
    student_email: row.email,
    home_class_code: row.home_class_code,
    home_class_major: row.home_class_major,
    home_class_department: row.home_class_department,
    course_code: row.course_code,
    course_name: row.course_name,
    teacher_id: row.teacher_id,
    teacher_name: row.teacher_name,
    session_date: row.session_date,
    session_start_time: row.start_time,
    session_end_time: row.end_time,
    session_status: row.session_status,
  };
}

function toApiMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const data = error.response?.data as { message?: string; error?: string; detail?: string | { message?: string } } | undefined;
  if (typeof data?.detail === "string") {
    return data.detail;
  }
  if (data?.detail && typeof data.detail === "object" && typeof data.detail.message === "string") {
    return data.detail.message;
  }
  return data?.message ?? data?.error ?? null;
}

function rethrowFriendlyError(error: unknown, fallback: string): never {
  throw new Error(toApiMessage(error) ?? fallback);
}

async function runWithSessionReloadRetry<T>(sessionId: number, request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 409) {
      throw error;
    }

    try {
      await sessionService.start(sessionId);
    } catch (reloadError) {
      throw new Error(toApiMessage(reloadError) ?? "Session embeddings are not loaded in AI. Please start the session again.");
    }

    return request();
  }
}

export const attendanceService = {
  getLocal(): AttendanceItem[] {
    return readAttendanceCache();
  },

  async mark(payload: AttendancePayload): Promise<AttendanceItem> {
    try {
      const { data } = await http.post<AttendanceApiResponse>("/api/attendance/check-in", payload);
      const nextItem = data?.data ? normalizeAttendanceItem(data.data) : toAttendanceItem(payload);
      const next = [nextItem, ...readAttendanceCache()].slice(0, 300);
      saveAttendanceCache(next);
      return nextItem;
    } catch (error) {
      rethrowFriendlyError(error, "Unable to complete check-in.");
    }
  },

  async manualMark(payload: AttendancePayload): Promise<AttendanceItem> {
    try {
      const { data } = await http.post<AttendanceApiResponse>("/api/attendance/manual", payload);
      const item = data?.data ? normalizeAttendanceItem(data.data) : toAttendanceItem(payload);
      const next = [item, ...readAttendanceCache()].slice(0, 300);
      saveAttendanceCache(next);
      return item;
    } catch (error) {
      rethrowFriendlyError(error, "Unable to update manual attendance.");
    }
  },

  async checkInOneFace(payload: {
    session_id: number;
    student_id: number;
    image_base64: string;
    min_similarity?: number;
  }): Promise<CheckInOneFaceResult> {
    try {
      const { data } = await runWithSessionReloadRetry(payload.session_id, () =>
        http.post<AttendanceApiResponse>("/api/attendance/check-in-one-face", payload)
      );
      const item = data?.data ? normalizeAttendanceItem(data.data) : toAttendanceItem(payload);
      const next = [item, ...readAttendanceCache()].slice(0, 300);
      saveAttendanceCache(next);
      return {
        item,
        message: data?.message,
      };
    } catch (error) {
      rethrowFriendlyError(error, "Unable to complete one-face check-in.");
    }
  },

  async getBySession(sessionId: number): Promise<AttendanceItem[]> {
    const { data } = await http.get<AttendanceApiRow[]>(`/api/attendance/session/${sessionId}`, {
      params: {
        _t: Date.now(),
      },
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
    });
    if (!Array.isArray(data)) {
      return [];
    }

    const items = data.map(normalizeAttendanceItem);
    saveAttendanceCache(items.slice(0, 300));
    return items;
  },

  async getStudentHistory(studentId: number, courseClassId?: number): Promise<StudentAttendanceHistoryItem[]> {
    const { data } = await http.get<{ data?: StudentAttendanceHistoryItem[] } | StudentAttendanceHistoryItem[]>(
      `/api/attendance/student/${studentId}`,
      {
        params: courseClassId ? { course_class_id: courseClassId } : undefined,
      }
    );

    if (Array.isArray(data)) {
      return data;
    }

    return Array.isArray(data?.data) ? data.data : [];
  },

  async updateById(id: string, status: string): Promise<AttendanceItem> {
    const { data } = await http.put<AttendanceApiResponse>(`/api/attendance/${id}`, { status });
    return data?.data ? normalizeAttendanceItem(data.data) : normalizeAttendanceItem({ id, status });
  },

  async recognizeRealtime(payload: {
    session_id: number;
    image_base64: string;
    min_similarity?: number;
  }): Promise<RealtimeRecognizeResponse> {
    try {
      const { data } = await runWithSessionReloadRetry(payload.session_id, () =>
        http.post<RealtimeRecognizeApiResponse>("/api/attendance/recognize", payload)
      );
      return (
        data?.data ?? {
          session_id: payload.session_id,
          threshold: payload.min_similarity ?? 0.82,
          detections: [],
          checked_in: [],
        }
      );
    } catch (error) {
      rethrowFriendlyError(error, "Unable to run realtime recognition.");
    }
  },
};
