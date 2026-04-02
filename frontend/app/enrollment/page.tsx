"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { WebcamIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { biometricService } from "@/services/biometric.service";
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
    const [selectedStudentId, setSelectedStudentId] = useState("");
    const [homeClassCode, setHomeClassCode] = useState("");
    const [students, setStudents] = useState<Student[]>([]);
    const [homeClasses, setHomeClasses] = useState<ClassItem[]>([]);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [isCheckingFaceStatus, setIsCheckingFaceStatus] = useState(false);
    const [hasFaceEnrolled, setHasFaceEnrolled] = useState<boolean | null>(null);

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

    const classIdToCodeMap = useMemo(() => {
        const map = new Map<number, string>();
        homeClasses.forEach((item) => {
            if (item.id && item.class_code) {
                map.set(Number(item.id), item.class_code);
            }
        });
        return map;
    }, [homeClasses]);

    const sortedStudents = useMemo(() => {
        return [...students].sort((a, b) => {
            const left = (a.student_code ?? a.name ?? "").toLowerCase();
            const right = (b.student_code ?? b.name ?? "").toLowerCase();
            return left.localeCompare(right);
        });
    }, [students]);

    function onSelectStudent(studentId: string) {
        setSelectedStudentId(studentId);
        if (!studentId) {
            setStudentCode("");
            setStudentName("");
            setHomeClassCode("");
            setHasFaceEnrolled(null);
            return;
        }

        const picked = students.find((item) => String(item.id) === studentId);
        if (!picked) {
            return;
        }

        setStudentCode(picked.student_code ?? "");
        setStudentName(picked.name ?? "");

        const classId = Number(picked.home_class_id ?? picked.class_id ?? 0);
        if (classId > 0) {
            setHomeClassCode(classIdToCodeMap.get(classId) ?? "");
        } else {
            setHomeClassCode("");
        }
    }

    useEffect(() => {
        async function checkFaceStatus() {
            if (!selectedStudentId) {
                setHasFaceEnrolled(null);
                return;
            }

            const studentId = Number(selectedStudentId);
            if (!Number.isFinite(studentId) || studentId <= 0) {
                setHasFaceEnrolled(null);
                return;
            }

            try {
                setIsCheckingFaceStatus(true);
                const result = await biometricService.checkEnrollment(studentId);
                setHasFaceEnrolled(result.hasFaceData);
            } catch {
                setHasFaceEnrolled(null);
            } finally {
                setIsCheckingFaceStatus(false);
            }
        }

        void checkFaceStatus();
    }, [selectedStudentId]);

    useEffect(() => {
        if (!videoRef.current || !streamRef.current) {
            return;
        }

        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => {
            // Ignore play interruption while switching focus mode.
        });
    }, [isFocusMode]);

    async function captureFaceSnapshot(): Promise<Blob | null> {
        const video = videoRef.current;
        if (!video) {
            return null;
        }

        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
            return null;
        }

        context.drawImage(video, 0, 0, width, height);

        return await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
        });
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!hasEnrollmentAccess) {
            setNotice("Teacher login is required for enrollment.");
            return;
        }

        if (!selectedStudentId) {
            setNotice("Please select a student from the list.");
            return;
        }

        if (!isCameraReady) {
            setNotice("Camera is not ready. Please allow camera permission and try again.");
            return;
        }

        const normalizedClassCode = homeClassCode.trim().toLowerCase();
        const resolvedHomeClassId = normalizedClassCode ? classCodeMap.get(normalizedClassCode) : undefined;
        if (normalizedClassCode && !resolvedHomeClassId) {
            setNotice("Class code not found. Please select a valid class code.");
            return;
        }

        const matchedStudent = students.find((item) => String(item.id) === selectedStudentId);

        try {
            setIsSubmitting(true);
            setNotice(null);
            if (matchedStudent) {
                const currentClassId = Number(matchedStudent.home_class_id ?? matchedStudent.class_id ?? 0) || undefined;
                const shouldUpdateProfile = currentClassId !== resolvedHomeClassId;

                if (shouldUpdateProfile) {
                    const resolvedEmail = matchedStudent.email?.trim();
                    if (!resolvedEmail) {
                        setNotice("Selected student has no email. Please update email in Student Management first.");
                        return;
                    }

                    const normalizedName = matchedStudent.name?.trim() || studentName.trim();
                    await studentService.update(matchedStudent.id, {
                        student_code: matchedStudent.student_code?.trim() || studentCode.trim(),
                        name: normalizedName,
                        email: resolvedEmail,
                        home_class_id: resolvedHomeClassId,
                    });
                }

                const imageBlob = await captureFaceSnapshot();
                if (!imageBlob) {
                    setNotice("Cannot capture face image from camera. Please retry.");
                    return;
                }

                const fileBase = matchedStudent.student_code?.trim() || `student-${matchedStudent.id}`;
                await biometricService.enroll(matchedStudent.id, imageBlob, `${fileBase}-${Date.now()}.jpg`);

                setHasFaceEnrolled(true);
                setNotice("Face enrollment successful.");
            } else {
                setNotice("Selected student was not found. Please reload and try again.");
                return;
            }

            try {
                const data = await studentService.getAll();
                setStudents(data);
            } catch {
                // Ignore refresh failures; user-facing operation already succeeded.
            }
            setStudentCode("");
            setStudentName("");
            setSelectedStudentId("");
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
                            <label className="text-sm font-semibold text-slate-700" htmlFor="student-select">
                                Student
                            </label>
                            <select
                                id="student-select"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={selectedStudentId}
                                onChange={(e) => onSelectStudent(e.target.value)}
                            >
                                <option value="">Select student</option>
                                {sortedStudents.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.student_code ?? `Student #${item.id}`} - {item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-slate-700" htmlFor="student-name-preview">
                                Student Name
                            </label>
                            <input
                                id="student-name-preview"
                                className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                value={studentName}
                                readOnly
                                placeholder="Choose student to view"
                            />
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-slate-700">Face Status</p>
                            <div className="mt-1">
                                {isCheckingFaceStatus ? (
                                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        Checking...
                                    </span>
                                ) : hasFaceEnrolled === true ? (
                                    <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                        Enrolled
                                    </span>
                                ) : hasFaceEnrolled === false ? (
                                    <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                        Not Enrolled
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                        Unknown
                                    </span>
                                )}
                            </div>
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
                                disabled={isSubmitting || !hasEnrollmentAccess || !isCameraReady}
                                type="submit"
                            >
                                <CheckCircle2 className="h-5 w-5" />
                                {isSubmitting ? "Submitting..." : "Capture and Enroll"}
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

                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 shadow-sm">
                    Enrollment uses current camera frame and uploads directly to biometrics API.
                </div>
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
                                        Student
                                    </label>
                                    <select
                                        id="student-code-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={selectedStudentId}
                                        onChange={(e) => onSelectStudent(e.target.value)}
                                    >
                                        <option value="">Select student</option>
                                        {sortedStudents.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.student_code ?? `Student #${item.id}`} - {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-name-focus">
                                        Student Name
                                    </label>
                                    <input
                                        id="student-name-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentName}
                                        readOnly
                                        placeholder="Choose student to view"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-slate-700">Face Status</p>
                                    <div className="mt-1">
                                        {isCheckingFaceStatus ? (
                                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                Checking...
                                            </span>
                                        ) : hasFaceEnrolled === true ? (
                                            <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                Enrolled
                                            </span>
                                        ) : hasFaceEnrolled === false ? (
                                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                                Not Enrolled
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                                Unknown
                                            </span>
                                        )}
                                    </div>
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
                                    disabled={isSubmitting || !hasEnrollmentAccess || !isCameraReady}
                                    type="submit"
                                >
                                    <CheckCircle2 className="h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Capture and Enroll"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
