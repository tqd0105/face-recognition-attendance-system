"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BookCopy, Layers3, Plus, SquareUserRound, Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { ClassIcons } from "@/components/icons";
import { classService } from "@/services/class.service";
import { courseService } from "@/services/course.service";
import type { ClassItem, CourseItem, CreateCoursePayload } from "@/types/models";

export default function CoursesPage() {
    const router = useRouter();
    const canUpdateCourse = true;
    const canDeleteCourse = true;

    const [courses, setCourses] = useState<CourseItem[]>([]);
    const [homeClasses, setHomeClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingCourseId, setEditingCourseId] = useState<number | null>(null);
    const [pendingDeleteCourse, setPendingDeleteCourse] = useState<CourseItem | null>(null);

    const [form, setForm] = useState<CreateCoursePayload>({
        course_code: "",
        course_name: "",
        semester: "",
        home_class_id: undefined,
    });

    async function loadCourses() {
        try {
            setIsLoading(true);
            setError(null);
            const data = await courseService.getAll();
            setCourses(data);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot load course classes";
            setError(message);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        void loadCourses();

        async function loadHomeClasses() {
            try {
                const data = await classService.getAll();
                setHomeClasses(data);
            } catch {
                setHomeClasses([]);
            }
        }

        void loadHomeClasses();
    }, []);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!form.course_code.trim() || !form.course_name.trim()) {
            setModalError("Course code and course name are required.");
            return;
        }

        setModalError(null);

        const normalizedCode = form.course_code.trim().toLowerCase();
        const duplicatedCode = courses.some((item) => item.id !== editingCourseId && item.course_code?.trim().toLowerCase() === normalizedCode);
        if (duplicatedCode) {
            setModalError("Course code already exists. Please use another code.");
            return;
        }

        try {
            setIsCreating(true);
            if (editingCourseId) {
                await courseService.update(editingCourseId, form);
            } else {
                await courseService.create(form);
            }
            setIsModalOpen(false);
            setEditingCourseId(null);
            setForm({ course_code: "", course_name: "", semester: "" });
            await loadCourses();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create course class";
            setModalError(message);
        } finally {
            setIsCreating(false);
        }
    }

    function onDeleteCourse(item: CourseItem) {
        if (!canDeleteCourse) {
            setError("Current backend does not support deleting course classes yet.");
            return;
        }

        setPendingDeleteCourse(item);
    }

    async function onConfirmDeleteCourse() {
        if (!pendingDeleteCourse) {
            return;
        }

        try {
            setIsDeleting(true);
            setError(null);
            await courseService.remove(pendingDeleteCourse.id);
            setPendingDeleteCourse(null);
            await loadCourses();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot delete course class";
            setError(message);
        } finally {
            setIsDeleting(false);
        }
    }

    function onEditCourse(item: CourseItem) {
        setModalError(null);
        setEditingCourseId(item.id);
        setForm({
            course_code: item.course_code ?? "",
            course_name: item.course_name ?? "",
            semester: item.semester ?? "",
            home_class_id: item.home_class_id,
        });
        setIsModalOpen(true);
    }

    const columns = useMemo(
        () => [
            { key: "code", title: "Course Class Code", render: (row: CourseItem) => row.course_code ?? "-" },
            { key: "name", title: "Course Name", render: (row: CourseItem) => row.course_name ?? "-" },
            { key: "linkedClass", title: "Linked Home Class", render: (row: CourseItem) => row.home_class_code ?? "-" },
            { key: "semester", title: "Semester", render: (row: CourseItem) => row.semester ?? "-" },
            { key: "teacher", title: "Teacher Code", render: (row: CourseItem) => row.teacher_code ?? row.teacher_id ?? "-" },
            // {
            //     key: "homeClasses",
            //     title: "Enrolled Home Classes",
            //     render: (row: CourseItem) => {
            //         const breakdown = Array.isArray(row.home_class_breakdown) ? row.home_class_breakdown : [];
            //         if (breakdown.length === 0) {
            //             if (row.home_class_code) {
            //                 return <span className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">Linked: {row.home_class_code}</span>;
            //             }
            //             return <span className="text-xs font-medium text-slate-500">No enrolled students</span>;
            //         }

            //         return (
            //             <div className="flex flex-wrap items-center gap-1.5">
            //                 {breakdown.slice(0, 3).map((item) => (
            //                     <span key={`${item.class_code}-${item.count}`} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
            //                         {item.class_code}: {item.count}
            //                     </span>
            //                 ))}
            //                 {breakdown.length > 3 && (
            //                     <span className="text-xs font-medium text-slate-500">+{breakdown.length - 3} more</span>
            //                 )}
            //             </div>
            //         );
            //     },
            // },
            {
                key: "actions",
                title: "Actions",
                render: (row: CourseItem) => (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => onEditCourse(row)}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            onClick={() => onDeleteCourse(row)}
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    </div>
                ),
            },
        ],
        [canUpdateCourse],
    );

    const totalCourses = courses.length;
    const semesterCount = new Set(courses.map((item) => item.semester?.trim()).filter(Boolean)).size;
    const teacherCount = new Set(courses.map((item) => item.teacher_code ?? String(item.teacher_id ?? "")).filter(Boolean)).size;

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <img src={ClassIcons} width={80} height={80} alt="" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Course Class Management</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Manage course classes used by session scheduling and realtime attendance.</p>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article
                        className="interactive-card cursor-pointer rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm"
                        onClick={() => router.push("/sessions")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push("/sessions");
                            }
                        }}
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><BookCopy className="h-4 w-4" /> Course Classes</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalCourses}</p>
                        <p className="mt-1 text-xs font-medium text-blue-700">Open session scheduling</p>
                    </article>
                    <article
                        className="interactive-card cursor-pointer rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm"
                        onClick={() => router.push("/attendance?source=courses")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push("/attendance?source=courses");
                            }
                        }}
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><Layers3 className="h-4 w-4" /> Semesters</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{semesterCount}</p>
                        <p className="mt-1 text-xs font-medium text-indigo-700">Open attendance by session</p>
                    </article>
                    <article
                        className="interactive-card cursor-pointer rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm"
                        onClick={() => router.push("/students")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push("/students");
                            }
                        }}
                    >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><SquareUserRound className="h-4 w-4" /> Teachers</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{teacherCount}</p>
                        <p className="mt-1 text-xs font-medium text-cyan-700">Go to student attendance list</p>
                    </article>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="ml-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List Course Class</p>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => {
                            setModalError(null);
                            setEditingCourseId(null);
                            setForm({ course_code: "", course_name: "", semester: "", home_class_id: undefined });
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Course Class
                    </button>
                </div>

                {/* <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Current backend supports listing and creating course classes. Edit/Delete will be enabled after backend update APIs are added.
                </div> */}

                <div className="mt-4 md:rounded-2xl md:border md:border-slate-200 md:bg-slate-50 md:p-3 md:shadow-sm">
                    {isLoading && <LoadingState label="Loading course class table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={courses} emptyText="No course classes found" />}
                </div>
            </section>

            <Modal
                open={isModalOpen}
                title={editingCourseId ? "Edit Course Class" : "Create Course Class"}
                onClose={() => {
                    setModalError(null);
                    setEditingCourseId(null);
                    setIsModalOpen(false);
                }}
            >
                <form className="grid gap-3" onSubmit={onSubmit}>
                    {modalError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                            {modalError}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-code">
                            Course Class Code
                        </label>
                        <input
                            id="course-code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.course_code}
                            onChange={(e) => setForm((prev) => ({ ...prev, course_code: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-name">
                            Course Name
                        </label>
                        <input
                            id="course-name"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.course_name}
                            onChange={(e) => setForm((prev) => ({ ...prev, course_name: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-home-class">
                            Linked Home Class
                        </label>
                        <select
                            id="course-home-class"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.home_class_id ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, home_class_id: e.target.value ? Number(e.target.value) : undefined }))}
                        >
                            <option value="">Select home class</option>
                            {homeClasses.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.class_code ?? `Class #${item.id}`} - {item.major ?? "Major"}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="course-semester">
                            Semester
                        </label>
                        <input
                            id="course-semester"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.semester ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, semester: e.target.value }))}
                            placeholder="e.g. 2026-Spring"
                        />
                    </div>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating}
                    >
                        {isCreating ? "Saving..." : editingCourseId ? "Update Course Class" : "Create Course Class"}
                    </button>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(pendingDeleteCourse)}
                title="Delete Course Class"
                message={`Are you sure you want to delete ${pendingDeleteCourse?.course_code ?? `Course #${pendingDeleteCourse?.id ?? ""}`}?`}
                onConfirm={onConfirmDeleteCourse}
                onClose={() => {
                    if (!isDeleting) {
                        setPendingDeleteCourse(null);
                    }
                }}
                confirmText="Delete Course Class"
                isLoading={isDeleting}
            />
        </main>
    );
}
