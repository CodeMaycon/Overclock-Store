"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, getSession } from "next-auth/react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const errorParam = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(() => {
    if (errorParam === "BannedAccount" || errorParam?.toLowerCase().includes("banned")) {
      return "Esta conta foi suspensa por violação dos termos de uso e segurança.";
    }
    if (errorParam === "CredentialsSignin") {
      return "Credenciais inválidas. Verifique seu usuário e senha.";
    }
    return errorParam || "";
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier: identifier.trim(),
        password: password,
      });

      if (!result || result.error) {
        const err = result?.error;
        if (err?.includes("suspensa") || err === "BannedAccount" || err?.includes("banned")) {
          setErrorMessage("Esta conta foi suspensa por violação dos termos de uso e segurança.");
        } else {
          setErrorMessage(err || "Credenciais inválidas. Verifique seu usuário e senha.");
        }
        setIsLoading(false);
        return;
      }

      // Obtém a sessão atualizada para redirecionar conforme o cargo
      let userRole: string | undefined;
      try {
        const session = await getSession();
        userRole = session?.user?.role;
        if (!userRole) {
          const sessionRes = await fetch("/api/auth/session");
          if (sessionRes.ok) {
            const sessionData = await sessionRes.json();
            userRole = sessionData?.user?.role;
          }
        }
      } catch (err) {
        console.error("Erro ao obter sessão atualizada:", err);
      }

      let destination = "/dashboard";
      if (callbackUrl && !callbackUrl.includes("/login")) {
        destination = callbackUrl;
      } else if (userRole === "ADMIN") {
        destination = "/admin";
      }

      // Hard reload via window.location.href garante que cookies do NextAuth sejam enviados sem descompasso de SSR
      window.location.href = destination;
    } catch (err: any) {
      setErrorMessage(err.message || "Falha na comunicação com o servidor de autenticação.");
      setIsLoading(false);
    } finally {
      // Garante que se a navegação não ocorrer imediatamente por erro, o botão não fica travado
      setTimeout(() => {
        setIsLoading(false);
      }, 3000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[500px] mx-auto relative">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-xl pointer-events-none -z-10" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none -z-10" />

        {/* Main Cryptographic Terminal Card */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden relative backdrop-blur-2xl border border-white/5">
          {/* Top Optical Scanning Bar */}
          <div className="h-1 w-full bg-surface-container relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" />
          </div>

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Header Telemetry */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high font-mono-badge text-[11px] text-primary whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                  <span>AUTENTICAÇÃO // ACESSO SEGURO</span>
                </div>
                <div className="flex items-center gap-1 font-mono-badge text-[11px] text-outline">
                  <span className="material-symbols-outlined text-[13px] text-primary">sensors</span>
                  <span>SSL 256-Bit</span>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1 text-on-surface-variant font-mono-data text-xs">
                  <span className="font-bold text-primary">OVERCLOCK STORE</span>
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-outline uppercase">Portal de Acesso</span>
                </div>
                <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
                  Entrar na Conta
                </h1>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Insira suas credenciais cadastradas para acessar o painel de licenças e o loader.
                </p>
              </div>
            </div>

            {/* Alerta de Erro */}
            {errorMessage && (
              <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300 font-mono">
                <span className="material-symbols-outlined text-base text-red-400 shrink-0">
                  error
                </span>
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Matrix */}
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              {/* Field 1: Identifier */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
                  <span>Username ou E-mail</span>
                  <span className="text-primary">*</span>
                </label>
                <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                  <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-[18px]">person</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="seu_email@exemplo.com"
                  />
                </div>
              </div>

              {/* Field 2: Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs text-on-surface flex items-center gap-1">
                    <span>Senha</span>
                    <span className="text-primary">*</span>
                  </label>
                  <Link 
                    href="/forgot-password"
                    className="font-label-sm text-[11px] text-primary hover:underline"
                    title="Recuperar senha por e-mail"
                  >
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                  <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-11 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="Sua senha secreta"
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

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] disabled:opacity-75 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
                  {isLoading ? "autorenew" : "login"}
                </span>
                <span>{isLoading ? "Autenticando..." : "Entrar na Conta"}</span>
              </button>
            </form>

            {/* Switch to Register */}
            <div className="text-center pt-1">
              <Link
                href="/register"
                className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                <span>Ainda não possui uma conta?</span>
                <span className="text-primary font-semibold group-hover:underline flex items-center">
                  Cadastre-se <span className="material-symbols-outlined text-[14px] ml-0.5">trending_flat</span>
                </span>
              </Link>
            </div>

            {/* Cryptographic Badges */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-outline font-mono-badge text-[10px]">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">lock_clock</span>
                <span>SSL 256-Bit</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">visibility_off</span>
                <span>Zero Logs</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">memory</span>
                <span>HWID Shield</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">verified</span>
                <span>Autenticação Real</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs text-primary font-mono">Carregando formulário de acesso seguro...</div>}>
      <LoginForm />
    </Suspense>
  );
}
