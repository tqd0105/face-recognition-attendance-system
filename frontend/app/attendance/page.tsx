"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Clock3, Eye, ShieldCheck, X } from "lucide-react";
import { WebcamLiveIcons } from "@/components/icons";
import { useAuth } from "@/hooks/useAuth";
import { attendanceService } from "@/services/attendance.service";
import { courseService } from "@/services/course.service";
import { studentService } from "@/services/student.service";
import { sessionService } from "@/services/session.service";
import type { AttendanceItem, RealtimeDetection, Session, Student } from "@/types/models";

export default function AttendancePage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const timerRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const noFaceFrameCountRef = useRef(0);
    const isScanningRef = useRef(false);
    const sessionIdRef = useRef("");
    const isRecognizingRef = useRef(false);
    const checkedStudentIdsRef = useRef<Set<number>>(new Set());

    const { user } = useAuth();
    const canManageAttendance = user.role === "teacher" && Boolean(user.token);
    const canViewAttendance = user.role === "teacher" || user.role === "student";

    const [sessionId, setSessionId] = useState("");
    const [studentCode, setStudentCode] = useState("");
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [events, setEvents] = useState<AttendanceItem[]>(() => attendanceService.getLocal().slice(0, 20));
    const [popupText, setPopupText] = useState<string | null>(null);
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [lastEventId, setLastEventId] = useState<string | null>(null);
    const [detections, setDetections] = useState<RealtimeDetection[]>([]);
    const [isRecognizing, setIsRecognizing] = useState(false);
    const [scanStatusText, setScanStatusText] = useState<string>("Idle");
    const [isAttendanceSynced, setIsAttendanceSynced] = useState(false);
    const [checkedStudentIds, setCheckedStudentIds] = useState<number[]>([]);
    const [lastSeenByStudent, setLastSeenByStudent] = useState<Record<string, string>>({});

    const realtimeThreshold = 0.8;
    const oneFaceThreshold = 0.8;
    const scanIntervalMs = 420;

    const selectedStudent = students.find((item) => item.student_code?.trim().toLowerCase() === studentCode.trim().toLowerCase());
    const selectedStudentId = Number(selectedStudent?.id ?? 0);
    const selectedStudentAlreadyCheckedIn = selectedStudentId > 0 && checkedStudentIds.includes(selectedStudentId);

    useEffect(() => {
        isScanningRef.current = isScanning;
    }, [isScanning]);

    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    useEffect(() => {
        isRecognizingRef.current = isRecognizing;
    }, [isRecognizing]);

    function getStudentDisplayName(studentId: number): string {
        const matched = students.find((item) => Number(item.id) === Number(studentId));
        if (!matched) {
            return `Student #${studentId}`;
        }
        const code = matched.student_code ?? `Student #${matched.id}`;
        return `Student: ${matched.name}`;
    }

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

    useEffect(() => {
        async function loadSessions() {
            try {
                const courses = await courseService.getAll();
                const courseIds = courses.map((item) => Number(item.id)).filter((id) => Number.isFinite(id) && id > 0);
                if (courseIds.length === 0) {
                    sessionService.clearCache();
                    setAvailableSessions([]);
                    setSessionId("");
                    return;
                }
                const data = await sessionService.getAll(courseIds);
                const items = data.slice().sort((a, b) => Number(b.id) - Number(a.id));
                setAvailableSessions(items);
                if (items.length > 0) {
                    setSessionId(String(items[0].id));
                } else {
                    setSessionId("");
                }
            } catch {
                setAvailableSessions([]);
                setSessionId("");
            }
        }

        void loadSessions();
    }, []);

    useEffect(() => {
        async function loadStudents() {
            try {
                const data = await studentService.getAll();
                setStudents(data);
            } catch {
                setStudents([]);
            }
        }

        void loadStudents();
    }, []);

    useEffect(() => {
        setIsAttendanceSynced(false);
        if (!sessionId.trim()) {
            checkedStudentIdsRef.current = new Set();
            setCheckedStudentIds([]);
            setEvents(attendanceService.getLocal().slice(0, 20));
            setIsAttendanceSynced(true);
            return;
        }

        void refreshEvents(sessionId)
            .finally(() => {
                setIsAttendanceSynced(true);
            });
    }, [sessionId]);

    async function refreshEvents(sessionIdOverride?: string) {
        const activeSessionId = (sessionIdOverride ?? sessionId).trim();
        if (!activeSessionId) {
            checkedStudentIdsRef.current = new Set();
            setCheckedStudentIds([]);
            setEvents(attendanceService.getLocal().slice(0, 20));
            return;
        }

        try {
            const latest = await attendanceService.getBySession(Number(activeSessionId));
            const checkedIds = latest
                .map((item) => Number(item.student_id))
                .filter((id) => Number.isFinite(id) && id > 0);
            checkedStudentIdsRef.current = new Set(
                latest
                    .map((item) => Number(item.student_id))
                    .filter((id) => Number.isFinite(id) && id > 0),
            );
            setCheckedStudentIds(checkedIds);
            setEvents(latest.slice(0, 20));
            setLastSeenByStudent((prev) => {
                const next = { ...prev };
                latest.forEach((item) => {
                    const sid = Number(item.student_id);
                    const ssid = Number(item.session_id);
                    if (Number.isFinite(sid) && sid > 0) {
                        const key = getSeenKey(ssid, sid);
                        next[key] = mergeLatestTime(next[key], item.check_in_time ?? item.created_at) ?? item.check_in_time;
                    }
                });
                return next;
            });

            const newest = latest[0];
            if (isScanning && newest && String(newest.id) !== lastEventId) {
                const studentLabel = getStudentDisplayName(newest.student_id);
                setPopupText(`${studentLabel} | ${newest.status.toUpperCase()}`);
                setLastEventId(String(newest.id));
                window.setTimeout(() => setPopupText(null), 2000);
            }
        } catch {
            checkedStudentIdsRef.current = new Set();
            setCheckedStudentIds([]);
            setEvents(attendanceService.getLocal().slice(0, 20));
        }
    }

    function captureCurrentFrame(): string | null {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
            return null;
        }

        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;
        if (width <= 0 || height <= 0) {
            return null;
        }

        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
            return null;
        }

        context.drawImage(video, 0, 0, width, height);
        return canvas.toDataURL("image/jpeg", 0.84);
    }

    function isFrameLikelyInvalid(): boolean {
        const canvas = canvasRef.current;
        if (!canvas) {
            return true;
        }

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            return true;
        }

        const { width, height } = canvas;
        if (width <= 0 || height <= 0) {
            return true;
        }

        const imageData = context.getImageData(0, 0, width, height).data;
        let count = 0;
        let sum = 0;
        let sumSq = 0;

        const step = Math.max(Math.floor((width * height) / 2000), 40);
        for (let i = 0; i < imageData.length; i += 4 * step) {
            const r = imageData[i] ?? 0;
            const g = imageData[i + 1] ?? 0;
            const b = imageData[i + 2] ?? 0;
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            sum += lum;
            sumSq += lum * lum;
            count += 1;
        }

        if (count === 0) {
            return true;
        }

        const mean = sum / count;
        const variance = sumSq / count - mean * mean;

        return mean < 18 || variance < 12;
    }

    function renderDetectionLabel(item: RealtimeDetection): string {
        if (item.status === "matched") {
            const code = item.student_code ?? "Unknown";
            return `${code} - ${item.name} (${item.similarity.toFixed(2)})`;
        }
        if (item.status === "rejected") {
            return item.reason ?? "Rejected";
        }
        return item.reason ?? "Unknown";
    }

    function detectionClassName(item: RealtimeDetection): string {
        if (item.status === "matched") {
            return "border-emerald-300 text-emerald-100";
        }
        if (item.status === "rejected") {
            return "border-amber-300 text-amber-100";
        }
        return "border-rose-300 text-rose-100";
    }

    function detectionTagClassName(item: RealtimeDetection): string {
        if (item.status === "matched") {
            return "bg-emerald-500/90 text-white";
        }
        if (item.status === "rejected") {
            return "bg-amber-500/90 text-slate-950";
        }
        return "bg-rose-600/90 text-white";
    }

    function renderDetectionOverlay(item: RealtimeDetection, key: string) {
        return (
            <div
                key={key}
                className={`pointer-events-none absolute rounded-[4px] border-2 ${detectionClassName(item)} bg-transparent transition-[left,top,width,height] duration-150 ease-linear`}
                style={bboxToStyle(item.bbox)}
            >
                <span className={`absolute -top-7 left-0 whitespace-nowrap rounded px-2 py-1 text-[11px] font-semibold shadow ${detectionTagClassName(item)}`}>
                    {renderDetectionLabel(item)}
                </span>

                <span className="absolute left-0 top-0 h-3 w-3 border-l-2 border-t-2" />
                <span className="absolute right-0 top-0 h-3 w-3 border-r-2 border-t-2" />
                <span className="absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2" />
                <span className="absolute bottom-0 right-0 h-3 w-3 border-b-2 border-r-2" />

                <span className="absolute left-1/2 top-0 h-full -translate-x-1/2 border-l border-dashed opacity-60" />
                <span className="absolute top-1/2 left-0 w-full -translate-y-1/2 border-t border-dashed opacity-60" />
                <span className="absolute left-0 top-0 h-full w-full opacity-40" style={{ backgroundImage: "linear-gradient(to bottom right, transparent 49%, currentColor 50%, transparent 51%), linear-gradient(to top right, transparent 49%, currentColor 50%, transparent 51%)" }} />
            </div>
        );
    }

    function bboxToStyle(bbox: number[]) {
        const video = videoRef.current;
        if (!video || bbox.length < 4) {
            return { display: "none" } as const;
        }

        const [x1, y1, x2, y2] = bbox;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const cw = video.clientWidth;
        const ch = video.clientHeight;
        if (!vw || !vh || !cw || !ch) {
            return { display: "none" } as const;
        }

        const scale = Math.min(cw / vw, ch / vh);
        const renderWidth = vw * scale;
        const renderHeight = vh * scale;
        const offsetX = (cw - renderWidth) / 2;
        const offsetY = (ch - renderHeight) / 2;

        return {
            left: `${offsetX + x1 * scale}px`,
            top: `${offsetY + y1 * scale}px`,
            width: `${Math.max((x2 - x1) * scale, 2)}px`,
            height: `${Math.max((y2 - y1) * scale, 2)}px`,
        };
    }

    function formatEventDateTime(value?: string): string {
        if (!value) {
            return "-";
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat("en-GB", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            timeZone: "Asia/Ho_Chi_Minh",
            timeZoneName: "short",
        }).format(parsed);
    }

    function formatConfidence(value?: number): string {
        if (typeof value !== "number" || !Number.isFinite(value)) {
            return "N/A";
        }
        return `${(value * 100).toFixed(1)}%`;
    }

    function mergeLatestTime(currentIso?: string, nextIso?: string): string | undefined {
        if (!nextIso) {
            return currentIso;
        }
        if (!currentIso) {
            return nextIso;
        }

        const currentTs = new Date(currentIso).getTime();
        const nextTs = new Date(nextIso).getTime();
        if (Number.isNaN(currentTs) || Number.isNaN(nextTs)) {
            return nextIso;
        }

        return nextTs >= currentTs ? nextIso : currentIso;
    }

    function getSeenKey(sessionValue: number | string, studentValue: number | string): string {
        return `${sessionValue}:${studentValue}`;
    }

    function formatSessionWindow(event: AttendanceItem): string {
        const parts: string[] = [];
        if (event.session_date) {
            parts.push(String(event.session_date));
        }
        if (event.session_start_time || event.session_end_time) {
            parts.push(`${event.session_start_time ?? "--:--"} - ${event.session_end_time ?? "--:--"}`);
        }
        return parts.length > 0 ? parts.join(" | ") : "N/A";
    }

    async function scanRealtimeFrame() {
        const activeSessionId = sessionIdRef.current.trim();
        if (!isScanningRef.current || !activeSessionId || isRecognizingRef.current) {
            return;
        }

        if (!videoRef.current || videoRef.current.readyState < 2) {
            setScanStatusText("Camera stream is not ready");
            return;
        }

        const imageBase64 = captureCurrentFrame();
        if (!imageBase64) {
            setScanStatusText("Cannot capture camera frame");
            return;
        }

        if (isFrameLikelyInvalid()) {
            setDetections([]);
            setScanStatusText("Frame too dark/blocked. Please do not cover the screen and improve lighting.");
            return;
        }

        try {
            setIsRecognizing(true);
            isRecognizingRef.current = true;
            const result = await attendanceService.recognizeRealtime({
                session_id: Number(activeSessionId),
                image_base64: imageBase64,
                min_similarity: realtimeThreshold,
            });

            // Ignore in-flight results that return after user pressed Stop.
            if (!isScanningRef.current || sessionIdRef.current.trim() !== activeSessionId) {
                return;
            }

            const nextDetections = Array.isArray(result.detections) ? result.detections : [];
            if (nextDetections.length > 0) {
                noFaceFrameCountRef.current = 0;
                setDetections(nextDetections);
                const nowIso = new Date().toISOString();
                setLastSeenByStudent((prev) => {
                    const next = { ...prev };
                    nextDetections.forEach((item) => {
                        const sid = Number(item.student_id ?? 0);
                        if (Number.isFinite(sid) && sid > 0) {
                            const key = getSeenKey(activeSessionId, sid);
                            next[key] = mergeLatestTime(next[key], nowIso) ?? nowIso;
                        }
                    });
                    return next;
                });
            } else {
                noFaceFrameCountRef.current += 1;
                if (noFaceFrameCountRef.current >= 3) {
                    setDetections([]);
                }
            }

            const matchedCount = nextDetections.filter((item) => item.status === "matched").length;
            if (nextDetections.length === 0) {
                setScanStatusText("No face detected in current frame");
            } else if (matchedCount > 0) {
                setScanStatusText(`Detected ${nextDetections.length} face(s), matched ${matchedCount}`);
            } else {
                setScanStatusText(`Detected ${nextDetections.length} face(s), no valid match`);
            }

            const firstRejected = nextDetections.find((item) => item.status !== "matched" && item.reason);
            if (firstRejected?.reason) {
                setPopupText(firstRejected.reason);
                window.setTimeout(() => setPopupText(null), 1600);
            }

            if (Array.isArray(result.checked_in) && result.checked_in.length > 0) {
                await refreshEvents(activeSessionId);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Realtime recognize failed";
            setPopupText(message);
            setScanStatusText(message);
            window.setTimeout(() => setPopupText(null), 1600);
        } finally {
            setIsRecognizing(false);
            isRecognizingRef.current = false;
        }
    }

    async function createCheckIn() {
        if (!canManageAttendance) {
            setPopupText("Teacher role is required to create check-in.");
            return;
        }
        if (!sessionId.trim()) {
            setPopupText("Please select a session before check-in.");
            return;
        }

        if (!studentCode.trim()) {
            setPopupText("Please select a student before single-face check-in.");
            return;
        }

        if (!isAttendanceSynced) {
            setPopupText("Syncing attendance records. Please wait a moment and try again.");
            return;
        }

        const resolvedStudentId = selectedStudent?.id;
        if (!resolvedStudentId) {
            setPopupText("Student code not found. Please select a valid code.");
            return;
        }

        if (checkedStudentIdsRef.current.has(Number(resolvedStudentId))) {
            setPopupText(`${getStudentDisplayName(Number(resolvedStudentId))} already checked in. Please avoid duplicate check-in.`);
            window.setTimeout(() => setPopupText(null), 2000);
            return;
        }

        try {
            const imageBase64 = captureCurrentFrame();
            if (!imageBase64) {
                setPopupText("Cannot capture camera frame.");
                return;
            }

            if (isFrameLikelyInvalid()) {
                setPopupText("Frame too dark/blocked. Please do not cover camera and improve lighting.");
                return;
            }

            const result = await attendanceService.checkInOneFace({
                session_id: Number(sessionId),
                student_id: Number(resolvedStudentId),
                image_base64: imageBase64,
                min_similarity: oneFaceThreshold,
            });
            setPopupText(result.message ?? "One-face check-in success");
            setLastSeenByStudent((prev) => ({
                ...prev,
                [getSeenKey(sessionId, Number(resolvedStudentId))]: new Date().toISOString(),
            }));
            await refreshEvents();
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

        setIsScanning(true);
        isScanningRef.current = true;
        setDetections([]);
        setLastEventId(null);
        noFaceFrameCountRef.current = 0;
        setScanStatusText("Scanning...");
        timerRef.current = window.setInterval(() => {
            void scanRealtimeFrame();
        }, scanIntervalMs);
    }

    function stopScanning() {
        if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
        }
        setIsScanning(false);
        isScanningRef.current = false;
        setDetections([]);
        noFaceFrameCountRef.current = 0;
        setScanStatusText("Stopped");
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
                            <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Single & Multi Face Recognition</h1>
                            <p className="mt-2 text-sm text-slate-100 sm:text-base">
                                Scan multiple faces in real time for attendance, or verify a single face manually.
                            </p>
                        </div>
                    </div>
                </header>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
                    {!isFocusMode ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                                <video ref={videoRef} className="h-[300px] w-full object-contain sm:h-[280px] lg:h-[320px]" autoPlay muted playsInline />
                                <canvas ref={canvasRef} className="hidden" />
                                {!isCameraReady && (
                                    <div className="absolute inset-0 grid place-items-center bg-slate-900/55 text-sm font-medium text-white">
                                        Waiting for camera permission...
                                    </div>
                                )}
                                <div className="absolute left-3 top-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold text-white">
                                    {scanStatusText}
                                </div>
                                {popupText && (
                                    <div className="absolute left-3 right-3 top-3 rounded-xl bg-slate-900/85 px-4 py-2.5 text-sm font-semibold text-slate-100 shadow-xl">
                                        {popupText}
                                    </div>
                                )}

                                {detections.map((item, index) => renderDetectionOverlay(item, `${item.student_id ?? "unknown"}-${index}-${item.similarity}`))}
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
                                <label className="text-sm font-semibold text-slate-700" htmlFor="session-preset">
                                    Session
                                </label>
                                <div className="relative mt-1">
                                    <Clock3 className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    <select
                                        id="session-preset"
                                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                    >
                                        <option value="">Select session</option>
                                        {availableSessions.length === 0 ? (
                                            <option value="">No saved sessions</option>
                                        ) : (

                                            availableSessions.map((item) => (
                                                <option key={item.id} value={String(item.id)}>
                                                    {item.session_name || "Session"} | {item.session_date || "No date"}
                                                </option>
                                            ))
                                        )}
                                    </select>
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
                                        value={realtimeThreshold}
                                        disabled
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="student-code">
                                    Student (one-face check-in)
                                </label>
                                <select
                                    id="student-code"
                                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value)}
                                >
                                    <option value="">Select student code</option>
                                    {students.map((item) => (
                                        <option key={item.id} value={item.student_code ?? ""}>
                                            {item.student_code ?? `Student #${item.id}`} - {item.name}
                                        </option>
                                    ))}
                                </select>
                                <p className="px-2.5 py-2 mt-1 text-xs text-slate-500">
                                    Only needed when you press One-Face Check-in.
                                </p>
                                {selectedStudent && selectedStudentAlreadyCheckedIn && (
                                    <p className=" rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                        This student has already checked in for this session.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                className="interactive-btn inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={user.role}
                                onClick={startScanning}
                                disabled={isScanning || !sessionId.trim() || !canViewAttendance}
                                type="button"
                            >
                                <Eye className="h-4 w-4" />
                                Start Multi-Face Scan
                            </button>
                            {/* <button
                                className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                onClick={() => setIsFocusMode(true)}
                                type="button"
                            >
                                Focus Camera
                            </button> */}
                            <button
                                className="interactive-btn inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={user.role}
                                onClick={stopScanning}
                                disabled={!isScanning}
                                type="button"
                            >
                                Stop
                            </button>
                            <button
                                className="interactive-btn inline-flex h-9 items-center justify-center whitespace-nowrap rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                                data-role={canManageAttendance ? "teacher" : user.role}
                                onClick={createCheckIn}
                                disabled={!canManageAttendance || !isAttendanceSynced || selectedStudentAlreadyCheckedIn}
                                type="button"
                            >
                                Single-Face Check-in
                            </button>
                        </div>

                    </div>
                </div>

                <section className="motion-hero mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Attendance Records</p>
                    <h2 className="text-base font-bold text-slate-900">Latest Events</h2>
                    {events.length === 0 ? (
                        <p className="mt-2 text-sm text-slate-600">No events yet. Start scanning to receive updates.</p>
                    ) : (
                        <ul className="mt-3 grid gap-2.5">
                            {events.map((event) => (
                                <li
                                    key={event.id}
                                    className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-sm"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <strong className="block truncate text-base text-slate-900">{getStudentDisplayName(event.student_id)}</strong>
                                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">{event.student_code ?? `ID ${event.student_id}`}</span>
                                                {event.home_class_code && <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">{event.home_class_code}</span>}
                                                {event.course_code && <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700">{event.course_code}</span>}
                                                {(event.teacher_name || event.teacher_id) && (
                                                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">
                                                        {event.teacher_name ?? `Teacher #${event.teacher_id}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span
                                                className={
                                                    event.status === "present"
                                                        ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                                        : event.status === "late"
                                                            ? "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"
                                                            : "inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700"
                                                }
                                            >
                                                {event.status.toUpperCase()}
                                            </span>
                                            <p className="mt-1 text-xs font-medium text-slate-600">Confidence: {formatConfidence(event.confidence_score)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-2 grid gap-1 text-xs text-slate-500 sm:grid-cols-2">
                                        <time title={event.check_in_time ?? event.created_at ?? ""}>Check-in: {formatEventDateTime(event.check_in_time ?? event.created_at)}</time>
                                        <time className="sm:text-right" title={lastSeenByStudent[getSeenKey(event.session_id, event.student_id)] ?? ""}>
                                            Last seen: {formatEventDateTime(lastSeenByStudent[getSeenKey(event.session_id, event.student_id)] ?? event.check_in_time ?? event.created_at)}
                                        </time>
                                    </div>
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

                                {detections.map((item, index) => renderDetectionOverlay(item, `focus-${item.student_id ?? "unknown"}-${index}-${item.similarity}`))}
                            </div>

                            <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="session-id-focus">
                                        Session
                                    </label>
                                    <select
                                        id="session-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={sessionId}
                                        onChange={(e) => setSessionId(e.target.value)}
                                    >
                                        {availableSessions.length === 0 ? (
                                            <option value="">No saved sessions</option>
                                        ) : (
                                            availableSessions.map((item) => (
                                                <option key={item.id} value={String(item.id)}>
                                                    {item.session_name || "Session"} | {item.session_date || "No date"}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id-focus">
                                        Student Code
                                    </label>
                                    <select
                                        id="student-id-focus"
                                        className="mt-1 w-full rounded-xl border border-slate-300 bg-white py-2.5 px-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                        value={studentCode}
                                        onChange={(e) => setStudentCode(e.target.value)}
                                    >
                                        <option value="">Select student code</option>
                                        {students.map((item) => (
                                            <option key={item.id} value={item.student_code ?? ""}>
                                                {item.student_code ?? `Student #${item.id}`} - {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    className="interactive-btn inline-flex items-center justify-center rounded-xl border border-blue-300 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-100 hover:shadow-md"
                                    onClick={createCheckIn}
                                    disabled={!canManageAttendance}
                                    type="button"
                                >
                                    Check-in 1 Face
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
