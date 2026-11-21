"use client";

import { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Shield, 
  Lock, 
  CheckCircle2, 
  User, 
  Mail, 
  Key, 
  QrCode, 
  CreditCard, 
  Coins, 
  ArrowRight, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Bolt,
  EyeOff,
  Sparkles,
  Loader2,
  Tag
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { signIn } from "next-auth/react";
import { Badge } from "@/components/ui/Badge";

interface CheckoutPageProps {
  params: Promise<{ variantId: string }>;
}

interface ProductVariantData {
  id: string;
  name: string;
  durationValue: number;
  durationType: string;
  priceCents: number;
  stockCount: number;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  category: string;
  images: string[];
  variants: ProductVariantData[];
}

function CheckoutContent({ params }: CheckoutPageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get("coupon");
  const { user, isLoggedIn, logout } = useAuth();

  const [loadingProduct, setLoadingProduct] = useState(true);
  const [targetProduct, setTargetProduct] = useState<ProductData | null>(null);
  const [targetVariant, setTargetVariant] = useState<ProductVariantData | null>(null);
  const [imgError, setImgError] = useState(false);

  // Campos de Formulário para visitante
  const [authMode, setAuthMode] = useState<"register" | "login">("register");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Estados para Login Inline no Step 01
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Método de Pagamento Selecionado
  const [paymentMethod] = useState<"PIX">("PIX");
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cupons Reais do Banco
  const [couponCodeInput, setCouponCodeInput] = useState("");
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    discountCents: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Validação Real do Cupom no PostgreSQL
  const applyCouponCode = async (codeToApply: string, amountCents?: number) => {
    if (!codeToApply.trim()) return;

    setValidatingCoupon(true);
    setCouponError(null);

    const priceToUse = amountCents !== undefined ? amountCents : (targetVariant?.priceCents || 2490);

    try {
      const res = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: codeToApply.trim(),
          orderAmountCents: priceToUse,
          userId: user?.id,
          email: email.trim() || user?.email,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Cupom inválido ou expirado.");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          id: data.coupon.id,
          code: data.coupon.code,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
          discountCents: data.discountCents,
        });
        setCouponCodeInput(data.coupon.code);
        setCouponError(null);
      }
    } catch (err: any) {
      setCouponError("Erro de conexão ao validar cupom.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    await applyCouponCode(couponCodeInput);
  };

  // Login Inline no Step 01
  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    if (!loginIdentifier.trim() || !loginPassword) {
      setLoginError("Informe seu usuário/e-mail e senha.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await signIn("credentials", {
        redirect: false,
        identifier: loginIdentifier.trim(),
        password: loginPassword,
      });

      if (!res || res.error) {
        setLoginError(res?.error || "Credenciais incorretas. Verifique usuário e senha.");
        setLoginLoading(false);
        return;
      }

      // Hard reload para aplicar a sessão autenticada com cookies sincronizados
      window.location.reload();
    } catch (err: any) {
      setLoginError(err.message || "Erro de conexão ao realizar login.");
      setLoginLoading(false);
    }
  };

  // Carrega dados da variante e produto do banco + Auto-aplica cupom da URL
  useEffect(() => {
    async function loadVariantData() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          const prods: ProductData[] = data.products || [];

          let found = false;
          let matchedVariant: ProductVariantData | null = null;
          for (const p of prods) {
            const v = p.variants?.find((varItem) => varItem.id === resolvedParams.variantId);
            if (v) {
              setTargetProduct(p);
              setTargetVariant(v);
              matchedVariant = v;
              found = true;
              break;
            }
          }

          // Fallback resiliente para garantir que nunca quebre caso acesse uma variante antiga
          if (!found && prods.length > 0) {
            setTargetProduct(prods[0]);
            if (prods[0].variants && prods[0].variants.length > 0) {
              matchedVariant = prods[0].variants[0];
              setTargetVariant(matchedVariant);
            }
          }

          // Auto-aplica cupom vindo da página de produto se houver
          if (initialCoupon) {
            const priceForCoupon = matchedVariant ? matchedVariant.priceCents : 2490;
            applyCouponCode(initialCoupon, priceForCoupon);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados do produto para checkout:", err);
      } finally {
        setLoadingProduct(false);
      }
    }
    loadVariantData();
  }, [resolvedParams.variantId, initialCoupon]);

  // Submissão do Checkout com Reserva Atômica no PostgreSQL
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAccepted) {
      setErrorMessage("Por favor, aceite os termos de uso antes de finalizar a compra.");
      return;
    }

    const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

    if (!isLoggedIn) {
      if (authMode === "login") {
        setErrorMessage("Por favor, autentique sua conta no formulário de login acima ou alterne para 'Criar nova conta'.");
        return;
      }

      if (!email || !EMAIL_REGEX.test(email.trim())) {
        setErrorMessage("Por favor, informe um endereço de e-mail válido (ex: seu_email@dominio.com).");
        return;
      }

      if (!username || username.trim().length < 3) {
        setErrorMessage("O nome de usuário deve conter no mínimo 3 caracteres.");
        return;
      }

      if (!password || password.trim().length < 6) {
        setErrorMessage("A senha de acesso deve conter no mínimo 6 caracteres.");
        return;
      }
    }

    setIsProcessing(true);

    try {
      const payload = {
        variantId: resolvedParams.variantId,
        gateway: "MERCADOPAGO",
        method: "PIX",
        couponCode: appliedCoupon?.code,
        email: email.trim(),
        fullName: fullName.trim(),
        username: username.trim(),
        password: password.trim(),
      };

      const res = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao processar reserva atômica de estoque.");
      }

      // Se uma nova conta foi criada durante o checkout, faz login automático (signIn)
      if (!isLoggedIn && email.trim() && password.trim()) {
        try {
          await signIn("credentials", {
            redirect: false,
            identifier: email.trim(),
            password: password.trim(),
          });
        } catch (authErr) {
          console.warn("Auto-login após checkout falhou silenciosamente:", authErr);
        }
      }

      // Redireciona para a tela do pedido com QR Code ou Gateway
      router.push(`/order/${data.orderId}`);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro inesperado ao gerar pedido.");
      setIsProcessing(false);
    }
  };

  if (loadingProduct) {
    return (
      <div className="max-w-6xl mx-auto p-16 text-center text-xs text-[#10b981] font-mono flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
        <span>Conectando com o cluster de checkout seguro...</span>
      </div>
    );
  }

  const prodName = targetProduct?.name || "Software Overclock";
  const prodSlug = targetProduct?.slug || "";
  const prodCategory = targetProduct?.category || "FPS Tático";
  const prodImage = targetProduct?.images?.[0] || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200";
  const varName = targetVariant?.name || "Licença Digital";
  const rawPriceCents = targetVariant?.priceCents || 2490;
  const rawPrice = rawPriceCents / 100;
  const discountCents = appliedCoupon ? appliedCoupon.discountCents : 0;
  const finalPriceCents = Math.max(0, rawPriceCents - discountCents);
  const finalPrice = finalPriceCents / 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      
      {/* Breadcrumb Stitch */}
      <nav className="flex items-center gap-2 text-xs font-mono text-[#86948a]">
        <Link href="/" className="hover:text-[#10b981]">INÍCIO</Link>
        <span>/</span>
        <Link href={`/products/${prodSlug}`} className="hover:text-[#10b981]">
          {prodName}
        </Link>
        <span>/</span>
        <span className="text-[#10b981] font-bold">PAGAMENTO</span>
      </nav>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-xs text-rose-300 font-['Geist'] animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ==================================================== */}
        {/* LEFT COLUMN: CHECKOUT FLOW (7 cols)                  */}
        {/* ==================================================== */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* STEP 1: ACCOUNT DETAILS */}
          <section className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-[#10b981]/20 text-[#10b981] font-mono font-bold text-xs flex items-center justify-center">
                  01
                </span>
                <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                  Identificação da Conta
                </h3>
              </div>

              {isLoggedIn ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#10b981] font-mono text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  AUTENTICADO
                </span>
              ) : (
                <span className="font-mono text-[10px] text-[#10b981] font-bold">
                  CONTA OBRIGATÓRIA
                </span>
              )}
            </div>

            {isLoggedIn && user ? (
              <div className="p-4 rounded-xl bg-[#101412] border border-white/8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#047857] flex items-center justify-center text-[#050706] font-bold text-sm">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{user.fullName}</span>
                      <span className="font-mono text-xs text-[#10b981]">@{user.username}</span>
                    </div>
                    <span className="text-xs text-[#86948a] font-mono">{user.email}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-[#86948a] block">
                    Licença vinculada a esta conta
                  </span>
                  <button
                    onClick={() => logout()}
                    className="text-xs text-[#10b981] hover:underline font-medium cursor-pointer"
                  >
                    Trocar conta
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {/* Seletor de Modo: Criar Conta vs Já tenho conta */}
                <div className="p-1 rounded-xl bg-[#050706] border border-white/8 grid grid-cols-2 gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("register");
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      authMode === "register"
                        ? "bg-[#10b981] text-[#050706] shadow-md shadow-[#10b981]/20"
                        : "text-[#86948a] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Criar Nova Conta</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      authMode === "login"
                        ? "bg-[#10b981] text-[#050706] shadow-md shadow-[#10b981]/20"
                        : "text-[#86948a] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Já tenho conta (Entrar)</span>
                  </button>
                </div>

                {/* PAINEL 1: CRIAR NOVA CONTA */}
                {authMode === "register" && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">
                          NOME COMPLETO (OPCIONAL):
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex: João da Silva"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">
                          NOME DE USUÁRIO <span className="text-[#10b981]">*</span>:
                        </label>
                        <input
                          type="text"
                          required
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Ex: joaosilva (mín. 3 chars)"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">
                          E-MAIL PARA ENTREGA <span className="text-[#10b981]">*</span>:
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu_email@exemplo.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">
                          CRIAR SENHA DE ACESSO <span className="text-[#10b981]">*</span>:
                        </label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                    </div>

                    <span className="text-[10px] font-mono text-[#86948a] block pt-1">
                      ✓ Sua conta será cadastrada e autenticada automaticamente ao concluir o pedido.
                    </span>
                  </div>
                )}

                {/* PAINEL 2: LOGIN INLINE */}
                {authMode === "login" && (
                  <form onSubmit={handleInlineLogin} className="space-y-3 p-4 rounded-xl bg-[#050706] border border-white/8 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-1">
                      <span className="text-xs font-bold text-white font-['Space_Grotesk']">
                        Acesse sua conta Overclock Store
                      </span>
                      <Link
                        href={`/login?callbackUrl=/checkout/${resolvedParams.variantId}`}
                        className="text-[10px] text-[#10b981] hover:underline font-mono"
                      >
                        Abrir tela cheia de login →
                      </Link>
                    </div>

                    {loginError && (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-mono">
                        {loginError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">E-MAIL OU USERNAME:</label>
                        <input
                          type="text"
                          required
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="admin ou seu@email.com"
                          className="w-full px-3 py-2 rounded-xl bg-[#101412] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-[#86948a] block mb-1">SUA SENHA:</label>
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Sua senha secreta"
                          className="w-full px-3 py-2 rounded-xl bg-[#101412] border border-white/10 text-white font-mono text-xs focus:outline-none focus:border-[#10b981]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#86948a]">
                        Após entrar, o pedido será vinculado imediatamente ao seu usuário.
                      </span>
                      <button
                        type="submit"
                        disabled={loginLoading}
                        className="px-4 py-2 rounded-xl text-xs font-bold font-['Space_Grotesk'] bg-[#10b981] hover:bg-[#34d399] text-[#050706] shadow-md shadow-[#10b981]/25 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {loginLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>{loginLoading ? "Entrando..." : "Entrar na Conta"}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* STEP 2: PAYMENT METHOD */}
          <section className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-full bg-[#10b981]/20 text-[#10b981] font-mono font-bold text-xs flex items-center justify-center">
                02
              </span>
              <div>
                <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                  Método de Pagamento
                </h3>
                <span className="font-mono text-[10px] text-[#86948a]">
                  Liberação instantânea da chave após confirmação do gateway.
                </span>
              </div>
            </div>

            <div className="pt-2">
              <div className="p-4 rounded-xl border border-[#10b981] bg-[#10b981]/15 ring-1 ring-[#10b981]/30 shadow-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center shrink-0">
                    <QrCode className="w-5 h-5 text-[#10b981]" />
                  </div>
                  <div>
                    <span className="font-['Space_Grotesk'] text-sm font-bold text-white block">
                      Pix Instantâneo (Mercado Pago)
                    </span>
                    <span className="text-[11px] text-[#bbcabf] font-mono">
                      QR Code &amp; Copia e Cola • Liberação Imediata
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#10b981]/20 text-[#10b981] font-bold border border-[#10b981]/30">
                  ATIVO
                </span>
              </div>
            </div>

            {/* Termos de Serviço */}
            <div className="pt-4 border-t border-white/8 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="w-4 h-4 mt-0.5 accent-[#10b981] rounded cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-[#86948a] font-['Geist'] leading-relaxed cursor-pointer">
                Concordo com os Termos de Serviço, com o protocolo de congelamento automático (Freeze Time) em caso de atualização de jogo e política de não-reembolso após consumo da chave.
              </label>
            </div>
          </section>

        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: ORDER SUMMARY & ATOMIC LOCK (5 cols)   */}
        {/* ==================================================== */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
          <div className="rounded-2xl bg-[#0b0f0d] p-6 sm:p-8 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
            
            {/* Top Indicator Highlight */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#10b981] to-transparent opacity-80" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/8">
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                Resumo do Pedido
              </h3>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-[#181c1a] text-[#10b981]">
                <Lock className="w-3 h-3" />
                RESERVA ATÔMICA
              </span>
            </div>

            {/* Product Item */}
            <div className="flex items-center gap-3.5">
              <img
                src={imgError || !prodImage ? "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop" : prodImage}
                alt={prodName}
                onError={() => setImgError(true)}
                className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0 bg-[#181c1a]"
              />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[10px] text-[#10b981] uppercase block">
                  {prodCategory}
                </span>
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white truncate">
                  {prodName}
                </h4>
                <span className="text-xs text-[#86948a] font-mono">
                  {varName}
                </span>
              </div>

              <div className="text-right">
                <span className="font-['Space_Grotesk'] text-sm font-bold text-white">
                  R$ {rawPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Cupom de Desconto */}
            <div className="pt-2 border-t border-white/8 space-y-2">
              <label className="text-[11px] font-mono text-[#86948a] flex items-center justify-between">
                <span>CUPOM PROMOCIONAL:</span>
                {appliedCoupon && (
                  <span className="text-[#10b981] font-bold">
                    -{appliedCoupon.discountType === "PERCENTAGE" ? `${appliedCoupon.discountValue}%` : `R$ ${(appliedCoupon.discountCents / 100).toFixed(2)}`} APLICADO
                  </span>
                )}
              </label>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCodeInput}
                  onChange={(e) => {
                    setCouponCodeInput(e.target.value);
                    if (couponError) setCouponError(null);
                  }}
                  placeholder="DIGITE SEU CUPOM"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-white font-mono text-xs uppercase focus:outline-none focus:border-[#10b981]"
                />
                <button
                  type="submit"
                  disabled={validatingCoupon}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-['Space_Grotesk'] font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {validatingCoupon ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
                  <span>Aplicar</span>
                </button>
              </form>

              {couponError && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-300 text-[11px] font-mono animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{couponError}</span>
                </div>
              )}
            </div>

            {/* Breakdown */}
            <div className="space-y-2 border-t border-white/8 pt-4 text-xs font-mono">
              <div className="flex justify-between text-[#86948a]">
                <span>SUBTOTAL</span>
                <span>R$ {rawPrice.toFixed(2).replace(".", ",")}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-[#10b981]">
                  <span>DESCONTO ({appliedCoupon.code})</span>
                  <span>- R$ {(discountCents / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              )}

              <div className="flex justify-between text-[#86948a]">
                <span>TAXA DE ENVIO IMEDIATO</span>
                <span className="text-[#10b981]">GRÁTIS (R$ 0,00)</span>
              </div>

              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/8 font-['Space_Grotesk']">
                <span>TOTAL A PAGAR</span>
                <span className="text-xl text-[#10b981]">
                  R$ {finalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleCheckoutSubmit}
              disabled={isProcessing}
              className="w-full py-4 px-6 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] font-['Space_Grotesk'] text-sm font-bold transition-all shadow-[0_0_28px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reservando Chave Atômica...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Prosseguir para Pagamento — R$ {finalPrice.toFixed(2).replace(".", ",")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* 3 Badges de Segurança */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5 font-mono text-[9px] text-[#86948a] text-center">
              <div className="flex flex-col items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-[#10b981]" />
                <span>SSL 256-Bit</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Bolt className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Envio Imediato</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <EyeOff className="w-3.5 h-3.5 text-[#10b981]" />
                <span>Privacidade Total</span>
              </div>
            </div>

          </div>
        </aside>

      </div>

    </div>
  );
}

export default function CheckoutPage(props: CheckoutPageProps) {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto p-12 text-center text-xs text-[#10b981] font-mono">Carregando ambiente de checkout seguro...</div>}>
      <CheckoutContent {...props} />
    </Suspense>
  );
}
