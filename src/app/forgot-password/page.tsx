"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao solicitar recuperação de senha.");
      }

      setSuccessMessage(
        data.message ||
          "Se o e-mail estiver cadastrado, enviamos um link seguro para redefinir sua senha. Verifique sua caixa de entrada e spam!"
      );
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[480px] mx-auto relative">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-xl pointer-events-none -z-10" />

        {/* Card */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden relative backdrop-blur-2xl border border-white/5">
          {/* Top Scan Bar */}
          <div className="h-1 w-full bg-surface-container relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high font-mono-badge text-[11px] text-primary whitespace-nowrap self-start">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>RECUPERAÇÃO DE CONTA</span>
              </div>

              <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight mt-1">
                Esqueceu sua senha?
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                Digite o endereço de e-mail associado à sua conta. Enviaremos um link seguro para você redefinir sua senha.
              </p>
            </div>

            {/* Alerta de Sucesso */}
            {successMessage && (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 font-mono">
                <span className="material-symbols-outlined text-base text-emerald-400 shrink-0">
                  check_circle
                </span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Alerta de Erro */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 font-mono">
                <span className="material-symbols-outlined text-base text-red-400 shrink-0">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {!successMessage ? (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
                    <span>E-mail cadastrado</span>
                    <span className="text-primary">*</span>
                  </label>
                  <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                    <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                      <span className="material-symbols-outlined text-[18px]">mail</span>
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 pl-11 pr-4 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                      placeholder="seu_email@exemplo.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-11 mt-1 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] disabled:opacity-75 cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
                    {isLoading ? "autorenew" : "send"}
                  </span>
                  <span>{isLoading ? "Enviando link..." : "Enviar Link de Recuperação"}</span>
                </button>
              </form>
            ) : (
              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full h-11 rounded-lg bg-surface-container-high hover:bg-surface-variant text-primary font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-white/5"
                >
                  <span className="material-symbols-outlined text-base">arrow_back</span>
                  <span>Voltar para o Login</span>
                </Link>
              </div>
            )}

            {/* Footer Back Link */}
            {!successMessage && (
              <div className="pt-2 border-t border-white/5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors font-mono-data"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Lembrou sua senha? Fazer login</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
