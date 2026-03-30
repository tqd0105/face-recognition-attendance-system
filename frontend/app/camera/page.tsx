"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2 } from "lucide-react";
import { attendanceService } from "@/services/attendance.service";

export default function CameraPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [sessionId, setSessionId] = useState("1");
    const [studentId, setStudentId] = useState("");
    const [confidence, setConfidence] = useState(0.9);
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    async function submitAttendance() {
        if (!videoRef.current || !canvasRef.current || !sessionId.trim() || !studentId.trim()) {
            setNotice("Please enter session and student IDs.");
            return;
        }

        const canvas = canvasRef.current;
        const video = videoRef.current;
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;

        const context = canvas.getContext("2d");
        if (!context) {
            setNotice("Cannot access camera frame.");
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageBase64 = canvas.toDataURL("image/jpeg", 0.86);

        try {
            setIsSubmitting(true);
            await attendanceService.mark({
                session_id: Number(sessionId),
                student_id: Number(studentId),
                status: "present",
                confidence_score: confidence,
                image_base64: imageBase64,
            });
            setNotice("Attendance submitted successfully.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Cannot submit attendance";
            setNotice(message);
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="motion-page space-y-4 px-1 py-1 sm:px-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recognition</p>
                <h1 className="text-2xl font-bold text-slate-900">Camera Page</h1>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
                    <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3">
                        <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-800">
                            <video ref={videoRef} className="h-[280px] w-full object-cover lg:h-[420px]" autoPlay muted playsInline />
                            {!isCameraReady && (
                                <div className="absolute inset-0 grid place-items-center bg-slate-900/50 text-sm font-semibold text-white">
                                    Waiting for camera permission...
                                </div>
                            )}
                        </div>
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="grid gap-3">
                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="session-id">
                                    Session ID
                                </label>
                                <input
                                    id="session-id"
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={sessionId}
                                    onChange={(e) => setSessionId(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                                    Student ID
                                </label>
                                <input
                                    id="student-id"
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700" htmlFor="confidence">
                                    Confidence
                                </label>
                                <input
                                    id="confidence"
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                    value={confidence}
                                    onChange={(e) => setConfidence(Number(e.target.value))}
                                />
                            </div>

                            <button
                                type="button"
                                className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                                onClick={submitAttendance}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? <Camera className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                {isSubmitting ? "Submitting..." : "Capture & Mark Attendance"}
                            </button>

                            {notice && (
                                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-800">
                                    {notice}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
