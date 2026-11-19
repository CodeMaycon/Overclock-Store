"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const pathname = usePathname();
  const { user, isLoggedIn, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "Início" },
    { href: "/products", label: "Produtos" },
    { href: "/status", label: "Status" },
    { href: "/changelogs", label: "Atualizações" },
    { href: "/reviews", label: "Avaliações" },
    { href: "/#faq", label: "FAQ" },
  ];

  const panelHref = user?.role === "ADMIN" ? "/admin" : "/dashboard";
  const roleLabel = user?.role === "ADMIN" ? "Administrador" : user?.role === "RESELLER" ? "Revendedor" : "Cliente";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 px-4 lg:px-12 transition-all duration-300 ${
        isScrolled
          ? "bg-gradient-to-b from-[#050706]/85 via-[#050706]/55 to-transparent backdrop-blur-sm py-2"
          : "bg-transparent border-transparent py-2.5"
      }`}
    >
      <div className="h-16 max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand / Logo (OVERCLOCK DIGITAL STORE) */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative flex items-center justify-center p-1 rounded-xl bg-surface-container-low border border-white/5 group-hover:border-primary/40 transition-colors shadow-md">
            <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold overflow-hidden">
              <span className="material-symbols-outlined text-xl text-primary">bolt</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary-container ring-2 ring-surface-container-lowest" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-base sm:text-lg tracking-tight text-on-surface leading-none uppercase font-extrabold">
              OVERCLOCK
            </span>
            <span className="font-mono-badge text-[9px] text-primary/80 uppercase tracking-widest mt-1 font-bold">
              DIGITAL STORE
            </span>
          </div>
        </Link>

        {/* Central Floating Pill Navbar (Exact Stitch Spec) */}
        <div className="hidden md:flex items-center justify-center">
          <nav className="flex items-center gap-1 px-2 py-1 rounded-full bg-surface-container/80 backdrop-blur-xl border border-white/5 shadow-2xl">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-all duration-150 ${
                    isActive
                      ? "bg-surface-container-high text-primary font-semibold shadow-inner"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Discord Pill + Profile Dropdown or Client Area */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {/* Discord Button */}
          <a
            href="https://discord.gg/gqMDjvaSC"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-all font-label-sm text-label-sm border border-white/5"
          >
            <span className="material-symbols-outlined text-primary text-base">forum</span>
            <span>Discord</span>
            <span className="font-mono-badge text-mono-badge px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container font-semibold">
              VIP
            </span>
          </a>

          {/* Conditional Profile Dropdown (Logged in) or Client Area (Logged out) */}
          {isLoggedIn && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-white/10 transition-all cursor-pointer shadow-sm group"
              >
                <div className="relative flex items-center justify-center w-7 h-7 rounded-full bg-surface-container-highest border border-primary/30 text-primary font-mono-badge text-[11px] font-bold overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span>{user.username.slice(0, 2).toUpperCase()}</span>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-container" />
                </div>
                <div className="hidden sm:flex flex-col text-left leading-none">
                  <span className="font-mono-data text-xs text-on-surface font-medium group-hover:text-primary transition-colors">
                    @{user.username}
                  </span>
                </div>
                <span className="material-symbols-outlined text-base text-outline transition-transform duration-200">
                  {profileDropdownOpen ? "expand_less" : "expand_more"}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-11 mt-1 w-64 rounded-xl bg-surface-container-lowest border border-white/10 shadow-2xl p-2 z-50 flex flex-col gap-1 backdrop-blur-2xl animate-in fade-in-50 zoom-in-95">
                    {/* User Summary Header */}
                    <div className="p-2.5 rounded-lg bg-surface-container-low border border-white/5 flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="font-label-sm text-xs font-bold text-on-surface truncate">
                          {user.fullName || user.username}
                        </span>
                        <span className="font-mono-data text-[11px] text-outline truncate">
                          {user.email}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded font-mono-badge text-[10px] uppercase font-bold bg-primary-container text-on-primary-container">
                        {roleLabel}
                      </span>
                    </div>

                    {/* Nav Items */}
                    <Link
                      href={panelHref}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-label-md text-on-surface hover:text-primary hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-primary">
                        {user.role === "ADMIN" ? "terminal" : "dashboard"}
                      </span>
                      <span>{user.role === "ADMIN" ? "Painel Administrativo" : "Área do Cliente"}</span>
                    </Link>

                    <Link
                      href="/dashboard"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-label-md text-on-surface hover:text-primary hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-primary">vpn_key</span>
                      <span>Minhas Licenças</span>
                    </Link>

                    <Link
                      href={`${panelHref}#settings`}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-label-md text-on-surface hover:text-primary hover:bg-surface-container transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-outline">tune</span>
                      <span>Configurações &amp; HWID</span>
                    </Link>

                    <div className="h-px bg-white/5 my-1" />

                    {/* Logout Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-label-md text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full text-left cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">logout</span>
                      <span>Sair da Conta</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-xs sm:text-sm font-bold transition-all shadow-[0_0_24px_rgba(16,185,129,0.25)] hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-base">fingerprint</span>
              <span>Área do Cliente</span>
            </Link>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-on-surface-variant hover:text-white rounded-xl bg-surface-container border border-white/10 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            aria-label="Alternar menu"
          >
            <span className="material-symbols-outlined text-xl">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="md:hidden relative z-50 mt-2 p-4 rounded-2xl bg-[#0b0f0d]/95 backdrop-blur-2xl border border-white/10 shadow-2xl space-y-3 animate-in slide-in-from-top-3 duration-200">
            {/* User status card if logged in */}
            {isLoggedIn && user ? (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#10b981]/20 border border-[#10b981]/30 text-[#10b981] flex items-center justify-center font-bold text-xs">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-white truncate">@{user.username}</span>
                    <span className="text-[10px] text-[#86948a] truncate">{user.email}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#10b981]/15 text-[#10b981]">
                  {roleLabel}
                </span>
              </div>
            ) : null}

            {/* Navigation Links */}
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-3.5 py-2.5 text-sm font-['Space_Grotesk'] font-medium rounded-xl transition-colors flex items-center justify-between ${
                      isActive
                        ? "bg-[#10b981]/15 text-[#10b981] font-bold"
                        : "text-[#bbcabf] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />}
                  </Link>
                );
              })}
            </div>

            {/* Discord Link in Mobile Menu */}
            <a
              href="https://discord.gg/gqMDjvaSC"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between p-3 rounded-xl bg-[#5865F2]/15 hover:bg-[#5865F2]/25 text-[#7983F5] border border-[#5865F2]/30 transition-all text-xs font-bold font-['Space_Grotesk']"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">🎮</span>
                <span>Comunidade Discord VIP</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-[#5865F2]/20 text-[10px] font-mono">
                OFICIAL
              </span>
            </a>

            {/* Actions */}
            <div className="pt-2 border-t border-white/8 flex flex-col gap-2">
              {isLoggedIn && user ? (
                <>
                  <Link
                    href={panelHref}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] hover:bg-[#34d399] text-[#050706] shadow-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      {user.role === "ADMIN" ? "terminal" : "dashboard"}
                    </span>
                    <span>{user.role === "ADMIN" ? "Painel Administrativo" : "Área do Cliente"}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] text-rose-400 border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">logout</span>
                    <span>Sair da Conta</span>
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
                  >
                    <span>Entrar</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] hover:bg-[#34d399] text-[#050706] transition-colors shadow-md"
                  >
                    <span>Criar Conta</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </header>
  );
}



