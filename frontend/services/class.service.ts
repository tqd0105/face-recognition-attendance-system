import { http } from "@/services/http";
import type { ClassItem, CreateClassPayload } from "@/types/models";

type CourseClassApiResponse = Partial<ClassItem> & {
  course_name?: string;
  class_name?: string;
};

function normalizeCourseClass(data: CourseClassApiResponse): ClassItem {
  return {
    id: Number(data.id ?? 0),
    course_code: data.course_code ?? data.class_code,
    course_name: data.course_name ?? data.name ?? data.class_name,
    teacher_id: data.teacher_id,
    semester: data.semester,
    class_code: data.class_code ?? data.course_code,
    name: data.name ?? data.course_name ?? data.class_name ?? "Course Class",
    lecturer: data.lecturer,
  };
}

export const classService = {
  async getAll(): Promise<ClassItem[]> {
    const { data } = await http.get<CourseClassApiResponse[]>("/api/classes");
    return data.map(normalizeCourseClass);
  },

  async create(payload: CreateClassPayload): Promise<ClassItem> {
    const normalizedPayload = {
      course_code: payload.course_code?.trim() || payload.class_code?.trim() || undefined,
      course_name: payload.course_name?.trim() || payload.name?.trim() || undefined,
      teacher_id: payload.teacher_id,
      semester: payload.semester?.trim() || undefined,
    };

    if (!normalizedPayload.course_name) {
      throw new Error("Course name is required");
    }

    try {
      const { data } = await http.post<CourseClassApiResponse>("/api/classes", normalizedPayload);
      return normalizeCourseClass(data);
    } catch {
      const fallbackPayload = {
        class_code: normalizedPayload.course_code,
        class_name: normalizedPayload.course_name,
        lecturer: payload.lecturer?.trim() || undefined,
      };
      const { data } = await http.post<CourseClassApiResponse>("/api/classes", fallbackPayload);
      return normalizeCourseClass(data);
    }
  },
};
