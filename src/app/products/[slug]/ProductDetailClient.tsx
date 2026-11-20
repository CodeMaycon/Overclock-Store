"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Shield, 
  CheckCircle2, 
  Cpu, 
  AlertTriangle, 
  ArrowRight, 
  ExternalLink,
  Eye,
  Copy,
  Check,
  Terminal,
  Lock,
  Play,
  AlertCircle
} from "lucide-react";
import { MOCK_CHANGELOGS } from "@/lib/mock-data";

export interface FormattedVariant {
  id: string;
  name: string;
  durationValue: number;
  durationType: string;
  priceCents: number;
  compareAtPriceCents?: number | null;
  stockCount: number;
}

export interface FormattedProduct {
  id: string;
  slug: string;
  name: string;
  category: string;
  tagline: string;
  fullDescription: string;
  status: string;
  videoUrl?: string | null;
  images: string[];
  specifications: {
    os: string;
    processor: string;
    anticheat: string;
    streamProof: string;
    [key: string]: any;
  };
  features: string[];
  currentVersion: string;
  isFeatured: boolean;
  stockCount: number;
  variants: FormattedVariant[];
  changelogs?: any[];
}

interface ProductDetailClientProps {
  product: FormattedProduct;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    product.variants?.[0]?.id || ""
  );
  const [activeMedia, setActiveMedia] = useState<"video" | number>(
    product.videoUrl ? "video" : 0
  );
  const [activeTab, setActiveTab] = useState<"overview" | "requirements" | "changelogs">("overview");
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscountCents, setCouponDiscountCents] = useState<number | null>(null);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [hashCopied, setHashCopied] = useState(false);

  const isDirectVideo = Boolean(
    product.videoUrl &&
    (product.videoUrl.match(/\.(mp4|webm|ogg)(\?.*)?$/i) ||
      (!product.videoUrl.includes("youtube") && !product.videoUrl.includes("youtu.be") && !product.videoUrl.includes("vimeo")))
  );

  const selectedVariant = product.variants?.find((v) => v.id === selectedVariantId) || product.variants?.[0] || {
    id: "default",
    name: "Licença",
    priceCents: 2490,
    stockCount: 10,
  };

  const isMaintenance = product.status === "MAINTENANCE";
  const productChangelogs = (product.changelogs && product.changelogs.length > 0) 
    ? product.changelogs 
    : MOCK_CHANGELOGS.filter((c) => c.productSlug === product.slug);

  const rawPrice = (selectedVariant.priceCents || 2490) / 100;
  const rawPriceCents = selectedVariant.priceCents || 2490;
  const finalPriceCents = Math.max(0, rawPriceCents - (couponDiscountCents || 0));
  const finalPrice = finalPriceCents / 100;

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) {
      setCouponError("Digite o código do cupom.");
      return;
    }

    setValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccessMessage(null);

    try {
      const res = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          orderAmountCents: selectedVariant.priceCents || 2490,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Cupom inválido ou expirado.");
        setCouponDiscountCents(null);
        setCouponSuccessMessage(null);
      } else {
        setCouponDiscountCents(data.discountCents || 0);
        setCouponSuccessMessage(`Cupom ${data.coupon.code} aplicado com sucesso!`);
        setCouponError(null);
      }
    } catch (err) {
      setCouponError("Erro de conexão ao validar cupom.");
      setCouponDiscountCents(null);
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCopyHash = () => {
    navigator.clipboard.writeText("9e107d9d372bb6826bd81d3542a419d6da4d092147f4f66299e98492023023e1");
    setHashCopied(true);
    setTimeout(() => setHashCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      
      {/* Breadcrumb Stitch Spec */}
      <nav className="flex items-center gap-2 text-xs font-mono text-[#86948a]">
        <Link href="/" className="hover:text-[#10b981] transition-colors">OVERCLOCK STORE</Link>
        <span className="text-white/20">/</span>
        <Link href="/products" className="hover:text-[#10b981] transition-colors">PRODUTOS</Link>
        <span className="text-white/20">/</span>
        <span className="text-[#10b981] font-bold uppercase">{product.slug}</span>
      </nav>

      {/* Main Grid: 2 Columns (7 cols left + 5 cols right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ==================================================== */}
        {/* LEFT COLUMN: ADAPTIVE MEDIA + SPECS + TABS (7 cols)  */}
        {/* ==================================================== */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Header Title & Tagline */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono uppercase px-2.5 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 font-bold">
                TIER-4 ENTERPRISE // {product.category}
              </span>
              <span className="text-xs font-mono text-[#86948a]">
                VERSÃO: {product.currentVersion}
              </span>
            </div>
            <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase">
              {product.name}
            </h1>
            <p className="mt-2 text-sm text-[#bbcabf] leading-relaxed font-['Geist']">
              {product.tagline}
            </p>
          </div>

          {/* -------------------------------------------------- */}
          {/* ADAPTIVE MEDIA INTERACTIVE STAGE (16:9)            */}
          {/* -------------------------------------------------- */}
          <div className="rounded-2xl bg-[#0b0f0d] border border-white/10 shadow-2xl overflow-hidden relative">
            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
              {activeMedia === "video" && product.videoUrl ? (
                isDirectVideo ? (
                  <video
                    src={product.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain bg-black"
                  />
                ) : (
                  <iframe
                    src={product.videoUrl}
                    title={`Demonstração ${product.name}`}
                    className="w-full h-full border-0 absolute inset-0 z-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                )
              ) : (
                <img
                  src={
                    typeof activeMedia === "number"
                      ? product.images?.[activeMedia] || product.images?.[0]
                      : product.images?.[0] || ""
                  }
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Botão de Retorno ao Vídeo se imagem ativa */}
              {activeMedia !== "video" && product.videoUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMedia("video")}
                  className="absolute top-4 right-4 z-10 flex items-center gap-1.5 font-mono text-[11px] bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-full text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/20 transition-all cursor-pointer shadow-lg"
                >
                  <Play className="w-3.5 h-3.5 fill-[#10b981]" />
                  <span>Voltar ao Vídeo</span>
                </button>
              )}

              {/* HUD Top Left */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 font-mono text-[10px] bg-[#0b0f0d]/80 backdrop-blur-md px-2.5 py-1 rounded text-[#e0e3df] border border-white/10 pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span>
                  {activeMedia === "video"
                    ? "TRANSMISSÃO_ATIVO // 4K 60FPS"
                    : `CAPTURA 0${(typeof activeMedia === "number" ? activeMedia : 0) + 1} // ALTA RESOLUÇÃO`}
                </span>
              </div>

              {/* HUD Top Right quando no vídeo */}
              {activeMedia === "video" && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 font-mono text-[10px] bg-[#0b0f0d]/80 backdrop-blur-md px-2.5 py-1 rounded text-[#10b981] border border-[#10b981]/20 pointer-events-none">
                  <Cpu className="w-3 h-3 text-[#10b981]" />
                  <span>SINCRONIA: 99.8% ESTÁVEL</span>
                </div>
              )}
            </div>

            {/* Gallery Thumbnail Strip (Com switch de vídeo e fotos) */}
            <div className="p-3 bg-[#050706] grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-white/8 overflow-x-auto">
              {/* Botão Vídeo se o produto tiver vídeo */}
              {product.videoUrl && (
                <button
                  type="button"
                  onClick={() => setActiveMedia("video")}
                  className={`text-left p-1.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    activeMedia === "video"
                      ? "bg-[#1c201e] border-[#10b981] ring-1 ring-[#10b981]/30"
                      : "bg-[#0b0f0d] border-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-black flex items-center justify-center border border-white/10">
                    <Play className="w-4 h-4 text-[#10b981] fill-[#10b981]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-white truncate block">
                      Trailer 4K
                    </span>
                    <span className="font-mono text-[9px] text-[#10b981] block">
                      VÍDEO PLAYER
                    </span>
                  </div>
                </button>
              )}

              {/* Miniaturas de Capturas */}
              {(product.images || []).map((img: string, idx: number) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveMedia(idx)}
                  className={`text-left p-1.5 rounded-xl border transition-all flex items-center gap-2.5 cursor-pointer ${
                    activeMedia === idx
                      ? "bg-[#1c201e] border-[#10b981] ring-1 ring-[#10b981]/30"
                      : "bg-[#0b0f0d] border-white/5 opacity-70 hover:opacity-100"
                  }`}
                >
                  <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-black">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-white truncate block">
                      Captura 0{idx + 1}
                    </span>
                    <span className="font-mono text-[9px] text-[#10b981] block">
                      PREVIEW 0{idx + 1}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* -------------------------------------------------- */}
          {/* HIGH-TECH MODULAR TAB CONTROLLER (STITCH SPEC)     */}
          {/* -------------------------------------------------- */}
          <div className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 space-y-6">
            {/* Tab Bar */}
            <div className="flex items-center gap-2 bg-[#181c1a] p-1.5 rounded-xl border border-white/5 overflow-x-auto">
              <button
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all whitespace-nowrap ${
                  activeTab === "overview"
                    ? "bg-[#272b28] text-[#10b981] shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                    : "text-[#bbcabf] hover:text-white"
                }`}
              >
                Visão Geral &amp; Recursos
              </button>
              <button
                onClick={() => setActiveTab("requirements")}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all whitespace-nowrap ${
                  activeTab === "requirements"
                    ? "bg-[#272b28] text-[#10b981] shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                    : "text-[#bbcabf] hover:text-white"
                }`}
              >
                Requisitos do Sistema
              </button>
              <button
                onClick={() => setActiveTab("changelogs")}
                className={`px-4 py-2 rounded-lg text-xs font-bold font-['Space_Grotesk'] transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  activeTab === "changelogs"
                    ? "bg-[#272b28] text-[#10b981] shadow-[0_0_16px_rgba(16,185,129,0.15)]"
                    : "text-[#bbcabf] hover:text-white"
                }`}
              >
                <span>Changelogs &amp; Versões</span>
                <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-[#10b981] text-[#050706] font-bold">
                  NOVO
                </span>
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 font-mono text-xs text-[#10b981] uppercase tracking-wider mb-2">
                    <Terminal className="w-4 h-4" />
                    <span>Arquitetura de Alta Performance</span>
                  </div>
                  <p className="text-sm text-[#e0e3df] leading-relaxed font-['Geist'] mb-3">
                    {product.fullDescription}
                  </p>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {(product.features || []).map((feat: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[#101412] border border-white/5 flex items-start gap-2.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                      <span className="text-xs text-[#bbcabf] font-medium">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* Cryptographic Build Seal (Stitch Spec) */}
                <div className="p-5 rounded-xl bg-[#101412] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#10b981]" />
                      <span className="text-xs font-bold text-white font-['Space_Grotesk']">
                        Selo de Autenticidade Criptográfica
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10b981]/15 text-[#10b981] font-bold">
                      ASSINATURA VERIFICADA
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#050706] border border-white/5 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[#86948a]">SHA-256:</span>
                      <code className="text-[#10b981] truncate max-w-xs">
                        9e107d9d372bb6826bd81d3542a419d6da4d092147f4f66299e98492023023e1
                      </code>
                    </div>
                    <button
                      onClick={handleCopyHash}
                      className="text-[#86948a] hover:text-[#10b981] transition-colors p-1"
                      title="Copiar Hash"
                    >
                      {hashCopied ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-[#86948a] pt-1">
                    <div className="p-2 rounded bg-[#050706] text-center">
                      <span>CHAVE PGP: 0x4EDE_A325</span>
                    </div>
                    <div className="p-2 rounded bg-[#050706] text-center">
                      <span>KERNEL: NTOSKRNL 10.0</span>
                    </div>
                    <div className="p-2 rounded bg-[#050706] text-center text-[#10b981]">
                      <span>STATUS: OPERACIONAL</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REQUIREMENTS */}
            {activeTab === "requirements" && (
              <div className="p-5 rounded-xl bg-[#101412] border border-white/8 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-[#10b981] font-bold">MATRIZ DE COMPATIBILIDADE DE SISTEMA</span>
                  <span className="px-2 py-0.5 rounded bg-[#10b981] text-[#050706] text-[10px] font-bold font-mono">
                    CONFIGURAÇÃO RECOMENDADA
                  </span>
                </div>

                <ul className="space-y-3 text-xs font-['Geist'] divide-y divide-white/5">
                  <li className="flex items-center justify-between pt-2">
                    <span className="text-[#86948a]">Sistema Operacional</span>
                    <span className="font-mono text-[#10b981] font-semibold">{product.specifications?.os || "Windows 10 / 11"}</span>
                  </li>
                  <li className="flex items-center justify-between pt-2">
                    <span className="text-[#86948a]">Processadores Compatíveis</span>
                    <span className="font-mono text-white font-semibold">{product.specifications?.processor || "Intel & AMD"}</span>
                  </li>
                  <li className="flex items-center justify-between pt-2">
                    <span className="text-[#86948a]">Anti-Cheat Alvo</span>
                    <span className="font-mono text-[#10b981] font-semibold">{product.specifications?.anticheat || "Kernel Driver"}</span>
                  </li>
                  <li className="flex items-center justify-between pt-2">
                    <span className="text-[#86948a]">Modo StreamProof (Invisível em Live)</span>
                    <span className="font-mono text-white font-semibold">{product.specifications?.streamProof || "100% Nativo"}</span>
                  </li>
                </ul>
              </div>
            )}

            {/* TAB 3: CHANGELOGS */}
            {activeTab === "changelogs" && (
              <div className="space-y-4">
                {productChangelogs.length > 0 ? (
                  productChangelogs.map((chg: any) => (
                    <div key={chg.id} className="p-4 rounded-xl bg-[#101412] border border-white/8 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-[#10b981]">{chg.version}</span>
                        <span className="font-mono text-[10px] text-[#86948a]">{chg.date || chg.releaseDate}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white font-['Space_Grotesk']">{chg.title}</h4>
                      <ul className="space-y-1 text-xs text-[#bbcabf] pl-4 list-disc marker:text-[#10b981]">
                        {(chg.changes || [chg.contentMarkdown || "Atualizações de segurança aplicadas."]).map((c: any, i: number) => (
                          <li key={i}>{typeof c === "string" ? c : JSON.stringify(c)}</li>
                        ))}
                      </ul>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#86948a]">Nenhum changelog recente registrado para este software.</p>
                )}
              </div>
            )}

          </div>

        </div>

        {/* ==================================================== */}
        {/* RIGHT COLUMN: OBSIDIAN PROCUREMENT CARD (5 cols)     */}
        {/* ==================================================== */}
        <aside className="lg:col-span-5 w-full lg:sticky lg:top-24">
          <div className="rounded-2xl bg-[#0b0f0d] p-6 sm:p-8 border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.7)] space-y-6 relative overflow-hidden">
            
            {/* Top Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-20 rounded-full bg-[#10b981]/20 blur-2xl pointer-events-none" />

            {/* Header com Health Indicator */}
            <div className="space-y-2 pb-4 border-b border-white/8">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-[#86948a] uppercase tracking-wider">
                  PROVISIONAMENTO SEGURO // TIER-4
                </span>

                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1c201e] text-[#10b981] font-mono text-[10px] font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-80" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]" />
                  </span>
                  <span>{isMaintenance ? "EM MANUTENÇÃO" : "OPERACIONAL"}</span>
                </div>
              </div>

              <h2 className="font-['Space_Grotesk'] text-2xl font-bold text-white tracking-tight">
                {product.name}
              </h2>
              <p className="font-mono text-[10px] text-[#86948a]">
                ARQ: x86_64 / RING-0 / SUPORTE 24/7
              </p>
            </div>

            {/* Alerta de Manutenção se ativo */}
            {isMaintenance && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Tempo Congelado (Freeze Time): compras realizadas agora terão sua contagem de tempo pausada até que a atualização oficial seja liberada.
                </span>
              </div>
            )}

            {/* Seletor de Tiers / Planos */}
            <div className="space-y-3">
              <label className="font-mono text-[10px] text-[#86948a] uppercase tracking-wider block">
                1. Selecione a Duração da Licença:
              </label>

              <div className="space-y-2">
                {(product.variants || []).map((v) => {
                  const isSelected = v.id === selectedVariantId;
                  const priceFormatted = (v.priceCents / 100).toFixed(2).replace(".", ",");

                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "bg-[#10b981]/15 border-[#10b981] ring-1 ring-[#10b981]/30"
                          : "bg-[#101412] border-white/8 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-[#10b981] bg-[#10b981]"
                              : "border-gray-600 bg-transparent"
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-[#050706]" />}
                        </div>
                        <div>
                          <span className="font-['Space_Grotesk'] text-xs font-bold text-white block">
                            {v.name}
                          </span>
                          <span className="font-mono text-[10px] text-[#86948a]">
                            {v.stockCount > 0 ? `${v.stockCount} chaves disponíveis` : "Estoque esgotado"}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-['Space_Grotesk'] text-sm font-bold text-[#10b981]">
                          R$ {priceFormatted}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cupom de Desconto */}
            <form onSubmit={handleApplyCoupon} className="space-y-2">
              <label className="text-xs text-[#86948a] font-['Geist'] block">
                Possui cupom de desconto?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value);
                    if (couponError) setCouponError(null);
                  }}
                  placeholder="DIGITE SEU CUPOM"
                  className="flex-1 px-3 py-2 rounded-xl bg-[#050706] border border-white/10 text-xs font-mono uppercase text-white placeholder-[#86948a] focus:outline-none focus:border-[#10b981]"
                />
                <button
                  type="submit"
                  disabled={validatingCoupon}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#10b981]/15 hover:bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/30 transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {validatingCoupon ? "Validando..." : "Aplicar"}
                </button>
              </div>

              {couponError && (
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center gap-2 text-rose-300 text-[11px] font-mono animate-fadeIn">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccessMessage && (
                <div className="p-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/25 flex items-center justify-between text-[#10b981] text-[11px] font-mono animate-fadeIn">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>{couponSuccessMessage}</span>
                  </div>
                  <span className="font-bold">- R$ {((couponDiscountCents || 0) / 100).toFixed(2).replace(".", ",")}</span>
                </div>
              )}
            </form>

            {/* Preço Total & CTA de Compra */}
            <div className="pt-4 border-t border-white/8 space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-[#86948a]">Total devido:</span>
                <div className="text-right">
                  <span className="font-['Space_Grotesk'] text-3xl font-extrabold text-white">
                    R$ {finalPrice.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-[10px] font-mono text-[#10b981] block mt-0.5">
                    Envio automático instantâneo
                  </span>
                </div>
              </div>

              <Link
                href={`/checkout/${selectedVariant.id}${couponCode.trim() ? `?coupon=${encodeURIComponent(couponCode.trim())}` : ""}`}
                className="w-full py-4 rounded-xl font-bold text-sm bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#34d399] hover:to-[#10b981] text-[#050706] shadow-xl shadow-[#10b981]/25 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                <Lock className="w-4 h-4" />
                <span>Comprar Licença Agora</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              {/* Botão Discord */}
              <a
                href="https://discord.gg/gqMDjvaSC"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl text-xs font-medium bg-[#5865F2]/10 text-[#7983F5] hover:bg-[#5865F2]/20 border border-[#5865F2]/25 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Tirar dúvidas no Discord Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

          </div>
        </aside>

      </div>

    </div>
  );
}
