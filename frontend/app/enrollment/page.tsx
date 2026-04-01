"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, UserRound, X } from "lucide-react";
import { WebcamIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { classService } from "@/services/class.service";
import { studentService } from "@/services/student.service";
import type { ClassItem, Student } from "@/types/models";

export default function EnrollmentPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { user } = useAuth();
    const hasEnrollmentAccess = user.role === "teacher" && Boolean(user.token);

    const [studentCode, setStudentCode] = useState("");
    const [studentName, setStudentName] = useState("");
    const [homeClassCode, setHomeClassCode] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [homeClasses, setHomeClasses] = useState<ClassItem[]>([]);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function initCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });

                if (!isMounted) {
                    stream.getTracks().forEach((track) => track.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    await videoRef.current.play();
                    setIsCameraReady(true);
                }
            } catch {
                setIsCameraReady(false);
            }
        }

        void initCamera();

        return () => {
            isMounted = false;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        async function loadStudents() {
            try {
                const data = await studentService.getAll();
                setStudents(data);
            } catch {
                // Ignore list load failures; server-side validation still applies.
            }
        }

        void loadStudents();

        async function loadHomeClasses() {
            try {
                const classes = await classService.getAll();
                setHomeClasses(classes);
            } catch {
                setHomeClasses([]);
            }
        }

        void loadHomeClasses();
    }, []);

    const classCodeMap = useMemo(() => {
        const map = new Map<string, number>();
        homeClasses.forEach((item) => {
            const code = item.class_code?.trim();
            if (code) {
                map.set(code.toLowerCase(), Number(item.id));
            }
        });
        return map;
    }, [homeClasses]);

    useEffect(() => {
        if (!videoRef.current || !streamRef.current) {
            return;
        }

        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => {
            // Ignore play interruption while switching focus mode.
        });
    }, [isFocusMode]);

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!hasEnrollmentAccess) {
            setNotice("Teacher login is required for enrollment.");
            return;
        }

        if (!studentCode.trim() || !studentName.trim()) {
            setNotice("Please enter student code and student name.");
            return;
        }

        const normalizedClassCode = homeClassCode.trim().toLowerCase();
        const resolvedHomeClassId = normalizedClassCode ? classCodeMap.get(normalizedClassCode) : undefined;
        if (normalizedClassCode && !resolvedHomeClassId) {
            setNotice("Class code not found. Please select a valid class code.");
            return;
        }

        const normalizedCode = studentCode.trim().toLowerCase();
        const normalizedName = studentName.trim();
        const matchedStudent = students.find((item) => item.student_code?.trim().toLowerCase() === normalizedCode);

        try {
            setIsSubmitting(true);
            setNotice(null);
            if (matchedStudent) {
                await studentService.update(matchedStudent.id, {
                    student_code: studentCode.trim(),
                    name: normalizedName,
                    home_class_id: resolvedHomeClassId,
                });
                setNotice("Student already exists. Updated information and continued enrollment.");
            } else {
                await studentService.create({
                    student_code: studentCode.trim(),
                    name: normalizedName,
                    home_class_id: resolvedHomeClassId,
                });
                setNotice("Enrollment success.");
            }

            try {
                const data = await studentService.getAll();
                setStudents(data);
            } catch {
                // Ignore refresh failures; user-facing operation already succeeded.
            }
            setStudentCode("");
            setStudentName("");
            setHomeClassCode("");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Enrollment failed";
            setNotice(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-5 text-white shadow-lg sm:p-6">
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
                        <div className="flex justify-center sm:justify-start">
                            <Image src={WebcamIcons} width={200} height={200} alt="Enrollment" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Face Enrollment</p>
                            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Register Student Face</h1>
                            <p className="mt-2 text-sm text-slate-100 sm:text-base">
                                Register students and map them to classes for face recognition attendance.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
                    {!isFocusMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                                <video ref={videoRef} className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[320px]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900 shadow-sm">
                            Focus mode is active. Camera preview is displayed in modal.
                        </div>
                    )}

                    <form className="motion-hero grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={onSubmit}>
                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="student-code">
                                Student Code
                            </label>
                            <div className="relative mt-1">
                                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    id="student-code"
                                    className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value)}
                                    placeholder="e.g. B21DCCN001"
                                    autoComplete="off"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="student-name">
                                Student Name
                            </label>
                            <input
                                id="student-name"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={studentName}
                                onChange={(e) => setStudentName(e.target.value)}
                                placeholder="e.g. Nguyen Van A"
                                autoComplete="off"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="home-class-code">
                                Class Code
                            </label>
                            <select
                                id="home-class-code"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={homeClassCode}
                                onChange={(e) => setHomeClassCode(e.target.value)}
                            >
                                <option value="">No class</option>
                                {homeClasses.map((item) => (
                                    <option key={item.id} value={item.class_code ?? ""}>
                                        {item.class_code ?? `Class #${item.id}`} - {item.major ?? "Major"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={hasEnrollmentAccess ? "teacher" : user.role}
                                disabled={isSubmitting || !hasEnrollmentAccess}
                                type="submit"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                            </button>

                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                onClick={() => setIsFocusMode(true)}
                            >
                                Focus Camera
                            </button>
                        </div>
                    </form>
                </div>

                {!hasEnrollmentAccess && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        <p className="inline-flex items-center gap-2 font-semibold">
                            <ShieldAlert className="h-4 w-4" />
                            Access blocked: Enrollment is teacher-only.
                        </p>
                        <p className="mt-1 inline-flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Current mode: <strong>{user.role}</strong>. Please sign in as teacher.
                        </p>
                    </div>
                )}

                {notice && (
                    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 shadow-sm">
                        {notice}
                    </div>
                )}
            </section>

            {isFocusMode && (
                <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/65 px-4" role="dialog" aria-modal="true">
                    <div className="motion-modal-panel w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Focus Mode</p>
                                <h2 className="text-lg font-bold text-slate-900">Enrollment Camera</h2>
                            </div>
                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
                                onClick={() => setIsFocusMode(false)}
                            >
                                <X className="h-4 w-4" /> Close
                            </button>
                        </div>

                        <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
                                <video ref={videoRef} className="h-[42vh] w-full object-cover sm:h-[52vh]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                            </div>

                            <form className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3" onSubmit={onSubmit}>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-code-focus">
                                        Student Code
                                    </label>
                                    <input
                                        id="student-code-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentCode}
                                        onChange={(e) => setStudentCode(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-name-focus">
                                        Student Name
                                    </label>
                                    <input
                                        id="student-name-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="home-class-code-focus">
                                        Class Code
                                    </label>
                                    <select
                                        id="home-class-code-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={homeClassCode}
                                        onChange={(e) => setHomeClassCode(e.target.value)}
                                    >
                                        <option value="">No class</option>
                                        {homeClasses.map((item) => (
                                            <option key={item.id} value={item.class_code ?? ""}>
                                                {item.class_code ?? `Class #${item.id}`} - {item.major ?? "Major"}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={isSubmitting || !hasEnrollmentAccess}
                                    type="submit"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
