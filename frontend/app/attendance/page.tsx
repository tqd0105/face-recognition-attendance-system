"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Clock3, Eye, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { WebcamLiveIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { attendanceService } from "@/services/attendance.service";
import type { AttendanceItem } from "@/types/models";

export default function AttendancePage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { user } = useAuth();
    const canManageAttendance = user.role === "teacher" && Boolean(user.token);
    const canViewAttendance = user.role === "teacher" || user.role === "student";

    const [sessionId, setSessionId] = useState("1");
    const [minSimilarity, setMinSimilarity] = useState(0.8);
    const [studentId, setStudentId] = useState("");
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [events, setEvents] = useState<AttendanceItem[]>(() => attendanceService.getLocal().slice(0, 20));
    const [popupText, setPopupText] = useState<string | null>(null);
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
            if (timerRef.current) {
                window.clearInterval(timerRef.current);
                timerRef.current = null;
            }
            isMounted = false;
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (!videoRef.current || !streamRef.current) {
            return;
        }

        videoRef.current.srcObject = streamRef.current;
        void videoRef.current.play().catch(() => {
            // Ignore play interruption while switching focus mode.
        });
    }, [isFocusMode]);

    function refreshEvents() {
        const latest = attendanceService.getLocal().slice(0, 20);
        setEvents(latest);
    }

    async function createCheckIn() {
        if (!canManageAttendance) {
            setPopupText("Teacher role is required to create check-in.");
            return;
        }
        if (!sessionId.trim() || !studentId.trim()) {
            setPopupText("Please enter session ID and student ID.");
            return;
        }

        try {
            await attendanceService.mark({
                session_id: Number(sessionId),
                student_id: Number(studentId),
                status: "present",
                confidence_score: minSimilarity,
            });
            setPopupText("Check-in success");
            refreshEvents();
        } catch (err) {
            const message = err instanceof Error ? err.message : "Check-in failed";
            setPopupText(message);
        }

        window.setTimeout(() => setPopupText(null), 1800);
    }

    function startScanning() {
        if (isScanning || !canViewAttendance) {
            return;
        }

        setIsFocusMode(true);
        setIsScanning(true);
        refreshEvents();
        timerRef.current = window.setInterval(() => {
            refreshEvents();
        }, 1600);
    }

    function stopScanning() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsScanning(false);
    }

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                <header className="motion-hero rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-5 text-white shadow-lg sm:p-6">
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[auto_1fr]">
                        <div className="flex justify-center sm:justify-start">
                            <Image src={WebcamLiveIcons} width={200} height={200} alt="Realtime attendance" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em]">Realtime Attendance</p>
                            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Scan Live Camera Frames</h1>
                            <p className="mt-2 text-sm text-slate-100 sm:text-base">
                                Session-oriented monitor with controlled permissions for teacher and student modes.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="motion-stagger mt-4 grid gap-3 md:grid-cols-3">
                    <article className="interactive-card rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm" data-role={user.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">Role</p>
                        <p className="mt-2 text-sm font-bold text-indigo-900">{user.role.toUpperCase()}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-blue-100 bg-blue-50 p-4 shadow-sm" data-role={user.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">View permission</p>
                        <p className="mt-2 text-sm font-bold text-blue-900">{canViewAttendance ? "Enabled" : "Blocked"}</p>
                    </article>
                    <article className="interactive-card rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" data-role={user.role}>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">Write permission</p>
                        <p className="mt-2 text-sm font-bold text-slate-900">{canManageAttendance ? "Teacher access" : "Read-only"}</p>
                    </article>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                    {!isFocusMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                                <video ref={videoRef} className="h-[220px] w-full object-cover sm:h-[280px] lg:h-[320px]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                                {popupText && (
                                    <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                        {popupText}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-900 shadow-sm">
                            Focus mode is active. Camera preview is displayed in modal.
                        </div>
                    )}

                    <div className="grid gap-3">
                        <div className="motion-hero grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="session-id">
                                    Session ID
                                </label>
                                <div className="relative mt-1">
                                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="session-id"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="similarity">
                                    Min Similarity
                                </label>
                                <div className="relative mt-1">
                                    <ShieldCheck className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        id="similarity"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        type="number"
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        value={minSimilarity}
                                        onChange={(e) => setMinSimilarity(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                                    Student ID (check-in)
                                </label>
                                <input
                                    id="student-id"
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    placeholder="e.g. 1"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <button
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={user.role}
                                onClick={startScanning}
                                disabled={isScanning || !sessionId.trim() || !canViewAttendance}
                                type="button"
                            >
                                <Eye className="h-5 w-5" />
                                Start
                            </button>
                            <button
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={user.role}
                                onClick={stopScanning}
                                disabled={!isScanning}
                                type="button"
                            >
                                Stop
                            </button>
                            <button
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                data-role={canManageAttendance ? "teacher" : user.role}
                                onClick={createCheckIn}
                                disabled={!canManageAttendance}
                                type="button"
                            >
                                Create Check-in
                            </button>
                        </div>
                    </div>
                </div>

                {!canViewAttendance && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-3 text-sm text-amber-900 shadow-sm">
                        <p className="inline-flex items-center gap-2 font-semibold">
                            <ShieldAlert className="h-4 w-4" />
                            Access blocked: You are in guest mode.
                        </p>
                        <p className="mt-1 inline-flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Please sign in as teacher or student.
                        </p>
                    </div>
                )}

                <section className="motion-hero mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <h2 className="text-base font-bold text-slate-900">Latest Events</h2>
                    {events.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-600">No events yet. Start scanning to receive updates.</p>
                    ) : (
                        <ul className="mt-3 grid gap-2">
                            {events.map((event) => (
                                <li
                                    key={event.id}
                                    className="grid gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm sm:grid-cols-[1fr_auto_auto_auto] sm:items-center"
                                >
                                    <strong className="text-slate-900">student_{event.student_id}</strong>
                                    <span className={event.status === "present" ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
                                        {event.status}
                                    </span>
                                    <span>sim={typeof event.confidence_score === "number" ? event.confidence_score.toFixed(2) : "-"}</span>
                                    <time className="text-slate-500">{new Date(event.check_in_time ?? event.created_at).toLocaleTimeString()}</time>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </section>

            {isFocusMode && (
                <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/65 px-4" role="dialog" aria-modal="true">
                    <div className="motion-modal-panel w-full max-w-6xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">Focus Mode</p>
                                <h2 className="text-lg font-bold text-slate-900">Attendance Camera</h2>
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
                                <video ref={videoRef} className="h-[42vh] w-full object-cover sm:h-[54vh]" autoPlay muted playsInline />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                                {popupText && (
                                    <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                        {popupText}
                                    </div>
                                )}
                            </div>

                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="session-id-focus">
                                        Session ID
                                    </label>
                                    <input
                                        id="session-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id-focus">
                                        Student ID
                                    </label>
                                    <input
                                        id="student-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentId}
                                        onChange={(e) => setStudentId(e.target.value)}
                                    />
                                </div>

                                <button
                                    className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                    onClick={createCheckIn}
                                    disabled={!canManageAttendance}
                                    type="button"
                                >
                                    Create Check-in
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
