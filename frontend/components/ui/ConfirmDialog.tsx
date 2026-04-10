"use client";

import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

type ConfirmDialogProps = {
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
    confirmText?: string;
    cancelText?: string;
    isLoading?: boolean;
};

export function ConfirmDialog({
    open,
    title,
    message,
    onConfirm,
    onClose,
    confirmText = "Delete",
    cancelText = "Cancel",
    isLoading = false,
}: ConfirmDialogProps) {
    return (
        <Modal open={open} title={title} onClose={onClose}>
            <div className="grid gap-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    <p className="inline-flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" /> This action cannot be undone.
                    </p>
                    <p className="mt-2">{message}</p>
                </div>

                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className="interactive-btn inline-flex items-center justify-center rounded-xl border border-rose-300 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? "Deleting..." : confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
}
