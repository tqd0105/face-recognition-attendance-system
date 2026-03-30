"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, BookOpenCheck, Layers3, Building2, Pencil, Trash2 } from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { classService } from "@/services/class.service";
import type { ClassItem, CreateClassPayload } from "@/types/models";
import { ClassIcons } from "@/components/icons";

export default function ClassesPage() {
    const [classes, setClasses] = useState<ClassItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [editingClassId, setEditingClassId] = useState<number | null>(null);
    const [form, setForm] = useState<CreateClassPayload>({
        class_code: "",
        major: "",
        department: "",
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
        setModalError(null);

        if (!form.class_code?.trim()) {
            setModalError("Class code is required.");
            return;
        }
        if (!form.major?.trim()) {
            setModalError("Major is required.");
            return;
        }

        const normalizedCode = form.class_code.trim().toLowerCase();
        const duplicatedCode = classes.some((item) => item.id !== editingClassId && item.class_code?.trim().toLowerCase() === normalizedCode);
        if (duplicatedCode) {
            setModalError("Class code already exists. Please use another code.");
            return;
        }

        try {
            setIsCreating(true);
            setModalError(null);
            if (editingClassId) {
                await classService.update(editingClassId, form);
            } else {
                await classService.create(form);
            }
            await loadClasses();
            setIsModalOpen(false);
            setEditingClassId(null);
            setForm({ class_code: "", major: "", department: "" });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot create class";
            setModalError(message);
        } finally {
            setIsCreating(false);
        }
    }

    async function onDeleteClass(item: ClassItem) {
        const accepted = window.confirm(`Delete home class ${item.class_code ?? item.id}?`);
        if (!accepted) {
            return;
        }

        try {
            await classService.remove(item.id);
            await loadClasses();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot delete class";
            setError(message);
        }
    }

    function onEditClass(item: ClassItem) {
        setModalError(null);
        setEditingClassId(item.id);
        setForm({
            class_code: item.class_code ?? "",
            major: item.major ?? "",
            department: item.department ?? "",
        });
        setIsModalOpen(true);
    }

    const columns = useMemo(
        () => [
            { key: "code", title: "Class Code", render: (row: ClassItem) => row.class_code ?? "-" },
            { key: "major", title: "Major", render: (row: ClassItem) => row.major ?? "-" },
            { key: "department", title: "Department", render: (row: ClassItem) => row.department ?? "-" },
            {
                key: "actions",
                title: "Actions",
                render: (row: ClassItem) => (
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            onClick={() => onEditClass(row)}
                        >
                            <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                            onClick={() => onDeleteClass(row)}
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    </div>
                ),
            },
        ],
        [],
    );

    const totalClasses = classes.length;
    const majorCount = new Set(classes.map((item) => item.major?.trim()).filter(Boolean)).size;
    const departmentCount = new Set(classes.map((item) => item.department?.trim()).filter(Boolean)).size;

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="flex items-center gap-2 motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                    <div>
                        <img src={ClassIcons} width={80} height={80} alt="" />
                    </div>
                    <div>
                        <h1 className="mt-2 text-3xl font-bold sm:text-3xl">Home Class Management</h1>
                        <p className="mt-2 text-md text-slate-100 sm:text-base">Control class metadata, major grouping, and department mapping.</p>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700"><BookOpenCheck className="h-4 w-4" /> Home Classes</p>
                        <p className="mt-2 text-2xl font-bold text-blue-900">{totalClasses}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700"><Layers3 className="h-4 w-4" /> Majors</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-900">{majorCount}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-cyan-100 bg-cyan-50 p-4 shadow-sm">
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700"><Building2 className="h-4 w-4" /> Departments</p>
                        <p className="mt-2 text-2xl font-bold text-cyan-900">{departmentCount}</p>
                    </article>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <div>
                        <p className="ml-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">List Class</p>
                    </div>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        onClick={() => {
                            setModalError(null);
                            setEditingClassId(null);
                            setForm({ class_code: "", major: "", department: "" });
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Home Class
                    </button>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm">
                    {isLoading && <LoadingState label="Loading home class table..." />}
                    {!isLoading && error && <ErrorState label={error} />}
                    {!isLoading && !error && <DataTable columns={columns} rows={classes} emptyText="No home classes found" />}
                </div>
            </section>

            <Modal
                open={isModalOpen}
                title={editingClassId ? "Edit Home Class" : "Add Home Class"}
                onClose={() => {
                    setModalError(null);
                    setEditingClassId(null);
                    setIsModalOpen(false);
                }}
            >
                <form className="grid gap-3" onSubmit={onCreateClass}>
                    {modalError && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                            {modalError}
                        </div>
                    )}
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="class-code">
                            Class Code
                        </label>
                        <input
                            id="class-code"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.class_code ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, class_code: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="major">
                            Major
                        </label>
                        <input
                            id="major"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.major ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
                            required
                        />
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-slate-700" htmlFor="department">
                            Department
                        </label>
                        <input
                            id="department"
                            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            value={form.department ?? ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
                        />
                    </div>
                    <button
                        type="submit"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={isCreating}
                    >
                        {isCreating ? "Saving..." : editingClassId ? "Update Home Class" : "Create Home Class"}
                    </button>
                </form>
            </Modal>
        </main>
    );
}
