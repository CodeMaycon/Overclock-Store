"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Key, 
  Download, 
  ShoppingBag, 
  Settings, 
  Shield, 
  ExternalLink, 
  Copy, 
  Check, 
  RefreshCw, 
  Clock, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  PlusCircle, 
  FileText, 
  User, 
  Fingerprint, 
  Link2, 
  Lock, 
  PauseCircle, 
  Play, 
  Terminal, 
  LogOut, 
  Loader2,
  AlertCircle,
  Star,
  Store
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";

interface ClientLicense {
  id: string;
  key: string;
  status: "NOT_ACTIVATED" | "ACTIVE" | "FROZEN" | "EXPIRED" | "REVOKED";
  productName: string;
  productSlug: string;
  category: string;
  productImage?: string | null;
  productStatus: string;
  downloadUrl?: string | null;
  variantName: string;
  activatedAt?: string | null;
  expiresAt?: string | null;
  expiresFormatted: string;
  hwid?: string | null;
  hasHwid: boolean;
  lastHwidResetAt?: string | null;
  totalFrozenSeconds: number;
}

interface ClientOrder {
  id: string;
  orderNumber: string;
  status: string;
  productName: string;
  productSlug: string;
  productId?: string | null;
  variantName: string;
  amountCents: number;
  amountFormatted: string;
  paymentMethod: string;
  createdAt: string;
  paidAt?: string | null;
  hasReview?: boolean;
  reviewStatus?: "PUBLISHED" | "PENDING" | null;
  reviewRating?: number | null;
}

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"licenses" | "downloads" | "orders" | "settings">("licenses");
  
  // Dados Reais do Banco
  const [licenses, setLicenses] = useState<ClientLicense[]>([]);
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [loadingLicenses, setLoadingLicenses] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal de Reset de HWID
  const [hwidModalOpen, setHwidModalOpen] = useState(false);
  const [selectedLicenseForHwid, setSelectedLicenseForHwid] = useState<ClientLicense | null>(null);
  const [hwidReason, setHwidReason] = useState("");
  const [hwidLoading, setHwidLoading] = useState(false);
  const [hwidSuccessMsg, setHwidSuccessMsg] = useState<string | null>(null);
  const [hwidErrorMsg, setHwidErrorMsg] = useState<string | null>(null);

  // Modal de Resgate de Chave
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [redeemKeyInput, setRedeemKeyInput] = useState("");
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemSuccessMsg, setRedeemSuccessMsg] = useState<string | null>(null);
  const [redeemErrorMsg, setRedeemErrorMsg] = useState<string | null>(null);

  // Modal de Avaliação de Compra
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedOrderForReview, setSelectedOrderForReview] = useState<ClientOrder | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);

  const handleOpenReviewModal = (ord: ClientOrder) => {
    setSelectedOrderForReview(ord);
    setReviewRating(5);
    setReviewComment("");
    setReviewErrorMsg(null);
    setReviewSuccessMsg(null);
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReview) return;
    if (reviewComment.trim().length < 3) {
      setReviewErrorMsg("O comentário deve ter no mínimo 3 caracteres.");
      return;
    }
    setReviewLoading(true);
    setReviewErrorMsg(null);
    try {
      const res = await fetch("/api/client/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderForReview.id,
          productId: selectedOrderForReview.productId || undefined,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar avaliação.");
      }
      setReviewSuccessMsg(data.message || "Avaliação enviada com sucesso! Ela passará por moderação antes de ser publicada.");
      showToast("Avaliação enviada para moderação com sucesso!");
      // Atualizar lista de pedidos localmente
      setOrders((prev) =>
        prev.map((o) =>
          o.id === selectedOrderForReview.id
            ? { ...o, hasReview: true, reviewStatus: "PENDING", reviewRating }
            : o
        )
      );
    } catch (err: any) {
      setReviewErrorMsg(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  // Perfil Completo com Discord
  const [clientProfile, setClientProfile] = useState<any>(null);
  const [disconnectingDiscord, setDisconnectingDiscord] = useState(false);

  // Toast Notifier
  const [dashboardNotice, setDashboardNotice] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setDashboardNotice(msg);
    setTimeout(() => setDashboardNotice(null), 4000);
  };

  // Carrega Perfil do Banco
  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/client/profile");
      if (res.ok) {
        const data = await res.json();
        setClientProfile(data.user);
      }
    } catch (_) {}
  }, []);

  // Carrega Licenças Reais
  const loadLicenses = useCallback(async () => {
    setLoadingLicenses(true);
    try {
      const res = await fetch("/api/client/licenses");
      if (res.ok) {
        const data = await res.json();
        setLicenses(data.licenses || []);
      }
    } catch (err) {
      console.error("Erro ao carregar licenças do cliente:", err);
    } finally {
      setLoadingLicenses(false);
    }
  }, []);

  // Carrega Pedidos Reais
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/client/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Erro ao carregar pedidos do cliente:", err);
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Desvincular Conta Discord
  const handleDisconnectDiscord = async () => {
    if (!confirm("Tem certeza que deseja desvincular sua conta do Discord?")) return;
    setDisconnectingDiscord(true);
    try {
      const res = await fetch("/api/discord/disconnect", { method: "POST" });
      if (res.ok) {
        showToast("Discord desvinculado com sucesso.");
        loadProfile();
      } else {
        showToast("Erro ao desvincular conta do Discord.");
      }
    } catch (_) {
      showToast("Erro de comunicação ao desvincular Discord.");
    } finally {
      setDisconnectingDiscord(false);
    }
  };

  useEffect(() => {
    loadLicenses();
    loadProfile();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("discord_success") === "linked") {
        showToast("Conta Discord vinculada com sucesso! Cargo Verificado atribuído.");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("discord_error") === "already_linked_to_another_account") {
        showToast("Esta conta do Discord já está vinculada a outro usuário da Overclock Store.");
        window.history.replaceState({}, "", "/dashboard");
      } else if (params.get("discord_error")) {
        showToast("Falha ao autenticar com o Discord. Tente novamente.");
        window.history.replaceState({}, "", "/dashboard");
      }
    }
  }, [loadLicenses, loadProfile]);

  useEffect(() => {
    if (activeTab === "orders") {
      loadOrders();
    }
  }, [activeTab, loadOrders]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenHwidModal = (lic: ClientLicense) => {
    setSelectedLicenseForHwid(lic);
    setHwidSuccessMsg(null);
    setHwidErrorMsg(null);
    setHwidReason("");
    setHwidModalOpen(true);
  };

  // Submissão Real de Reset de HWID
  const handleSubmitHwidReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLicenseForHwid) return;

    setHwidLoading(true);
    setHwidErrorMsg(null);

    try {
      const res = await fetch(`/api/client/licenses/${selectedLicenseForHwid.id}/reset-hwid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: hwidReason.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setHwidErrorMsg(data.error || "Falha ao processar solicitação de reset.");
      } else {
        setHwidSuccessMsg(data.message || "HWID desvinculado com sucesso!");
        loadLicenses();
        setTimeout(() => {
          setHwidModalOpen(false);
          setHwidSuccessMsg(null);
        }, 2200);
      }
    } catch (err) {
      setHwidErrorMsg("Erro de conexão ao solicitar reset de HWID.");
    } finally {
      setHwidLoading(false);
    }
  };

  // Submissão Real de Resgate de Chave Avulsa
  const handleRedeemKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemKeyInput.trim()) return;

    setRedeemLoading(true);
    setRedeemErrorMsg(null);

    try {
      const res = await fetch("/api/client/licenses/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: redeemKeyInput.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setRedeemErrorMsg(data.error || "Chave inválida ou já utilizada.");
      } else {
        setRedeemSuccessMsg(data.message);
        loadLicenses();
        setTimeout(() => {
          setRedeemModalOpen(false);
          setRedeemSuccessMsg(null);
          setRedeemKeyInput("");
        }, 1800);
      }
    } catch (err) {
      setRedeemErrorMsg("Erro de comunicação com o servidor.");
    } finally {
      setRedeemLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-12 space-y-6">
      
      {/* Toast Notifier */}
      {dashboardNotice && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-[#10b981] text-[#050706] font-['Space_Grotesk'] font-bold text-xs shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{dashboardNotice}</span>
        </div>
      )}

      {/* Topbar Telemetry Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#86948a] mb-1">
            <span className="text-white font-semibold">NÓ DO CLIENTE</span>
            <span>/</span>
            <span>Painel de Licenças</span>
            <span>/</span>
            <span className="text-[#10b981] font-bold">CLIENT-AUTH</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
            OVERCLOCK<span className="text-[#10b981]">.DASHBOARD</span> // Central do Usuário
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadLicenses();
              if (activeTab === "orders") loadOrders();
              showToast("Dados sincronizados com o banco de dados.");
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#101412] border border-[#10b981]/30 text-[#10b981] font-mono text-xs hover:bg-[#141a16] transition-colors cursor-pointer"
            title="Atualizar dados do banco"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLicenses ? "animate-spin" : ""}`} />
            <span>SINCRONIZAR</span>
          </button>

          <Link
            href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
          >
            <Store className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Loja</span>
          </Link>

          {user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/40 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </Link>
          )}
        </div>
      </div>

      {/* Grid: Sidebar (3 cols) + Workspace (9 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* SIDEBAR DO CLIENTE */}
        <aside className="lg:col-span-3 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar pb-2">
          <button
            onClick={() => setActiveTab("licenses")}
            className={`p-3.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center justify-between transition-all cursor-pointer shrink-0 lg:w-full whitespace-nowrap gap-3 ${
              activeTab === "licenses"
                ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-inner"
                : "text-[#bbcabf] hover:text-white hover:bg-[#181c1a] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4" />
              <span>Minhas Licenças</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0b0f0d] text-[#10b981] font-bold">
              {licenses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("downloads")}
            className={`p-3.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center justify-between transition-all cursor-pointer shrink-0 lg:w-full whitespace-nowrap gap-3 ${
              activeTab === "downloads"
                ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-inner"
                : "text-[#bbcabf] hover:text-white hover:bg-[#181c1a] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4" />
              <span>Loader &amp; Downloads</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            className={`p-3.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center justify-between transition-all cursor-pointer shrink-0 lg:w-full whitespace-nowrap gap-3 ${
              activeTab === "orders"
                ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-inner"
                : "text-[#bbcabf] hover:text-white hover:bg-[#181c1a] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4" />
              <span>Histórico de Pedidos</span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[#0b0f0d] text-[#86948a]">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`p-3.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] flex items-center justify-between transition-all cursor-pointer shrink-0 lg:w-full whitespace-nowrap gap-3 ${
              activeTab === "settings"
                ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 shadow-inner"
                : "text-[#bbcabf] hover:text-white hover:bg-[#181c1a] border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4" />
              <span>Segurança &amp; Perfil</span>
            </div>
          </button>
        </aside>

        {/* WORKSPACE (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* BANNER DISCORD VÍNCULO 1:1 */}
          {clientProfile && !clientProfile.discordId && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#5865F2]/20 via-[#5865F2]/10 to-transparent border border-[#5865F2]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#5865F2] flex items-center justify-center text-white shrink-0 shadow-lg shadow-[#5865F2]/30">
                  <span className="text-xl">🎮</span>
                </div>
                <div>
                  <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
                    <span>Vincular Conta Discord Oficial</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#5865F2]/20 text-[#7983F5] font-bold">
                      CARGO VERIFICADO AUTOMÁTICO
                    </span>
                  </h4>
                  <p className="text-xs text-[#86948a] font-['Geist']">
                    Vincule seu Discord (1:1) para receber automaticamente o cargo de Cliente e acesso aos canais privados do loader.
                  </p>
                </div>
              </div>
              <a
                href="/api/discord/connect"
                className="px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-md shadow-[#5865F2]/30 flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
              >
                <span>Conectar com Discord</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* TAB 1: LICENSES */}
          {activeTab === "licenses" && (
            <div className="space-y-6">
              
              {/* Header Registry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#10b981] uppercase font-bold tracking-widest">
                    LICENÇAS ATIVAS
                  </span>
                  <span className="text-white/20">/</span>
                  <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Softwares Vinculados à Conta
                  </h2>
                </div>

                <button
                  onClick={() => {
                    setRedeemModalOpen(true);
                    setRedeemErrorMsg(null);
                    setRedeemSuccessMsg(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] text-xs font-bold font-['Space_Grotesk'] flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Resgatar Chave Digital</span>
                </button>
              </div>

              {loadingLicenses ? (
                <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                  <span>Carregando suas licenças criptografadas...</span>
                </div>
              ) : licenses.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center text-xs font-mono space-y-3">
                  <Key className="w-8 h-8 text-[#10b981] mx-auto opacity-70" />
                  <p className="text-white font-bold font-['Space_Grotesk'] text-sm">Nenhuma licença ativa no momento</p>
                  <p className="text-[#86948a] max-w-sm mx-auto font-['Geist']">
                    Adquira seu software na loja com entrega instantânea ou resgate um código avulso recebido de um revendedor.
                  </p>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Link
                      href="/"
                      className="px-4 py-2 rounded-xl bg-[#10b981] text-[#050706] font-bold text-xs"
                    >
                      Explorar Vitrine
                    </Link>
                    <button
                      onClick={() => setRedeemModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs hover:bg-white/10"
                    >
                      Resgatar Código
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {licenses.map((lic) => {
                    const isActive = lic.status === "ACTIVE";
                    const isFrozen = lic.status === "FROZEN";
                    const isNotActivated = lic.status === "NOT_ACTIVATED";
                    const isExpired = lic.status === "EXPIRED";
                    const isRevoked = lic.status === "REVOKED";

                    return (
                      <div
                        key={lic.id}
                        className={`rounded-2xl p-6 border shadow-[0_4px_30px_rgba(0,0,0,0.6)] relative overflow-hidden transition-all ${
                          isFrozen
                            ? "bg-[#0b0f0d] border-cyan-500/30 hover:border-cyan-500/50"
                            : isActive
                            ? "bg-[#0b0f0d] border-[#10b981]/25 hover:border-[#10b981]/45"
                            : isRevoked
                            ? "bg-[#0b0f0d] border-rose-500/30 opacity-70"
                            : "bg-[#0b0f0d] border-white/8 hover:border-white/15"
                        }`}
                      >
                        {/* Top Line Gradient */}
                        <div
                          className={`absolute top-0 left-0 right-0 h-[2px] ${
                            isFrozen
                              ? "bg-gradient-to-r from-cyan-400 via-cyan-600 to-transparent"
                              : isActive
                              ? "bg-gradient-to-r from-[#10b981] via-[#34d399] to-transparent"
                              : isRevoked
                              ? "bg-gradient-to-r from-rose-500 to-transparent"
                              : "bg-gradient-to-r from-white/20 to-transparent"
                          }`}
                        />

                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                          
                          {/* Specs Left */}
                          <div className="space-y-3 max-w-xl">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {isActive && (
                                <span className="px-2 py-0.5 rounded bg-[#10b981]/15 border border-[#10b981]/40 text-[#10b981] font-mono text-[10px] font-bold flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping" />
                                  ATIVA
                                </span>
                              )}
                              {isFrozen && (
                                <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] font-bold flex items-center gap-1.5">
                                  <PauseCircle className="w-3 h-3 text-cyan-400" />
                                  PAUSADA (FREEZE TIME)
                                </span>
                              )}
                              {isNotActivated && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold">
                                  NÃO ATIVADA (Inicia ao abrir no loader)
                                </span>
                              )}
                              {isExpired && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-bold">
                                  EXPIRADA
                                </span>
                              )}
                              {isRevoked && (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono text-[10px] font-bold">
                                  REVOGADA
                                </span>
                              )}

                              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                                {lic.productName}
                              </h3>
                              <span className="font-mono text-xs text-[#86948a]">
                                ({lic.variantName})
                              </span>
                            </div>

                            {/* Key Display Row */}
                            <div className="flex items-center gap-3 bg-[#101412] px-3.5 py-2 rounded-xl border border-white/5 w-fit">
                              <span className="font-mono text-[11px] text-[#86948a]">CHAVE:</span>
                              <span className="font-mono text-xs text-white tracking-wider font-semibold">
                                {lic.key}
                              </span>
                              <button
                                onClick={() => handleCopy(lic.key)}
                                className="text-[#86948a] hover:text-[#10b981] transition-colors p-1 cursor-pointer"
                                title="Copiar Chave"
                              >
                                {copiedKey === lic.key ? (
                                  <Check className="w-3.5 h-3.5 text-[#10b981]" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {/* HWID & Expiry line */}
                            <div className="flex items-center gap-6 text-xs text-[#bbcabf] font-mono flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#10b981]" />
                                <span className={lic.hasHwid ? "text-[#10b981]" : "text-amber-400"}>
                                  HWID: {lic.hasHwid ? `VINCULADO (${lic.hwid})` : "LIVRE (Pronto para vincular)"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[#45dfa4]">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Validade: {lic.expiresFormatted}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right Actions */}
                          <div className="flex items-center gap-2.5 flex-wrap xl:self-center">
                            <button
                              onClick={() => handleOpenHwidModal(lic)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#181c1a] hover:bg-[#272b28] text-white border border-white/10 hover:border-[#10b981]/30 transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#45dfa4]" />
                              <span>Resetar HWID</span>
                            </button>

                            <a
                              href="https://discord.gg/gqMDjvaSC"
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all flex items-center gap-1.5"
                              title="Suporte e instruções de ativação no Discord Oficial"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#10b981]" />
                              <span>Instruções &amp; Suporte</span>
                            </a>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* TAB 2: DOWNLOADS */}
          {activeTab === "downloads" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-white/8">
                <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                  Central de Downloads &amp; Binários Criptografados
                </h2>
                <p className="text-xs text-[#bbcabf]">
                  Distribuição e verificação de arquivos executáveis oficiais.
                </p>
              </div>

              <div className="rounded-2xl bg-[#0b0f0d] p-8 border border-white/8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 border border-[#10b981]/25 flex items-center justify-center text-[#10b981]">
                  <Download className="w-7 h-7 opacity-75" />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                    Nenhum Loader Disponível para Download
                  </h3>
                  <p className="text-xs text-[#86948a] font-sans leading-relaxed">
                    No momento não há arquivos executáveis disponíveis para download direto. Novos binários e atualizações de injeção são anunciados e distribuídos diretamente nos canais oficiais de comunicação.
                  </p>
                </div>
                <a
                  href="https://discord.gg/gqMDjvaSC"
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-[#10b981]" />
                  <span>Acompanhar Comunicados no Discord</span>
                </a>
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-white/8">
                <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                  Histórico de Pedidos &amp; Recibos
                </h2>
                <p className="text-xs text-[#bbcabf]">
                  Todas as ordens de compra efetuadas no PostgreSQL com status em tempo real.
                </p>
              </div>

              {loadingOrders ? (
                <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
                  <span>Carregando histórico de pedidos do banco...</span>
                </div>
              ) : orders.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center text-xs font-mono text-[#86948a] space-y-2">
                  <ShoppingBag className="w-8 h-8 text-[#10b981] mx-auto opacity-70" />
                  <p className="text-white font-bold font-['Space_Grotesk']">Nenhum pedido realizado ainda</p>
                  <Link href="/" className="inline-block mt-2 text-[#10b981] hover:underline">
                    Ir para a vitrine de produtos →
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl bg-[#0b0f0d] border border-white/8 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono min-w-[640px]">
                      <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                        <tr>
                          <th className="p-4">PEDIDO</th>
                          <th className="p-4">PRODUTO &amp; PLANO</th>
                          <th className="p-4">DATA</th>
                          <th className="p-4">MÉTODO</th>
                          <th className="p-4">VALOR</th>
                          <th className="p-4">STATUS</th>
                          <th className="p-4 text-right">AÇÃO</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-[#e0e3df]">
                        {orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-white/[0.02]">
                            <td className="p-4 text-[#10b981] font-bold">{ord.orderNumber}</td>
                            <td className="p-4 font-sans font-semibold text-white">
                              {ord.productName} ({ord.variantName})
                            </td>
                            <td className="p-4 text-[#86948a]">{ord.createdAt}</td>
                            <td className="p-4">{ord.paymentMethod}</td>
                            <td className="p-4 text-[#10b981] font-bold">{ord.amountFormatted}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                ord.status === "COMPLETED"
                                  ? "bg-[#10b981]/15 text-[#10b981]"
                                  : ord.status === "PENDING"
                                  ? "bg-amber-500/15 text-amber-300"
                                  : "bg-rose-500/15 text-rose-300"
                              }`}>
                                {ord.status === "COMPLETED" ? "CONCLUÍDO" : ord.status === "PENDING" ? "PENDENTE" : ord.status}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {ord.status === "COMPLETED" && (
                                  <>
                                    {ord.hasReview ? (
                                      <span
                                        className={`px-2 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                                          ord.reviewStatus === "PUBLISHED"
                                            ? "bg-[#10b981]/15 text-[#10b981]"
                                            : "bg-amber-500/15 text-amber-300"
                                        }`}
                                        title={
                                          ord.reviewStatus === "PUBLISHED"
                                            ? "Avaliação aprovada e visível publicamente"
                                            : "Avaliação enviada, aguardando moderação"
                                        }
                                      >
                                        <Star className="w-2.5 h-2.5 fill-current" />
                                        <span>
                                          {ord.reviewStatus === "PUBLISHED"
                                            ? `Avaliado (${ord.reviewRating || 5}★)`
                                            : "Em Análise"}
                                        </span>
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleOpenReviewModal(ord)}
                                        className="px-2.5 py-1.5 rounded-lg bg-[#10b981]/20 hover:bg-[#10b981]/30 text-[#10b981] font-['Space_Grotesk'] text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        <Star className="w-3 h-3 fill-current" />
                                        <span>Avaliar Compra</span>
                                      </button>
                                    )}
                                  </>
                                )}

                                <Link
                                  href={`/order/${ord.id}`}
                                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold inline-flex items-center gap-1 transition-colors"
                                >
                                  <span>Ver</span>
                                  <ExternalLink className="w-3 h-3 text-[#10b981]" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-white/8">
                <h2 className="font-['Space_Grotesk'] text-base font-bold text-white">
                  Segurança da Conta &amp; HWID
                </h2>
                <p className="text-xs text-[#bbcabf]">
                  Gerencie sua senha mestre e regras de hardware vinculadas.
                </p>
              </div>

              <div className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 space-y-4">
                <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                  Dados de Identificação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-[#86948a] block mb-1">E-MAIL VINCULADO:</label>
                    <input
                      type="text"
                      disabled
                      value={user?.email || ""}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050706] border border-white/10 text-[#86948a] opacity-80"
                    />
                  </div>
                  <div>
                    <label className="text-[#86948a] block mb-1">USUÁRIO:</label>
                    <input
                      type="text"
                      disabled
                      value={`@${user?.username || ""}`}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#050706] border border-white/10 text-[#86948a] opacity-80"
                    />
                  </div>
                </div>
              </div>

              {/* CARD DE VÍNCULO DISCORD 1:1 */}
              <div className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/8">
                  <div>
                    <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-[#5865F2] font-mono">#</span>
                      <span>Vínculo com Discord (1:1)</span>
                    </h3>
                    <p className="text-xs text-[#86948a] font-['Geist'] mt-0.5">
                      Sincronização de Cargo Verificado e acesso aos canais oficiais da comunidade Overclock.
                    </p>
                  </div>
                  {clientProfile?.discordId ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30">
                      CONECTADO
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/5 text-[#86948a] border border-white/10">
                      DESCONECTADO
                    </span>
                  )}
                </div>

                {clientProfile?.discordId ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#050706] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#5865F2]/20 border border-[#5865F2]/40 flex items-center justify-center text-[#5865F2] font-bold">
                        🎮
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{clientProfile.discordTag || "Discord User"}</span>
                          <span className="text-[10px] font-mono text-[#5865F2] bg-[#5865F2]/10 px-1.5 py-0.5 rounded">
                            ID: {clientProfile.discordId}
                          </span>
                        </div>
                        <p className="text-xs text-[#86948a]">
                          Cargos sincronizados automaticamente com suas compras ativas.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDisconnectDiscord}
                      disabled={disconnectingDiscord}
                      className="px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    >
                      {disconnectingDiscord ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Desvincular Discord</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#050706] border border-white/5">
                    <div>
                      <p className="text-xs text-[#bbcabf] font-['Geist'] leading-relaxed">
                        Nenhuma conta Discord vinculada à sua licença. Conecte sua conta para receber o cargo de Verificado nos servidores oficiais e suporte ágil.
                      </p>
                      <p className="text-[11px] text-[#86948a] font-mono mt-1">
                        * Regra 1:1 estrita: Uma conta Discord só pode ser vinculada a uma conta Overclock Store.
                      </p>
                    </div>
                    <a
                      href="/api/discord/connect"
                      className="px-4 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#5865F2] hover:bg-[#4752C4] text-white transition-all shadow-md shadow-[#5865F2]/30 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>Conectar Discord</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* MODAL 1: REQUEST HWID RESET */}
      {hwidModalOpen && selectedLicenseForHwid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-[#10b981]" />
                <span>Solicitar Desvinculação de HWID</span>
              </h3>
              <button
                onClick={() => setHwidModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {hwidErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-['Geist']">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{hwidErrorMsg}</span>
              </div>
            )}

            {hwidSuccessMsg ? (
              <div className="p-4 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white">Reset Concluído!</h4>
                <p className="text-xs text-[#bbcabf]">
                  {hwidSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitHwidReset} className="space-y-4">
                <div className="text-xs text-[#bbcabf] space-y-1.5 font-['Geist']">
                  <p>
                    <strong>Software:</strong> {selectedLicenseForHwid.productName}
                  </p>
                  <p className="font-mono text-[11px]">
                    <strong>HWID Atual:</strong>{" "}
                    <span className="text-[#10b981]">{selectedLicenseForHwid.hwid || "NÃO VINCULADO"}</span>
                  </p>
                  <p className="text-[#86948a] text-[11px] leading-relaxed pt-1">
                    Permitido 1 reset a cada 7 dias de acordo com as diretrizes anti-compartilhamento de licenças.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#86948a] block mb-1">
                    MOTIVO DA TROCA DE HARDWARE:
                  </label>
                  <textarea
                    required
                    value={hwidReason}
                    onChange={(e) => setHwidReason(e.target.value)}
                    placeholder="Ex: Troca de GPU / Formatação do Windows"
                    rows={3}
                    className="w-full p-3 rounded-xl bg-[#050706] border border-white/10 text-xs text-white focus:outline-none focus:border-[#10b981] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setHwidModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[#86948a] hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={hwidLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] hover:bg-[#34d399] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {hwidLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Reset</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: RESGATAR KEY AVULSA */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-[#10b981]" />
                <span>Resgatar Licença Digital</span>
              </h3>
              <button
                onClick={() => setRedeemModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {redeemErrorMsg && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 font-['Geist']">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{redeemErrorMsg}</span>
              </div>
            )}

            {redeemSuccessMsg ? (
              <div className="p-4 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white">Chave Resgatada com Sucesso!</h4>
                <p className="text-xs text-[#bbcabf]">
                  {redeemSuccessMsg}
                </p>
              </div>
            ) : (
              <form onSubmit={handleRedeemKey} className="space-y-4">
                <p className="text-xs text-[#bbcabf] font-['Geist'] leading-relaxed">
                  Insira o código de ativação fornecido por revendedores autorizados ou recebido da Staff:
                </p>

                <div>
                  <label className="text-xs font-mono text-[#86948a] block mb-1">
                    CÓDIGO DA CHAVE:
                  </label>
                  <input
                    type="text"
                    required
                    value={redeemKeyInput}
                    onChange={(e) => setRedeemKeyInput(e.target.value)}
                    placeholder="OVERCLOCK-XXXX-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-xs font-mono uppercase text-[#10b981] focus:outline-none focus:border-[#10b981] tracking-wider font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setRedeemModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[#86948a] hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={redeemLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] hover:bg-[#34d399] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    {redeemLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Vincular à Conta</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: AVALIAR COMPRA */}
      {reviewModalOpen && selectedOrderForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-2xl bg-[#0b0f0d] max-w-md w-full p-6 border border-white/15 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span>Avaliar Compra</span>
              </h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-500 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reviewSuccessMsg ? (
              <div className="p-4 rounded-xl bg-[#10b981]/15 border border-[#10b981]/30 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto" />
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                  Avaliação Enviada!
                </h4>
                <p className="text-xs text-[#bbcabf] leading-relaxed">
                  {reviewSuccessMsg}
                </p>
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] hover:bg-[#34d399] transition-colors cursor-pointer"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <div className="text-[11px] font-mono text-[#86948a] uppercase">PRODUTO ADQUIRIDO:</div>
                  <div className="text-xs font-bold text-white font-['Space_Grotesk']">
                    {selectedOrderForReview.productName} ({selectedOrderForReview.variantName})
                  </div>
                  <div className="text-[10px] font-mono text-[#10b981]">
                    Pedido: {selectedOrderForReview.orderNumber}
                  </div>
                </div>

                {reviewErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{reviewErrorMsg}</span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-mono text-[#86948a] block mb-2">
                    SUA NOTA (1 A 5 ESTRELAS):
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                      >
                        <Star
                          className={`w-6 h-6 transition-colors ${
                            star <= reviewRating
                              ? "text-amber-400 fill-current"
                              : "text-white/20"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-mono font-bold text-white ml-2">
                      {reviewRating} de 5
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-mono text-[#86948a] block mb-1">
                    SEU COMENTÁRIO (EXPERIÊNCIA COM O SOFTWARE):
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Conte o que achou da instalação, suporte e funcionamento..."
                    maxLength={1000}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#050706] border border-white/10 text-xs text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981] resize-none"
                  />
                  <div className="text-[10px] font-mono text-[#86948a] text-right mt-1">
                    {reviewComment.length} / 1000 caracteres (mín. 3)
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-[#86948a] leading-relaxed">
                  🛡️ Sua avaliação receberá a badge <strong className="text-white">Compra Verificada</strong> após moderação pela equipe da Overclock Store.
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs text-[#86948a] hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] text-[#050706] hover:bg-[#34d399] transition-colors shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {reviewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar Avaliação</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
