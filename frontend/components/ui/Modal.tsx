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
        <div className="motion-modal-backdrop fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-3 sm:px-4" role="dialog" aria-modal="true">
            <div className="motion-modal-panel flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5 sm:py-4">
                    <h2 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h2>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-3 sm:py-2 sm:text-sm"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" /> Close
                    </button>
                </div>
                <div className="overflow-y-auto px-4 py-3 sm:px-5 sm:py-4">{children}</div>
            </div>
        </div>,
        document.body,
    );
}
