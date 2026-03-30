import { http } from "@/services/http";
import type { AttendanceItem, AttendancePayload } from "@/types/models";

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

export const attendanceService = {
  getLocal(): AttendanceItem[] {
    return readAttendanceCache();
  },

  async mark(payload: AttendancePayload): Promise<AttendanceItem> {
    await http.post("/api/attendance/check-in", payload);
    const nextItem = toAttendanceItem(payload);
    const next = [nextItem, ...readAttendanceCache()].slice(0, 300);
    saveAttendanceCache(next);
    return nextItem;
  },
};
