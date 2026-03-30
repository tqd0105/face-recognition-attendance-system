"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { studentService } from "@/services/student.service";
import type { CreateStudentPayload, Student } from "@/types/models";

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const [form, setForm] = useState<CreateStudentPayload>({
        student_code: "",
        name: "",
        email: "",
    });

    async function loadStudents() {
        try {
            setIsLoading(true);
            setError(null);
            const data = await studentService.getAll();
            setStudents(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load students";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadStudents();
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.student_code.trim() || !form.name.trim()) {
            return;
        }

        try {
            setIsCreating(true);
            await studentService.create(form);
            setIsModalOpen(false);
            setForm({ student_code: "", name: "", email: "", home_class_id: undefined });
            await loadStudents();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create student";
            setError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const columns = useMemo(
        () => [
            { key: "id", title: "ID", render: (row: Student) => row.id },
            { key: "code", title: "Student Code", render: (row: Student) => row.student_code ?? "-" },
            { key: "name", title: "Name", render: (row: Student) => row.name },
            { key: "email", title: "Email", render: (row: Student) => row.email ?? "-" },
            { key: "homeClass", title: "Home Class ID", render: (row: Student) => row.home_class_id ?? row.class_id ?? "-" },
            { key: "status", title: "Status", render: (row: Student) => row.status ?? "active" },
        ],
        [],
    );

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Management</p>
                        <h1 className="text-2xl font-bold text-slate-900">Student Management</h1>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> Add Student
                    </button>
                </div>

                <div className="mt-4">
                    {isLoading && <LoadingState label="Loading student table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={students} emptyText="No students found" />}
                </div>
            </section>

            <Modal open={isModalOpen} title="Add Student" onClose={() => setIsModalOpen(false)}>
                <form className="grid gap-3" onSubmit={onSubmit}>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-code">
                            Student Code
                        </label>
                        <input
                            id="student-code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.student_code}
                            onChange={(e) => setForm((prev) => ({ ...prev, student_code: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-name">
                            Name
                        </label>
                        <input
                            id="student-name"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.name}
                            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-home-class-id">
                            Home Class ID
                        </label>
                        <input
                            id="student-home-class-id"
                            type="number"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.home_class_id ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, home_class_id: e.target.value ? Number(e.target.value) : undefined }))}
                            placeholder="e.g. 1"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="student-email">
                            Email
                        </label>
                        <input
                            id="student-email"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.email ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        />
                    </div>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating}
                    >
                        {isCreating ? "Saving..." : "Save Student"}
                    </button>
                </form>
            </Modal>
        </main>
    );
}
