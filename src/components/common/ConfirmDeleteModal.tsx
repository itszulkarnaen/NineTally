"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

/** Accessible destructive confirmation modal backed by native <dialog>. */
export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Ya, Hapus",
  cancelLabel = "Batal",
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.returnValue = "";
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Fallback light-dismiss for browsers without <dialog closedby> support (e.g. Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = !isDeleting && isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && !isDeleting && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", handlePointerDown);
    dialog.addEventListener("pointerup", handlePointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", handlePointerDown);
      dialog.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDeleting]);

  const handleConfirmClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: isDeleting ? "none" : "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        if (isDeleting) {
          e.preventDefault();
          return;
        }
      }}
      onClose={() => {
        if (dialogRef.current) dialogRef.current.returnValue = "";
        if (isOpen && !isDeleting) onCancel();
      }}
      className="m-auto p-0 bg-transparent border-0 max-w-md w-[calc(100%-2rem)] backdrop:bg-black/45 backdrop:backdrop-blur-xs"
    >
      <div className="bg-[#FFFFFF] border border-[#EEEEEE] rounded-3xl p-6 shadow-2xl space-y-4 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
            <Trash2 className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 id={titleId} className="text-sm font-bold text-[#242921]">
              {title}
            </h3>
            <p id={descId} className="text-xs text-[#666E61] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#EEEEEE]">
          <button
            type="button"
            autoFocus
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 border border-[#EEEEEE] text-[#242921] hover:bg-[#EEEEEE]/60 font-medium text-xs rounded-xl transition cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleConfirmClick}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            {isDeleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{isDeleting ? "Menghapus..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </dialog>
  );
};

