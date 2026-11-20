"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        const res = await fetch("/api/products?featured=true", { cache: "no-store" });
        const data = await res.json();
        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
      } catch (e) {
        console.error("Erro ao carregar produtos da vitrine:", e);
        setProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadFeaturedProducts();
  }, []);

  const marqueeItems = [
    { text: "[⚡ Precisão em Nível de Kernel]", icon: "memory", highlight: true },
    { text: "[🛡️ Proteção Zero-Trace & HWID]", icon: "security" },
    { text: "[🔄 Sincronização Automática em Nuvem]", icon: "cloud_sync" },
    { text: "[🔒 Cofre Criptografado AES-256]", icon: "lock" },
    { text: "[⚡ Entrega Imediata Pix & Cripto]", icon: "currency_exchange" },
    { text: "[🌐 Servidores Dedicados Baixa Latência]", icon: "public" },
    { text: "[🟢 Status Indetectável 99.99%]", icon: "check_circle", highlight: true },
  ];

  const differentiators = [
    {
      title: "Entrega Instantânea",
      desc: "Despacho criptográfico automatizado de chaves para seu painel e e-mail imediatamente após a confirmação do pagamento.",
      icon: "bolt"
    },
    {
      title: "Arquitetura Ring-0",
      desc: "Desenvolvido em nível de kernel sem bibliotecas pesadas, garantindo estabilidade absoluta e zero impacto em taxa de quadros (FPS).",
      icon: "memory"
    },
    {
      title: "Sincronização em Nuvem",
      desc: "Perfis e configurações sincronizados instantaneamente entre máquinas autorizadas via credenciais seguras.",
      icon: "cloud_sync"
    },
    {
      title: "Privacidade & Anonimato",
      desc: "Zero armazenamento de registros de hardware identificáveis. Suporte completo a checkout anônimo via Criptoativos e Pix.",
      icon: "lock"
    },
    {
      title: "Suporte Especializado 24/7",
      desc: "Equipe técnica e suporte oficial ativos 24 horas por dia no Discord para atendimento imediato e resolução de dúvidas.",
      icon: "support_agent"
    },
    {
      title: "Freeze Time Garantido",
      desc: "Monitoramento contínuo de status com protocolo automático de congelamento do tempo da licença durante manutenções de jogos.",
      icon: "ac_unit"
    }
  ];

  const faqs = [
    {
      category: "[ENTREGA IMEDIATA]",
      q: "Como recebo o acesso após o pagamento?",
      a: "A liberação é 100% imediata e automatizada. Assim que o pagamento (Pix, Cartão de Crédito ou Cripto) é confirmado, a página do pedido se atualiza em tempo real com sua chave, instruções de uso e o botão de download do inicializador seguro."
    },
    {
      category: "[COMPATIBILIDADE & PAUSA DE TEMPO]",
      q: "O que acontece se o jogo ou software atualizar?",
      a: "Nosso sistema possui a tecnologia exclusiva 'Freeze Time'. Ao detectarmos patches ou manutenções nos servidores oficiais do software, o status do produto entra em Manutenção no site e o tempo restante da sua licença é pausado automaticamente, sendo devolvido integralmente quando o serviço retornar."
    },
    {
      category: "[INTEGRAÇÃO DISCORD]",
      q: "Como funciona a verificação e cargos no Discord?",
      a: "No seu painel do cliente, basta clicar em 'Vincular Discord'. O nosso Bot reconhece seu ID e aplica automaticamente o cargo @Verificado para liberar os canais da comunidade e suporte oficial aos clientes."
    },
    {
      category: "[SEGURANÇA & GARANTIA]",
      q: "Qual é a política de reembolso e troca de chaves?",
      a: "Se o software apresentar incompatibilidade comprovada com sua máquina e nossa equipe de suporte técnico via Discord não conseguir resolver em até 24 horas, fornecemos chave substituta ou crédito integral na loja."
    },
    {
      category: "[ÁREA DO CLIENTE & HWID]",
      q: "Posso utilizar a chave em outro computador se fizer upgrade?",
      a: "Sim! Cada licença é vinculada ao HWID da sua máquina. O painel da Área do Cliente permite autoatendimento para reset de HWID a cada 7 dias de forma segura e instantânea."
    }
  ];

  return (
    <div className="flex flex-col w-full">
      {/* ---------------------------------------------------- */}
      {/* 1. HERO SECTION (OVERCLOCK STORE Spec)              */}
      {/* ---------------------------------------------------- */}
      <div className="relative w-full overflow-hidden">
        {/* Top Ambient Glow Aura */}
        <div className="pointer-events-none absolute left-1/2 -top-24 -translate-x-1/2 w-[720px] h-[340px] bg-primary-container/20 blur-[130px] rounded-full" />

        <section className="relative z-10 max-w-7xl mx-auto px-4 lg:px-12 pt-10 pb-8 flex flex-col items-center text-center">
          {/* Top Pill Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/90 shadow-sm backdrop-blur-md border border-white/5">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <span className="font-mono-badge text-mono-badge uppercase tracking-wider text-primary font-semibold">
                ⚡ Entrega Automática Imediata
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container-high/90 shadow-sm backdrop-blur-md border border-white/5">
              <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
              <span className="font-mono-badge text-mono-badge uppercase tracking-wider text-on-surface font-semibold">
                🛡️ Suporte Técnico 24/7
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="font-display-xl text-4xl sm:text-6xl lg:text-7xl max-w-5xl tracking-tight text-on-surface mb-4 font-bold leading-[1.1]">
            Licenças Digitais de Elite com{" "}
            <span className="text-primary underline decoration-primary/40 decoration-wavy decoration-2">
              Alta Performance
            </span>{" "}
            &amp; Segurança Máxima
          </h1>

          {/* Subtitle */}
          <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-2xl mb-8 leading-relaxed">
            Entrega instantânea de chaves, ativação automatizada e 99.99% de uptime para gamers, desenvolvedores e entusiastas de alta performance.
          </p>

          {/* Dual CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-10">
            <a
              href="#products"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-label-md font-bold transition-all shadow-[0_0_28px_rgba(16,185,129,0.35)] hover:shadow-[0_0_36px_rgba(16,185,129,0.55)]"
            >
              <span className="material-symbols-outlined text-base">shopping_bag</span>
              <span>Explorar Produtos</span>
            </a>
            <Link
              href="/status"
              className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-label-md text-label-md font-medium transition-all shadow-sm border border-white/5"
            >
              <span className="material-symbols-outlined text-base text-primary">sensors</span>
              <span>Status dos Servidores</span>
            </Link>
          </div>

          {/* 3 Trust Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-4xl py-2">
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-container-low shadow-sm border border-white/5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
              </span>
              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                Atendimento Dedicado 24/7
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-container-low shadow-sm border border-white/5">
              <span className="material-symbols-outlined text-primary text-base">bolt</span>
              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                Envio da Chave em &lt; 30 segundos
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-surface-container-low shadow-sm border border-white/5">
              <span className="material-symbols-outlined text-primary text-base">verified</span>
              <span className="font-label-sm text-label-sm text-on-surface font-medium">
                100% de Garantia de Funcionamento
              </span>
            </div>
          </div>
        </section>

        {/* Marquee Ticker Bar */}
        <div className="w-full bg-surface-container-low/70 py-2.5 overflow-hidden my-6 backdrop-blur-md border-y border-white/5">
          <div className="flex whitespace-nowrap animate-marquee gap-8 text-on-surface-variant font-mono-badge text-mono-badge tracking-widest uppercase">
            {[...marqueeItems, ...marqueeItems].map((item, idx) => (
              <span key={idx} className="inline-flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-primary">{item.icon}</span>
                <span className={item.highlight ? "text-primary font-bold" : "text-on-surface"}>
                  {item.text}
                </span>
                <span className="text-outline/40 ml-4">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. PRODUCTS SHOWCASE (#products - SEM ABAS)          */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 lg:px-12 pt-8 pb-12 w-full" id="products">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-primary uppercase tracking-widest mb-3 border border-white/5">
              <span className="material-symbols-outlined text-xs">local_fire_department</span>
              <span>DESTAQUES // MAIS VENDIDOS DA LOJA</span>
            </div>
            <h2 className="font-headline-lg text-2xl sm:text-4xl tracking-tight text-on-surface mb-2 font-bold">
              Softwares em Destaque &amp; Mais Populares
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              Acesso instantâneo aos softwares mais procurados com ativação automática, entrega imediata e suporte 24h.
            </p>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary-container font-label-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] shrink-0 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">grid_view</span>
            <span>Ver todos os produtos →</span>
          </Link>
        </div>

        {/* Product 3-Column Grid */}
        {isLoadingProducts ? (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant font-mono-data text-xs">
            <span className="material-symbols-outlined text-2xl text-primary animate-spin">progress_activity</span>
            <span>Carregando vitrine de softwares...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 rounded-xl bg-surface-container-low border border-white/5 text-center space-y-3">
            <span className="material-symbols-outlined text-3xl text-primary">inventory_2</span>
            <h3 className="font-headline-sm text-base font-bold text-on-surface">Novos lançamentos em breve</h3>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-md mx-auto">
              Nossos desenvolvedores estão preparando a nova linha de softwares indetectáveis. Confira nosso catálogo completo.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-variant text-primary text-xs font-bold transition-all"
            >
              <span>Ver Catálogo Completo →</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod: any, idx: number) => {
              const minPrice = prod.minPriceCents
                ? prod.minPriceCents / 100
                : prod.variants?.length > 0
                ? Math.min(...prod.variants.map((v: any) => v.priceCents)) / 100
                : 24.9;
              const isFeatured = prod.isFeatured;
              const stock = prod.stockCount !== undefined ? prod.stockCount : 0;

              return (
                <div
                  key={prod.id}
                  className="relative flex flex-col justify-between rounded-xl bg-gradient-to-b from-[#06281A] via-surface-container-low to-surface-container-lowest p-6 shadow-xl shadow-primary-container/5 transition-all duration-300 hover:-translate-y-1 border border-white/5 group"
                >
                  <div className="flex flex-col">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      {isFeatured ? (
                        <span className="px-2 py-0.5 rounded font-mono-badge text-[11px] uppercase font-bold bg-primary-container text-on-primary-container whitespace-nowrap shrink-0">
                          DESTAQUE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-mono-badge text-[11px] uppercase font-semibold bg-surface-container text-primary whitespace-nowrap shrink-0">
                          {prod.category}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1 font-mono-badge text-[11px] text-primary whitespace-nowrap shrink-0">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                        {stock > 0 ? `Entrega Imediata (${stock} keys)` : "Sob Demanda"}
                      </span>
                    </div>

                  {/* Thumbnail HUD Box */}
                  <div className="relative w-full h-[140px] rounded-lg bg-surface-container-lowest/80 overflow-hidden mb-4 flex flex-col items-center justify-center border border-white/5">
                    <img
                      src={prod.images?.[0] || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop"}
                      alt={prod.name}
                      className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(16,185,129,0.18)_0%,_transparent_75%)]" />
                    <span className="font-mono-badge text-mono-badge uppercase tracking-widest text-primary relative z-10 font-bold">
                      {prod.category} • ATIVAÇÃO RÁPIDA
                    </span>
                    <span className="font-body-sm text-body-sm text-outline relative z-10 text-xs">
                      Licença Oficial com Proteção HWID
                    </span>
                  </div>

                  {/* Title & Category Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shadow-inner shrink-0 border border-white/5">
                      <span className="material-symbols-outlined text-xl">
                        {idx === 0 ? "desktop_windows" : idx === 1 ? "terminal" : "shield_locked"}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-headline-sm text-base text-on-surface leading-snug font-bold truncate">
                        {prod.name}
                      </h3>
                      <p className="font-mono-badge text-[10px] text-outline uppercase truncate">
                        {prod.currentVersion || "v1.0.0"} // CHAVE DIGITAL
                      </p>
                    </div>
                  </div>

                  <p className="font-body-sm text-xs text-on-surface-variant mb-4 leading-relaxed line-clamp-2">
                    {prod.tagline || prod.shortDescription}
                  </p>

                  {/* Feature Tags */}
                  <div className="flex items-center gap-1.5 mb-6 overflow-hidden">
                    {(prod.features || []).slice(0, 3).map((feat: string, fIdx: number) => (
                      <span
                        key={fIdx}
                        className="font-mono-badge text-[10px] px-2 py-0.5 rounded bg-surface-container text-secondary border border-white/5 whitespace-nowrap truncate max-w-[110px]"
                        title={feat}
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Price and Standardized Action Button */}
                <div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="font-body-sm text-xs text-outline">A partir de</span>
                    <span className="font-headline-md text-lg text-on-surface font-bold">
                      R$ {minPrice.toFixed(2).replace(".", ",")}
                      <span className="text-xs font-normal text-outline"> / chave</span>
                    </span>
                  </div>

                  {/* Standardized Design System Buttons */}
                  <Link
                    href={`/products/${prod.slug}`}
                    className={`w-full py-3 rounded-lg font-label-md text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                      isFeatured
                        ? "bg-primary-container hover:bg-primary text-on-primary-container shadow-[0_0_18px_rgba(16,185,129,0.3)]"
                        : "bg-surface-container-high hover:bg-surface-variant text-on-surface shadow-sm border border-white/5"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">shopping_cart</span>
                    <span>Comprar Licença</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      </section>

      {/* ---------------------------------------------------- */}
      {/* 3. DIFERENCIAIS DA OVERCLOCK STORE                  */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 lg:px-12 pt-8 pb-12 w-full">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-primary uppercase tracking-widest mb-3 border border-white/5">
            <span className="material-symbols-outlined text-xs">diamond</span>
            <span>DIFERENCIAIS EXCLUSIVOS</span>
          </div>
          <h2 className="font-headline-lg text-3xl sm:text-4xl tracking-tight text-on-surface mb-2 font-bold">
            Por Que Escolher a Overclock Store
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
            Projetada do zero para máxima disponibilidade, segurança total e entrega automatizada de chaves em segundos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((diff, idx) => (
            <div
              key={idx}
              className="p-6 rounded-xl bg-surface-container-low border border-white/5 hover:border-primary/30 transition-all flex flex-col justify-start group"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container-high border border-white/5 flex items-center justify-center text-primary mb-4 group-hover:scale-105 transition-transform shadow-inner">
                <span className="material-symbols-outlined text-2xl">{diff.icon}</span>
              </div>
              <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2">
                {diff.title}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                {diff.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. PERGUNTAS FREQUENTES (FAQ)                       */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-4xl mx-auto px-4 lg:px-12 pt-8 pb-16 w-full" id="faq">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-primary uppercase tracking-widest mb-3 border border-white/5">
            <span className="material-symbols-outlined text-xs">help</span>
            <span>CENTRAL DE DÚVIDAS</span>
          </div>
          <h2 className="font-headline-lg text-3xl sm:text-4xl tracking-tight text-on-surface mb-2 font-bold">
            Perguntas Frequentes (FAQ)
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-lg">
            Respostas diretas sobre liberação de chaves, formas de pagamento e suporte ao cliente.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-surface-container-low transition-all border border-white/5 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-surface-container-high/40 transition-colors"
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="font-mono-badge text-mono-badge px-2 py-0.5 rounded bg-surface-container text-primary font-bold uppercase w-fit">
                      {faq.category}
                    </span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {faq.q}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-outlined text-primary text-xl transition-transform duration-200 mt-1 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed pt-1">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
