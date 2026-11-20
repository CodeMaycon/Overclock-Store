"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!token || !email) {
      setErrorMessage("Parâmetros de recuperação ausentes ou inválidos. Solicite um novo link.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao redefinir senha.");
      }

      setSuccessMessage(data.message || "Senha redefinida com sucesso! Você já pode entrar.");
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="p-6 text-center space-y-4 font-mono-data text-xs">
        <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
          Link de recuperação incompleto ou inválido.
        </div>
        <Link
          href="/forgot-password"
          className="inline-block px-4 py-2 rounded-lg bg-primary text-[#050706] font-bold"
        >
          Solicitar Novo Link
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high font-mono-badge text-[11px] text-primary whitespace-nowrap self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span>NOVA CREDENCIAL</span>
        </div>

        <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight mt-1">
          Redefinir Senha
        </h1>
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
          Defina uma nova senha segura para a conta associada a <strong className="text-primary">{email}</strong>.
        </p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-300 font-mono">
          <span className="material-symbols-outlined text-base text-emerald-400 shrink-0">
            check_circle
          </span>
          <div>
            <span>{successMessage}</span>
            <span className="block mt-1 text-[11px] text-emerald-400/80">Redirecionando para o login...</span>
          </div>
        </div>
      )}

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
              <span>Nova Senha (mínimo 6 caracteres)</span>
              <span className="text-primary">*</span>
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
              <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-11 pr-11 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Nova senha secreta"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-outline hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
              <span>Confirmar Nova Senha</span>
              <span className="text-primary">*</span>
            </label>
            <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
              <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                <span className="material-symbols-outlined text-[18px]">lock_reset</span>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                placeholder="Repita a nova senha"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-11 mt-1 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] disabled:opacity-75 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
              {isLoading ? "autorenew" : "key"}
            </span>
            <span>{isLoading ? "Salvando..." : "Redefinir e Salvar Senha"}</span>
          </button>
        </form>
      ) : (
        <div className="pt-2">
          <Link
            href="/login"
            className="w-full h-11 rounded-lg bg-primary text-[#050706] font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">login</span>
            <span>Ir para o Login Agora</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[480px] mx-auto relative">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-xl pointer-events-none -z-10" />
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden relative backdrop-blur-2xl border border-white/5">
          <div className="h-1 w-full bg-surface-container relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          </div>
          <Suspense fallback={<div className="p-8 text-center font-mono text-xs text-[#86948a]">Carregando parâmetros...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
