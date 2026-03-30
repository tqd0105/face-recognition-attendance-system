import { http } from "@/services/http";
import type { CreateStudentPayload, Student } from "@/types/models";

type StudentApiResponse = Partial<Student> & {
  home_class_id?: number;
};

function normalizeStudent(data: StudentApiResponse): Student {
  const homeClassId = data.home_class_id ?? data.class_id;
  return {
    id: Number(data.id ?? 0),
    student_code: data.student_code,
    name: data.name ?? "",
    email: data.email,
    home_class_id: homeClassId,
    class_id: homeClassId,
    status: data.status,
  };
}

export const studentService = {
  async getAll(): Promise<Student[]> {
    const { data } = await http.get<StudentApiResponse[]>("/api/students");
    return data.map(normalizeStudent);
  },

  async create(payload: CreateStudentPayload): Promise<Student> {
    const normalizedPayload = {
      student_code: payload.student_code,
      name: payload.name,
      email: payload.email,
      home_class_id: payload.home_class_id ?? payload.class_id,
    };

    try {
      const { data } = await http.post<StudentApiResponse>("/api/students", normalizedPayload);
      return normalizeStudent(data);
    } catch {
      const fallbackPayload = {
        student_code: payload.student_code,
        name: payload.name,
        email: payload.email,
        class_id: payload.home_class_id ?? payload.class_id,
      };
      const { data } = await http.post<StudentApiResponse>("/api/students", fallbackPayload);
      return normalizeStudent(data);
    }
  },
};
