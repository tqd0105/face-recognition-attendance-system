import { http } from "@/services/http";
import axios from "axios";
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

type SessionCreateResponse = {
  message?: string;
  data?: SessionApiResponse;
};

function normalizeSession(data: SessionApiResponse): Session {
  const startTime = data.start_time ?? "";
  const endTime = data.end_time ?? "";
  const sessionDate = data.session_date ?? "";
  const rawCourseClassId = data.course_class_id ?? data.class_id ?? 0;
  const courseClassId = Number(rawCourseClassId || 0);

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

  clearCache(): void {
    saveSessionCache([]);
  },

  async getByCourseId(courseId: number): Promise<Session[]> {
    const { data } = await http.get<SessionApiResponse[]>(`/api/sessions/${courseId}`);
    const normalized = Array.isArray(data) ? data.map((item) => normalizeSession(item)) : [];
    return normalized;
  },

  async getAll(courseIds: number[]): Promise<Session[]> {
    const uniqueIds = Array.from(new Set(courseIds.filter((id) => Number.isFinite(id) && id > 0)));
    if (uniqueIds.length === 0) {
      saveSessionCache([]);
      return [];
    }

    const grouped = await Promise.all(uniqueIds.map((id) => this.getByCourseId(id)));
    const merged = grouped.flat();
    const seen = new Set<number>();
    const normalized = merged
      .filter((item) => {
        if (seen.has(item.id)) {
          return false;
        }
        seen.add(item.id);
        return true;
      })
      .sort((a, b) => Number(b.id) - Number(a.id));

    saveSessionCache(normalized);
    return normalized;
  },

  async create(payload: CreateSessionPayload): Promise<Session> {
    const normalizedPayload = {
      course_class_id: payload.course_class_id,
      class_id: payload.course_class_id,
      session_date: payload.session_date,
      session_name: payload.session_name?.trim() || undefined,
      start_time: payload.start_time,
      end_time: payload.end_time,
      status: payload.status ?? "scheduled",
    };

    let created: Session;

    try {
      const { data } = await http.post<SessionCreateResponse | SessionApiResponse>("/api/sessions", normalizedPayload);
      const payload = (data as SessionCreateResponse)?.data ?? (data as SessionApiResponse);
      created = normalizeSession(payload);
    } catch (error) {
      const fallbackPayload = {
        class_id: normalizedPayload.course_class_id,
        course_class_id: normalizedPayload.course_class_id,
        session_name: payload.session_name?.trim() || undefined,
        session_date: normalizedPayload.session_date,
        start_time: normalizedPayload.start_time,
        end_time: normalizedPayload.end_time,
        status: normalizedPayload.status,
      };

      try {
        const { data } = await http.post<SessionCreateResponse | SessionApiResponse>("/api/sessions", fallbackPayload);
        const payloadData = (data as SessionCreateResponse)?.data ?? (data as SessionApiResponse);
        created = normalizeSession(payloadData);
      } catch {
        const axiosError = axios.isAxiosError(error) ? error : null;
        const apiMessage =
          (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.message ||
          (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.error;

        if (apiMessage) {
          throw new Error(apiMessage);
        }

        throw new Error("Cannot create session");
      }
    }

    const next = [created, ...readSessionCache()].slice(0, 100);
    saveSessionCache(next);
    return created;
  },

  async update(id: number, payload: CreateSessionPayload): Promise<Session> {
    const normalizedPayload = {
      course_class_id: payload.course_class_id,
      class_id: payload.course_class_id,
      session_date: payload.session_date,
      session_name: payload.session_name?.trim() || undefined,
      start_time: payload.start_time,
      end_time: payload.end_time,
      status: payload.status ?? "scheduled",
    };

    try {
      const { data } = await http.put<SessionCreateResponse | SessionApiResponse>(`/api/sessions/item/${id}`, normalizedPayload);
      const payloadData = (data as SessionCreateResponse)?.data ?? (data as SessionApiResponse);
      return normalizeSession(payloadData);
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot update session (HTTP ${status})` : "Cannot update session");
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await http.delete(`/api/sessions/item/${id}`);
    } catch (error) {
      const axiosError = axios.isAxiosError(error) ? error : null;
      const apiMessage =
        (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.message ||
        (axiosError?.response?.data as { message?: string; error?: string } | undefined)?.error;

      if (apiMessage) {
        throw new Error(apiMessage);
      }
      const status = axiosError?.response?.status;
      throw new Error(status ? `Cannot delete session (HTTP ${status})` : "Cannot delete session");
    }
  },
};
