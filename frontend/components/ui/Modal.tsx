"use client";

import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ModalProps = {
    open: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
};

export function Modal({ open, title, onClose, children }: ModalProps) {
    if (!open || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/60 px-4" role="dialog" aria-modal="true">
            <div className="motion-modal-panel w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" /> Close
                    </button>
                </div>
                <div className="mt-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
