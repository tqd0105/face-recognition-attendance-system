"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { classService } from "@/services/class.service";
import type { ClassItem, CreateClassPayload } from "@/types/models";

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState<CreateClassPayload>({
        course_code: "",
        course_name: "",
        teacher_id: undefined,
        semester: "",
    });

    async function loadClasses() {
        try {
            setIsLoading(true);
            setError(null);
            const data = await classService.getAll();
            setClasses(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load classes";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadClasses();
    }, []);

    async function onCreateClass(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!form.course_name?.trim()) {
            return;
        }

        try {
            setIsCreating(true);
            setError(null);
            await classService.create(form);
            await loadClasses();
            setIsModalOpen(false);
            setForm({ course_code: "", course_name: "", teacher_id: undefined, semester: "" });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create class";
            setError(message);
        } finally {
            setIsCreating(false);
        }
    }

    const columns = useMemo(
        () => [
            { key: "id", title: "ID", render: (row: ClassItem) => row.id },
            { key: "code", title: "Course Code", render: (row: ClassItem) => row.course_code ?? row.class_code ?? "-" },
            { key: "name", title: "Course Name", render: (row: ClassItem) => row.course_name ?? row.name ?? "-" },
            { key: "teacher", title: "Teacher ID", render: (row: ClassItem) => row.teacher_id ?? "-" },
            { key: "semester", title: "Semester", render: (row: ClassItem) => row.semester ?? "-" },
        ],
        [],
    );

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Management</p>
                        <h1 className="text-2xl font-bold text-slate-900">Course Class Management</h1>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => setIsModalOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> Add Course Class
                    </button>
                </div>

                <div className="mt-4">
                    {isLoading && <LoadingState label="Loading course class table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={classes} emptyText="No course classes found" />}
                </div>
            </section>

            <Modal open={isModalOpen} title="Add Course Class" onClose={() => setIsModalOpen(false)}>
                <form className="grid gap-3" onSubmit={onCreateClass}>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-code">
                            Course Code
                        </label>
                        <input
                            id="course-code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.course_code ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, course_code: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-name">
                            Course Name
                        </label>
                        <input
                            id="course-name"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.course_name ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, course_name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="teacher-id">
                            Teacher ID
                        </label>
                        <input
                            id="teacher-id"
                            type="number"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.teacher_id ?? ""}
                            onChange={(e) =>
                                setForm((prev) => ({ ...prev, teacher_id: e.target.value ? Number(e.target.value) : undefined }))
                            }
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="semester">
                            Semester
                        </label>
                        <input
                            id="semester"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.semester ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value }))}
                        />
                    </div>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating}
                    >
                        {isCreating ? "Creating..." : "Create Course Class"}
                    </button>
                </form>
            </Modal>
        </main>
    );
}
