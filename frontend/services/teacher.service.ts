import { http } from "@/services/http";

export type TeacherInfo = {
    id: number;
    teacher_code: string;
    teacher_name: string;
    email: string;
    role: string;
    status: string;
    created_at?: string;
};

export const teacherService = {
    async getAll(): Promise<TeacherInfo[]> {
        const { data } = await http.get<{ message: string; data: TeacherInfo[] }>("/api/teachers");
        return data.data;
    },

    async create(payload: Partial<TeacherInfo> & { password?: string }): Promise<TeacherInfo> {
        const { data } = await http.post<{ message: string; data: TeacherInfo }>("/api/teachers", payload);
        return data.data;
    },

    async update(id: number, payload: Partial<TeacherInfo>): Promise<TeacherInfo> {
        const { data } = await http.put<{ message: string; data: TeacherInfo }>(`/api/teachers/${id}`, payload);
        return data.data;
    },

    async delete(id: number): Promise<void> {
        await http.delete(`/api/teachers/${id}`);
    },
};
