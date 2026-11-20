"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { 
  ShoppingBag, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  MessageSquare, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  ChevronDown,
  Star,
  Zap,
  ArrowRight
} from "lucide-react";

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, revRes] = await Promise.all([
          fetch("/api/products?featured=true", { cache: "no-store" }),
          fetch("/api/reviews", { cache: "no-store" }),
        ]);

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          if (prodData.success && Array.isArray(prodData.products)) {
            setProducts(prodData.products);
          } else {
            setProducts([]);
          }
        }

        if (revRes.ok) {
          const revData = await revRes.json();
          if (revData.success && Array.isArray(revData.reviews)) {
            setApprovedReviews(revData.reviews);
          }
        }
      } catch (e) {
        console.error("Erro ao carregar dados da Home:", e);
      } finally {
        setIsLoadingProducts(false);
      }
    }

    loadData();
  }, []);

  const marqueeItems = [
    "⚡ ENTREGA APÓS CONFIRMAÇÃO DO PIX",
    "🛡️ STATUS ACOMPANHADO POR PRODUTO",
    "💬 SUPORTE EM PORTUGUÊS",
    "🔐 PAINEL DO CLIENTE COM HISTÓRICO E CHAVES",
    "📩 INSTRUÇÕES NO PAINEL E NO E-MAIL",
  ];

  const microBlocks = [
    {
      num: "01",
      title: "Liberação após confirmação",
      desc: "A liberação é processada após a confirmação do pagamento pelo Mercado Pago.",
    },
    {
      num: "02",
      title: "Pagamento via Pix",
      desc: "Checkout Pix processado pelo Mercado Pago.",
    },
    {
      num: "03",
      title: "Status por Produto",
      desc: "Consulte a condição informada para cada produto antes de comprar.",
    },
    {
      num: "04",
      title: "Suporte em Português",
      desc: "Atendimento pelos canais oficiais da Overclock Store.",
    },
  ];

  const steps = [
    {
      step: "1",
      title: "Escolha seu produto",
      desc: "Confira compatibilidade, recursos e status antes de escolher a oferta ideal.",
    },
    {
      step: "2",
      title: "Pague com Pix",
      desc: "Realize o pagamento pelo checkout Pix seguro do Mercado Pago.",
    },
    {
      step: "3",
      title: "Acompanhe a liberação",
      desc: "Após a confirmação, acompanhe sua chave e as instruções no Painel do Cliente e no e-mail.",
    },
  ];

  const differentiators = [
    {
      title: "Entrega automática após confirmação",
      desc: "Processamento automatizado assim que o pagamento Pix é validado pelo Mercado Pago.",
    },
    {
      title: "Pedidos e licenças organizados no painel",
      desc: "Acesse seu histórico, visualize licenças atribuídas e acompanhe o status em um único local.",
    },
    {
      title: "Status transparente por produto",
      desc: "Acompanhe a condição operacional informada pela equipe técnica para cada item do catálogo.",
    },
    {
      title: "Guias de configuração disponíveis",
      desc: "Instruções claras e suporte nos canais oficiais para auxiliar nos primeiros passos de uso.",
    },
    {
      title: "Atendimento em português",
      desc: "Suporte dedicado nos canais oficiais da Overclock Store para tirar dúvidas e prestar assistência.",
    },
    {
      title: "Catálogo com produtos selecionados",
      desc: "Softwares, utilitários e soluções curadas com foco em qualidade e estabilidade para PC.",
    },
  ];

  const beforeBuyCards = [
    {
      title: "Compatibilidade",
      desc: "Confira versão do Windows, requisitos e compatibilidade específica do produto.",
    },
    {
      title: "Status atual",
      desc: "Consulte a condição do produto antes de finalizar a compra.",
    },
    {
      title: "Duração do plano",
      desc: "Confira o período de acesso informado na oferta escolhida.",
    },
    {
      title: "Uso consciente",
      desc: "Softwares de terceiros podem apresentar riscos, incluindo suspensão ou banimento de contas. Não existe garantia absoluta contra punições de plataformas ou desenvolvedoras.",
    },
  ];

  const faqs = [
    {
      q: "1. Como funciona a entrega após o pagamento?",
      a: "Após a confirmação do pagamento pelo Mercado Pago, o pedido é processado e a chave é disponibilizada no Painel do Cliente e enviada ao e-mail cadastrado, conforme as condições do produto.",
    },
    {
      q: "2. Quais formas de pagamento vocês aceitam?",
      a: "Atualmente, aceitamos Pix pelo checkout do Mercado Pago.",
    },
    {
      q: "3. Como recebo e aprendo a configurar o produto?",
      a: "As instruções e os guias disponíveis são enviados pelo Painel do Cliente e pelo e-mail. Para dúvidas adicionais, utilize os canais de suporte da Overclock Store.",
    },
    {
      q: "4. Como sei se o produto está funcionando antes de comprar?",
      a: "Consulte nossa página de Status dos Produtos. Ela apresenta a condição informada pela equipe para cada produto.",
    },
    {
      q: "5. Funciona em qualquer versão do Windows?",
      a: "A compatibilidade depende do produto. Confira os requisitos específicos na respectiva página antes de comprar.",
    },
    {
      q: "6. Vai ter ferramenta para o meu jogo?",
      a: "Nosso catálogo pode receber novos produtos conforme disponibilidade e seleção da equipe. Sugestões podem ser encaminhadas pelos canais oficiais da comunidade.",
    },
    {
      q: "7. Vocês oferecem reembolso?",
      a: "As solicitações de cancelamento, arrependimento, reembolso e resolução de problemas serão tratadas conforme a legislação aplicável e a Política de Reembolso da Overclock Store. Para solicitar atendimento, entre em contato pelos canais oficiais.",
    },
  ];

  return (
    <div className="flex flex-col w-full">
      {/* ---------------------------------------------------- */}
      {/* MARQUEE OFICIAL                                      */}
      {/* ---------------------------------------------------- */}
      <div className="w-full bg-[#061e14] py-2.5 overflow-hidden border-y border-white/5">
        <div className="flex whitespace-nowrap animate-marquee gap-8 text-[#10b981] font-mono text-xs tracking-widest uppercase font-semibold">
          {[...marqueeItems, ...marqueeItems, ...marqueeItems].map((text, idx) => (
            <span key={idx} className="inline-flex items-center gap-2">
              <span>{text}</span>
              <span className="text-white/20 ml-6">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* HERO OFICIAL                                         */}
      {/* ---------------------------------------------------- */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 lg:px-8 pt-12 pb-12 flex flex-col items-center text-center">
        {/* Badge Hero */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-wider text-[#10b981] font-bold">
            PIX VIA MERCADO PAGO · ENTREGA APÓS CONFIRMAÇÃO
          </span>
        </div>

        {/* Título Principal */}
        <h1 className="font-['Space_Grotesk'] text-4xl sm:text-6xl lg:text-7xl max-w-4xl tracking-tight text-white mb-6 font-extrabold leading-[1.1]">
          Sua vantagem começa aqui.{" "}
          <span className="text-[#10b981]">Chave liberada em segundos.</span>
        </h1>

        {/* Subtítulo */}
        <p className="font-['Geist'] text-base sm:text-lg text-[#bbcabf] max-w-3xl mb-8 leading-relaxed">
          Softwares, spoofers e utilitários selecionados para PC. Confira recursos, compatibilidade e status antes de comprar. Após a confirmação do Pix, acompanhe a liberação da sua chave no Painel do Cliente e no e-mail.
        </p>

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <a
            href="#products"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#10b981] text-[#050706] hover:bg-[#34d399] font-['Space_Grotesk'] text-sm font-bold transition-all shadow-[0_0_28px_rgba(16,185,129,0.35)]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Explorar Produtos</span>
          </a>
          <Link
            href="/status"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-sm font-semibold transition-all border border-white/10"
          >
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            <span>Consultar Status</span>
          </Link>
        </div>

        {/* Quatro Microblocos de Confiança */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl text-left">
          {microBlocks.map((b) => (
            <div
              key={b.num}
              className="p-4 rounded-xl bg-[#0b0f0d] border border-white/8 space-y-1.5"
            >
              <div className="text-[11px] font-mono text-[#10b981] font-bold">
                {b.num} — {b.title}
              </div>
              <p className="text-xs text-[#86948a] leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 01 / CATÁLOGO                                        */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-12 w-full" id="products">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
              <span>01 // CATÁLOGO</span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
              Escolha o que você precisa
            </h2>
          </div>

          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold transition-colors border border-white/10 self-start sm:self-auto"
          >
            <span>Ver Catálogo Completo →</span>
          </Link>
        </div>

        {isLoadingProducts ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-[#86948a] font-mono text-xs">
            <div className="w-6 h-6 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
            <span>Carregando catálogo de produtos...</span>
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center space-y-3 max-w-md mx-auto">
            <ShoppingBag className="w-10 h-10 text-[#10b981] mx-auto opacity-70" />
            <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
              Catálogo em Preparação
            </h3>
            <p className="text-xs text-[#86948a] leading-relaxed">
              Estamos preparando a entrada dos novos produtos e licenças oficiais. Em breve o catálogo estará disponível para pedidos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((prod: any) => {
              const minPrice = prod.minPriceCents
                ? prod.minPriceCents / 100
                : prod.variants?.length > 0
                ? Math.min(...prod.variants.map((v: any) => v.priceCents)) / 100
                : 0;

              return (
                <div
                  key={prod.id}
                  className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 hover:border-[#10b981]/30 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono uppercase text-[#10b981] font-bold">
                        {prod.category}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#10b981]/15 text-[#10b981]">
                        {prod.status}
                      </span>
                    </div>

                    <h3 className="font-['Space_Grotesk'] text-lg font-bold text-white">
                      {prod.name}
                    </h3>

                    <p className="text-xs text-[#86948a] line-clamp-2 leading-relaxed">
                      {prod.shortDescription}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#86948a] block font-mono">A partir de</span>
                      <span className="font-['Space_Grotesk'] text-base font-bold text-white">
                        R$ {minPrice.toFixed(2).replace(".", ",")}
                      </span>
                    </div>

                    <Link
                      href={`/products/${prod.slug}`}
                      className="px-4 py-2 rounded-xl bg-[#10b981] text-[#050706] hover:bg-[#34d399] font-['Space_Grotesk'] text-xs font-bold transition-colors"
                    >
                      Ver Detalhes
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* 02 / TRANSPARÊNCIA                                   */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
              <span>02 // TRANSPARÊNCIA</span>
            </div>
            <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
              Status dos Produtos
            </h2>
            <p className="text-xs text-[#86948a] mt-1">
              O que está online, em atualização, em manutenção ou em breve. Sem letra miúda.
            </p>
          </div>

          <Link
            href="/status"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold transition-colors border border-white/10 self-start sm:self-auto"
          >
            <span>Página de Status Completa →</span>
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0b0f0d] border border-white/8 text-center text-xs font-mono text-[#86948a] max-w-md mx-auto">
            Nenhum produto cadastrado no momento. O status individual será exibido conforme a entrada de itens no catálogo.
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0b0f0d] border border-white/8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono min-w-[600px]">
                <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                  <tr>
                    <th className="p-4">PRODUTO</th>
                    <th className="p-4">CATEGORIA</th>
                    <th className="p-4">ESTADO ATUAL</th>
                    <th className="p-4">VERSÃO</th>
                    <th className="p-4">ÚLTIMA REVISÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-white">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-white/[0.02]">
                      <td className="p-4 font-bold font-sans">{p.name}</td>
                      <td className="p-4 text-[#86948a]">{p.category}</td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#10b981]/15 text-[#10b981]">
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-[#86948a]">{p.currentVersion || "1.0.0"}</td>
                      <td className="p-4 text-[#86948a]">
                        {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* 03 / COMO FUNCIONA                                   */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
            <span>03 // COMO FUNCIONA</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
            Do Pix à ativação em segundos
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.step}
              className="p-6 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-3 relative overflow-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-[#10b981]/10 text-[#10b981] font-mono font-bold text-base flex items-center justify-center">
                {s.step}
              </div>
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                {s.title}
              </h3>
              <p className="text-xs text-[#86948a] leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 04 / DIFERENCIAIS                                    */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
            <span>04 // DIFERENCIAIS</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
            Por que escolher a Overclock Store
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {differentiators.map((d, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-2 hover:border-white/15 transition-colors"
            >
              <div className="w-2 h-2 rounded-full bg-[#10b981] mb-2" />
              <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white">
                {d.title}
              </h4>
              <p className="text-xs text-[#86948a] leading-relaxed">
                {d.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 05 / ANTES DE COMPRAR                                */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-6xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
            <span>05 // ANTES DE COMPRAR</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
            O que conferir antes de fechar o pedido
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {beforeBuyCards.map((c, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-2 flex flex-col justify-between"
            >
              <div>
                <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white mb-2">
                  {c.title}
                </h4>
                <p className="text-xs text-[#86948a] leading-relaxed">
                  {c.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* AVALIAÇÕES APROVADAS (Se houver)                    */}
      {/* ---------------------------------------------------- */}
      {approvedReviews.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
                <span>AVALIAÇÕES // CLIENTES VERIFICADOS</span>
              </div>
              <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
                O que dizem os clientes
              </h2>
            </div>

            <Link
              href="/reviews"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold transition-colors border border-white/10 self-start sm:self-auto"
            >
              <span>Ver Todas as Avaliações →</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {approvedReviews.slice(0, 3).map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-2xl bg-[#0b0f0d] border border-white/8 space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-['Space_Grotesk'] font-bold text-white text-xs">
                      {rev.authorName}
                    </span>
                    <span className="text-[10px] font-mono text-[#10b981]">
                      Compra Verificada
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < rev.rating ? "fill-current" : "text-white/20"
                        }`}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-[#e0e3df] italic leading-relaxed">
                    "{rev.comment}"
                  </p>
                </div>

                <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-[#86948a] flex items-center justify-between">
                  <span>{rev.productName}</span>
                  <span>{rev.createdAt}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- */}
      {/* 06 / DÚVIDAS (FAQ)                                   */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-4xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5" id="faq">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest mb-2 border border-white/5 font-bold">
            <span>06 // DÚVIDAS</span>
          </div>
          <h2 className="font-['Space_Grotesk'] text-2xl sm:text-4xl tracking-tight text-white font-bold">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl bg-[#0b0f0d] border border-white/8 transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-start justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-['Space_Grotesk'] text-sm text-white font-semibold">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#10b981] shrink-0 transition-transform duration-200 mt-0.5 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-xs text-[#86948a] leading-relaxed pt-1 font-['Geist']">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 07 / COMUNIDADE                                      */}
      {/* ---------------------------------------------------- */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12 w-full border-t border-white/5">
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-b from-[#0b0f0d] to-[#061e14] border border-white/10 text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 font-mono text-xs text-[#10b981] uppercase tracking-widest border border-white/5 font-bold">
            <span>07 // COMUNIDADE</span>
          </div>

          <h2 className="font-['Space_Grotesk'] text-3xl sm:text-4xl tracking-tight text-white font-extrabold">
            É no Discord que tudo acontece primeiro
          </h2>

          <p className="text-sm text-[#bbcabf] max-w-xl mx-auto leading-relaxed">
            Acompanhe novidades, atualizações, guias e converse com nossa equipe.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 max-w-3xl mx-auto text-xs font-mono text-white/90 pt-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              Suporte por ticket
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              Avisos de atualizações
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              Guias de configuração
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
              Sugestões de produtos
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/5 col-span-2 sm:col-span-1">
              Comunicação direta
            </div>
          </div>

          <div className="pt-4">
            <a
              href="https://discord.gg/w7R5wX3r99"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[#10b981] text-[#050706] hover:bg-[#34d399] font-['Space_Grotesk'] text-sm font-bold transition-all shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Entrar no Discord Oficial</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
