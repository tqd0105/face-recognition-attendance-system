"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, UserRound } from "lucide-react";
import { backendUrl } from "@/lib/backend";

type EnrollmentResult = {
    success: boolean;
    message?: string;
    student_id?: string;
};

export default function EnrollmentPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const [studentId, setStudentId] = useState("");
    const [isCameraReady, setIsCameraReady] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState<EnrollmentResult | null>(null);

    useEffect(() => {
        let stream: MediaStream | null = null;

        async function initCamera() {
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: false,
                });

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
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, []);

    function captureBlob(): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
                reject(new Error("Camera is not ready"));
                return;
            }

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            if (!ctx) {
                reject(new Error("Cannot access canvas context"));
                return;
            }

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error("Failed to capture frame"));
                        return;
                    }
                    resolve(blob);
                },
                "image/jpeg",
                0.92,
            );
        });
    }

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!studentId.trim()) {
            setResult({ success: false, message: "Please enter student ID" });
            return;
        }

        try {
            setIsSubmitting(true);
            setResult(null);

            const frameBlob = await captureBlob();
            const formData = new FormData();
            formData.append("student_id", studentId.trim());
            formData.append("image", frameBlob, `${studentId.trim()}.jpg`);

            const response = await fetch(backendUrl("/biometrics/enroll"), {
                method: "POST",
                body: formData,
            });

            const data = (await response.json().catch(() => ({}))) as EnrollmentResult;

            if (!response.ok) {
                setResult({
                    success: false,
                    message: data.message ?? "Enrollment failed. Please try again.",
                });
                return;
            }

            setResult({
                success: true,
                student_id: data.student_id ?? studentId.trim(),
                message: "Enrollment success",
            });
        } catch {
            setResult({ success: false, message: "Cannot connect to backend service" });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
            <section className="mx-auto w-full max-w-5xl rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:p-7">
                <header className="rounded-2xl bg-emerald-700 p-5 text-white shadow-lg sm:p-6">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-xl bg-white/20 p-2.5 shadow-md">
                            <Camera className="h-7 w-7" />
                        </div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em]">Face Enrollment</p>
                    </div>
                    <h1 className="text-2xl font-bold sm:text-3xl">Register Student Face</h1>
                    <p className="mt-2 text-sm text-emerald-50 sm:text-base">
                        Capture one clear frontal image. Frontend sends image to backend, backend calls AI service.
                    </p>
                </header>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-sm">
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-zinc-900">
                        <video ref={videoRef} className="aspect-video w-full object-cover" autoPlay muted playsInline />
                        {!isCameraReady && (
                            <div className="absolute inset-0 grid place-items-center bg-black/45 text-sm font-medium text-white">
                                Waiting for camera permission...
                            </div>
                        )}
                    </div>
                </div>

                <canvas ref={canvasRef} className="hidden-canvas" />

                <form className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm" onSubmit={onSubmit}>
                    <label className="text-sm font-semibold text-slate-700" htmlFor="student-id">
                        Student ID
                    </label>
                    <div className="relative">
                        <UserRound className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            id="student-id"
                            className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                            value={studentId}
                            onChange={(e) => setStudentId(e.target.value)}
                            placeholder="e.g. B21DCCN001"
                            autoComplete="off"
                        />
                    </div>

                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!isCameraReady || isSubmitting}
                        type="submit"
                    >
                        <CheckCircle2 className="h-5 w-5" />
                        {isSubmitting ? "Submitting..." : "Capture & Enroll"}
                    </button>
                </form>

                {result && (
                    <div
                        className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold shadow-md ${result.success
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                    >
                        {result.message}
                        {result.student_id ? ` (${result.student_id})` : ""}
                    </div>
                )}

                <footer className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-emerald-700">
                    <Link className="rounded-lg px-2 py-1 hover:bg-emerald-50" href="/attendance">
                        Go to realtime attendance
                    </Link>
                    <Link className="rounded-lg px-2 py-1 hover:bg-emerald-50" href="/">
                        Back to dashboard
                    </Link>
                </footer>
            </section>
        </main>
    );
}
