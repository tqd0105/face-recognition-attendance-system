import { http } from "@/services/http";
import type { CreateSessionPayload, Session } from "@/types/models";

const SESSIONS_CACHE_KEY = "fras_sessions_cache";

function readSessionCache(): Session[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SESSIONS_CACHE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as Session[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveSessionCache(items: Session[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(SESSIONS_CACHE_KEY, JSON.stringify(items));
}

type SessionApiResponse = Partial<Session> & {
  course_class_id?: number;
  session_title?: string;
  session_date?: string;
  status?: "scheduled" | "active" | "completed" | "canceled";
};

function normalizeSession(data: SessionApiResponse): Session {
  const startTime = data.start_time ?? "";
  const endTime = data.end_time ?? "";
  const sessionDate = data.session_date ?? "";
  const courseClassId = Number(data.course_class_id ?? data.class_id ?? 0);

  return {
    id: Number(data.id ?? 0),
    course_class_id: courseClassId,
    session_date: sessionDate,
    status: data.status,
    class_id: courseClassId,
    session_name: data.session_name ?? data.session_title ?? "Session",
    start_time: startTime,
    end_time: endTime,
  };
}

export const sessionService = {
  getLocal(): Session[] {
    return readSessionCache();
  },

  async create(payload: CreateSessionPayload): Promise<Session> {
    const normalizedPayload = {
      course_class_id: payload.course_class_id,
      session_date: payload.session_date,
      start_time: payload.start_time,
      end_time: payload.end_time,
      status: payload.status ?? "scheduled",
    };

    let created: Session;

    try {
      const { data } = await http.post<SessionApiResponse>("/api/sessions", normalizedPayload);
      created = normalizeSession(data);
    } catch {
      const fallbackPayload = {
        class_id: normalizedPayload.course_class_id,
        session_name: payload.session_name.trim(),
        session_date: normalizedPayload.session_date,
        start_time: normalizedPayload.start_time,
        end_time: normalizedPayload.end_time,
        status: normalizedPayload.status,
      };

      const { data } = await http.post<SessionApiResponse>("/api/sessions", fallbackPayload);
      created = normalizeSession(data);
    }

    const next = [created, ...readSessionCache()].slice(0, 100);
    saveSessionCache(next);
    return created;
  },
};
