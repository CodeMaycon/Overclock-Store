"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  icon?: React.ReactNode;
  maxWidth?: string; // ex: "max-w-2xl", "max-w-3xl", "max-w-md"
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AdminModal({
  isOpen,
  onClose,
  title,
  icon,
  maxWidth = "max-w-2xl",
  children,
  footer,
}: AdminModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trava e restaura o scroll do body de forma segura
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0 -z-10"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card do Modal com cabeçalho fixo, corpo rolável e rodapé fixo */}
      <div
        className={`rounded-2xl bg-[#0b0f0d] w-full ${maxWidth} border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.9)] relative flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        {/* Cabeçalho Fixo (shrink-0) */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8 bg-[#0b0f0d]">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="w-8 h-8 rounded-lg bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-['Space_Grotesk'] text-base sm:text-lg font-bold text-white truncate">
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0 ml-3"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Área Central com Scroll Próprio (flex-1 overflow-y-auto) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs text-[#e0e3df] font-['Geist']">
          {children}
        </div>

        {/* Barra Inferior Fixa (shrink-0) */}
        {footer && (
          <div className="shrink-0 px-6 py-3.5 border-t border-white/8 bg-[#0b0f0d] flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
