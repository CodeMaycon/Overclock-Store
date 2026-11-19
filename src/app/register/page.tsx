"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const isMatching = password && confirmPassword && password === confirmPassword;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isMatching) {
      setErrorMessage("As senhas digitadas não coincidem.");
      return;
    }

    if (!agreeTerms) {
      setErrorMessage("Você deve aceitar os Termos de Serviço para criar sua conta.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          password: password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Ocorreu um erro ao criar a conta.");
        setIsLoading(false);
        return;
      }

      // Auto login após cadastro bem-sucedido
      const loginRes = await signIn("credentials", {
        redirect: false,
        identifier: username.trim(),
        password: password,
      });

      if (loginRes?.ok) {
        router.push("/dashboard");
      } else {
        router.push("/login?registered=true");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Erro na conexão com o servidor.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-[540px] mx-auto relative">
        {/* Ambient Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-b from-primary/20 via-primary/5 to-transparent blur-xl pointer-events-none -z-10" />
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none -z-10" />

        {/* Main Cryptographic Terminal Container */}
        <div className="w-full bg-surface-container-lowest rounded-xl shadow-2xl overflow-hidden relative backdrop-blur-2xl border border-white/5">
          {/* Top Optical Scanning Bar */}
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />

          <div className="p-6 sm:p-8 flex flex-col gap-6">
            {/* Header Telemetry */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-high font-mono-badge text-[11px] text-primary whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  CADASTRO DE CLIENTE // CRIPTOGRAFIA ATIVA
                </span>
                <span className="font-mono-badge text-[11px] text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px] text-primary">terminal</span>
                  RSA-4096
                </span>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <div className="flex items-center gap-1 text-on-surface-variant font-mono-data text-xs">
                  <span className="font-bold text-primary">OVERCLOCK STORE</span>
                  <span className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-outline uppercase">Cadastro Seguro</span>
                </div>
                <h1 className="font-headline-md text-2xl font-bold text-on-surface tracking-tight">
                  Criar Conta de Cliente
                </h1>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Crie seu perfil unificado para compra de licenças, downloads do loader e autoatendimento de HWID.
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

            {/* Registration Form */}
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              {/* Grid: Nome Completo & Username */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
                    <span>Nome Completo</span>
                    <span className="text-primary">*</span>
                  </label>
                  <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                    <div className="absolute left-3 text-outline pointer-events-none flex items-center">
                      <span className="material-symbols-outlined text-[18px]">badge</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                      placeholder="John Smith"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
                    <span>Username (Único)</span>
                    <span className="text-primary">*</span>
                  </label>
                  <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                    <div className="absolute left-3 text-outline pointer-events-none flex items-center">
                      <span className="material-symbols-outlined text-[18px]">alternate_email</span>
                    </div>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full h-11 pl-10 pr-3 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                      placeholder="ghost_player99"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="font-label-sm text-xs text-on-surface flex items-center justify-between">
                  <span>E-mail (Despacho Instantâneo de Chaves)</span>
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
                    placeholder="cliente@exemplo.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs text-on-surface flex items-center gap-1">
                    <span>Senha Master (Web &amp; Loader)</span>
                    <span className="text-primary">*</span>
                  </label>
                  <span className="font-mono-badge text-[10px] text-outline">MÍNIMO 6 CARACTERES</span>
                </div>
                <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                  <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-[18px]">key</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-11 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="••••••••••••••••"
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

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-label-sm text-xs text-on-surface flex items-center gap-1">
                    <span>Confirmação da Senha</span>
                    <span className="text-primary">*</span>
                  </label>
                  {confirmPassword && (
                    <span className={`font-mono-badge text-[10px] font-bold ${isMatching ? "text-primary" : "text-red-400"}`}>
                      {isMatching ? "SENHAS COINCIDEM ✓" : "DIVERGENTE ✗"}
                    </span>
                  )}
                </div>
                <div className="relative flex items-center bg-surface-container-low rounded-lg border border-white/5 focus-within:border-primary/50 transition-all">
                  <div className="absolute left-3.5 text-outline pointer-events-none flex items-center">
                    <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 pl-11 pr-4 bg-transparent font-mono-data text-xs text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="Repita a senha master"
                  />
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 rounded border-white/10 bg-surface-container text-primary focus:ring-primary"
                  />
                  <span className="font-body-sm text-xs text-on-surface-variant leading-tight">
                    Concordo com os Termos de Serviço e EULA da Overclock Store. Reconheço que o compartilhamento não autorizado de chaves ou engenharia reversa do Loader resulta em banimento irrevogável de HWID.
                  </span>
                </label>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 mt-1 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-sm font-bold tracking-wide flex items-center justify-center gap-2 transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] disabled:opacity-75 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[18px] ${isLoading ? "animate-spin" : ""}`}>
                  {isLoading ? "autorenew" : "person_add"}
                </span>
                <span>{isLoading ? "Criando Conta..." : "Criar Conta de Cliente"}</span>
              </button>
            </form>

            {/* Switch to Login */}
            <div className="text-center pt-1">
              <Link
                href="/login"
                className="font-body-sm text-xs text-on-surface-variant hover:text-primary transition-colors inline-flex items-center gap-1 group"
              >
                <span>Já possui uma conta registrada?</span>
                <span className="text-primary font-semibold group-hover:underline flex items-center">
                  Entrar no Portal <span className="material-symbols-outlined text-[14px] ml-0.5">trending_flat</span>
                </span>
              </Link>
            </div>

            {/* Badges */}
            <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-outline font-mono-badge text-[10px]">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">verified_user</span>
                <span>Conta Unificada</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">cloud_download</span>
                <span>Acesso ao Loader</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-primary">vpn_key</span>
                <span>Auto-Reset HWID</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
