"use client";

import { use, useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  ArrowRight, 
  Shield, 
  Key, 
  User,
  Sparkles,
  QrCode,
  Clock,
  AlertTriangle,
  Loader2,
  CreditCard,
  Coins,
  RefreshCw,
  Zap
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface OrderPageProps {
  params: Promise<{ orderId: string }>;
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "DISPUTED";
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  createdAt: string;
  paidAt?: string;
  items: {
    id: string;
    productName: string;
    productSlug: string;
    category: string;
    variantName: string;
    durationValue: number;
    durationType: string;
    unitPriceCents: number;
    downloadUrl?: string;
  }[];
  payment?: {
    id: string;
    gateway: string;
    method: string;
    status: string;
    checkoutUrl?: string;
    pixQrCode?: string;
    pixQrCodeText?: string;
    pixExpiresAt?: string;
    cryptoAddress?: string;
    isSandbox?: boolean;
  } | null;
  deliveredKey?: string | null;
  licenseStatus?: string | null;
  customer?: {
    id: string;
    username: string;
    fullName: string;
    email: string;
  };
}

function OrderContent({ params }: OrderPageProps) {
  const resolvedParams = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [simulatingPayment, setSimulatingPayment] = useState(false);
  const [simulationNotice, setSimulationNotice] = useState<string | null>(null);

  // Carrega e atualiza status do pedido
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${resolvedParams.orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      }
    } catch (err) {
      console.error("Falha ao carregar pedido:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();

    // Polling a cada 3 segundos enquanto estiver PENDING
    const interval = setInterval(() => {
      if (order?.status === "PENDING" || !order) {
        fetchOrder();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [resolvedParams.orderId, order?.status]);

  const handleCopyKey = () => {
    if (order?.deliveredKey) {
      navigator.clipboard.writeText(order.deliveredKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyPix = () => {
    if (order?.payment?.pixQrCodeText) {
      navigator.clipboard.writeText(order.payment.pixQrCodeText);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2000);
    }
  };

  // Simulação de Pagamento 1-Click Sandbox
  const handleSimulatePayment = async () => {
    setSimulatingPayment(true);
    try {
      const res = await fetch(`/api/orders/${resolvedParams.orderId}/simulate-payment`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSimulationNotice(data.message || "Pagamento aprovado!");
        fetchOrder();
      } else {
        alert(data.error || "Erro ao simular pagamento.");
      }
    } catch (err) {
      alert("Erro de conexão ao simular pagamento.");
    } finally {
      setSimulatingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-xs text-[#10b981] font-mono flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#10b981]" />
        <span>Sincronizando telemetria do pedido #{resolvedParams.orderId}...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto p-12 text-center text-xs font-mono text-[#86948a] space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-white text-base font-bold font-['Space_Grotesk']">Pedido não encontrado</h2>
        <p>Não localizamos nenhum pedido com o identificador informado.</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-xl bg-[#10b981] text-[#050706] font-bold">
          Voltar para a Loja
        </Link>
      </div>
    );
  }

  const isCompleted = order.status === "COMPLETED";
  const isPending = order.status === "PENDING";
  const isCancelled = order.status === "CANCELLED";
  const primaryItem = order.items[0];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      
      {/* Toast de Simulação */}
      {simulationNotice && (
        <div className="p-4 rounded-xl bg-[#10b981] text-[#050706] font-bold font-['Space_Grotesk'] text-xs flex items-center gap-2 shadow-2xl animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{simulationNotice}</span>
        </div>
      )}

      {/* ==================================================== */}
      {/* 1. HEADER DO PEDIDO                                  */}
      {/* ==================================================== */}
      <div className="text-center space-y-3">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl ${
          isCompleted 
            ? "bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] shadow-[#10b981]/15" 
            : isCancelled 
            ? "bg-rose-500/15 border border-rose-500/30 text-rose-400"
            : "bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse"
        }`}>
          {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : isCancelled ? <AlertTriangle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
        </div>

        <Badge variant={isCompleted ? "emerald" : isCancelled ? "rose" : "amber"} pulse={isPending}>
          {isCompleted 
            ? "Pagamento Aprovado Instantaneamente" 
            : isCancelled 
            ? "Reserva Expirada / Pedido Cancelado" 
            : "Aguardando Confirmação do Gateway"}
        </Badge>

        <h1 className="text-3xl font-extrabold text-white font-['Space_Grotesk']">
          {isCompleted 
            ? "Pedido Concluído com Sucesso!" 
            : isCancelled 
            ? "Pedido Expirado" 
            : "Finalize o Pagamento para Liberar sua Chave"}
        </h1>

        <p className="text-xs text-gray-400 font-mono">
          Identificador: {order.orderNumber} • Total: R$ {(order.totalCents / 100).toFixed(2).replace(".", ",")}
        </p>
      </div>

      {/* ==================================================== */}
      {/* 2. ESTADO PENDENTE: QR CODE PIX / REDIRECIONAMENTO   */}
      {/* ==================================================== */}
      {isPending && (
        <div className="rounded-3xl bg-[#0b0f0d] p-6 sm:p-8 border border-amber-500/30 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
            <div>
              <span className="font-mono text-[10px] text-amber-400 uppercase tracking-widest block font-bold">
                RESERVA ATÔMICA ATIVA // 15 MINUTOS
              </span>
              <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white mt-1">
                {primaryItem ? `${primaryItem.productName} — ${primaryItem.variantName}` : "Licença de Software"}
              </h2>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#101412] border border-amber-500/30 text-amber-300 font-mono text-xs flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              <span>Chave alocada exclusivamente para você</span>
            </div>
          </div>

          {/* Instruções de Acordo com o Método */}
          {order.payment?.method === "PIX" && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* QR Code Container */}
              <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl bg-white border border-white/10 shrink-0 mx-auto w-full max-w-[260px]">
                {(() => {
                  const qrSrc = order.payment.pixQrCode
                    ? (order.payment.pixQrCode.startsWith("data:") || order.payment.pixQrCode.startsWith("http")
                        ? order.payment.pixQrCode
                        : `data:image/png;base64,${order.payment.pixQrCode}`)
                    : order.payment.pixQrCodeText
                    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(order.payment.pixQrCodeText)}`
                    : null;

                  return qrSrc ? (
                    <img
                      src={qrSrc}
                      alt="QR Code Pix Mercado Pago"
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center font-mono text-xs text-black">
                      QR CODE PIX
                    </div>
                  );
                })()}
                <span className="font-mono text-[10px] text-black font-bold mt-2">Pague pelo App do seu Banco</span>
              </div>

              {/* Copia e Cola & Detalhes */}
              <div className="md:col-span-8 space-y-4">
                <div className="space-y-1.5">
                  <span className="font-mono text-xs text-[#86948a] uppercase block">CÓDIGO PIX COPIA E COLA:</span>
                  <div className="p-3.5 rounded-xl bg-[#050706] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs">
                    <span className="text-white break-all text-[11px] leading-relaxed">
                      {order.payment.pixQrCodeText || "00020126580014br.gov.bcb.pix0136..."}
                    </span>
                    <button
                      onClick={handleCopyPix}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg bg-[#10b981] text-[#050706] font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 hover:bg-[#34d399] transition-all cursor-pointer shadow-md"
                    >
                      {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedPix ? "Pix Copiado!" : "Copiar Código Pix"}</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#101412] border border-white/5 space-y-2 text-xs font-['Geist'] text-[#bbcabf]">
                  <p>1. Abra o aplicativo do seu banco e escolha a opção <strong>Pix com QR Code</strong> ou <strong>Pix Copia e Cola</strong>.</p>
                  <p>2. Confirme o pagamento de <strong>R$ {(order.totalCents / 100).toFixed(2).replace(".", ",")}</strong>.</p>
                  <p>3. Nossa API detectará a liquidação e esta página liberará sua chave instantaneamente em segundos.</p>
                </div>
              </div>
            </div>
          )}

          {/* Cartão de Crédito / Stripe */}
          {order.payment?.method === "CREDIT_CARD" && order.payment.checkoutUrl && (
            <div className="p-6 rounded-2xl bg-[#101412] border border-white/10 text-center space-y-4">
              <CreditCard className="w-10 h-10 text-[#10b981] mx-auto" />
              <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                Finalizar Pagamento no Stripe Checkout Seguro
              </h3>
              <p className="text-xs text-[#bbcabf] max-w-md mx-auto">
                Você será redirecionado para a página criptografada de checkout do Stripe para digitar os dados do seu cartão com proteção 3D Secure.
              </p>
              <a
                href={order.payment.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] font-['Space_Grotesk'] font-bold text-xs shadow-lg shadow-[#10b981]/25"
              >
                <span>Ir para Checkout Stripe</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* BOTÃO 1-CLICK SIMULAÇÃO SANDBOX (Apenas visível em desenvolvimento local se sandbox ativado) */}
          {process.env.NODE_ENV === "development" && order.payment?.isSandbox && (
            <div className="pt-4 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-purple-950/20 p-4 rounded-2xl border-purple-500/20">
              <div>
                <span className="font-['Space_Grotesk'] text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Modo Sandbox Ativo (Ambiente de Teste)
                </span>
                <span className="text-[11px] text-[#bbcabf] block mt-0.5 font-['Geist']">
                  Aprove o pedido com 1 clique para testar a transição atômica e entrega da chave no banco.
                </span>
              </div>

              <button
                onClick={handleSimulatePayment}
                disabled={simulatingPayment}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-['Space_Grotesk'] font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition-all cursor-pointer shrink-0"
              >
                {simulatingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>⚡ Simular Aprovação de Pagamento</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. ESTADO CONCLUÍDO: CHAVE DESBLOQUEADA              */}
      {/* ==================================================== */}
      {isCompleted && (
        <div className="rounded-3xl bg-[#0b0f0d] p-6 sm:p-8 border border-[#10b981]/30 space-y-6 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/8">
            <div>
              <span className="font-mono text-[10px] text-[#10b981] uppercase tracking-widest block font-bold">
                LICENÇA DIGITAL ATRIBUÍDA
              </span>
              <h2 className="font-['Space_Grotesk'] text-xl font-bold text-white mt-1">
                {primaryItem ? `${primaryItem.productName} (${primaryItem.variantName})` : "Software Overclock"}
              </h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] font-mono text-xs font-bold border border-[#10b981]/30">
              STATUS: {order.licenseStatus || "NOT_ACTIVATED"}
            </span>
          </div>

          {/* Caixa da Chave Copiável */}
          <div className="p-4 rounded-2xl bg-[#050706] border border-[#10b981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
                <Key className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-[#86948a] font-mono block">SUA CHAVE DE ACESSO:</span>
                <span className="font-mono text-sm sm:text-base md:text-lg font-bold text-white tracking-wider break-all sm:truncate block">
                  {order.deliveredKey || "OVERCLOCK-XXXX-XXXX-XXXX"}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyKey}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] font-['Space_Grotesk'] font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-[#10b981]/20 cursor-pointer shrink-0"
            >
              {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey ? "Copiada com Sucesso!" : "Copiar Chave"}</span>
            </button>
          </div>

          {/* Instruções de Download e Ativação */}
          <div className="p-5 rounded-2xl bg-[#101412] border border-white/5 space-y-3 font-['Geist'] text-xs text-[#bbcabf]">
            <h4 className="font-['Space_Grotesk'] text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-[#10b981]" />
              Como Ativar seu Software no Computador:
            </h4>
            <ol className="list-decimal pl-4 space-y-1.5 marker:text-[#10b981]">
              <li>Acesse a sua <strong>Área do Cliente</strong> para baixar o Loader seguro atualizado.</li>
              <li>Execute o Loader como Administrador e cole a chave de licença acima.</li>
              <li>O software vinculará automaticamente o HWID da sua máquina e iniciará o contador de tempo.</li>
            </ol>
          </div>

          {/* Botões de Ação Final */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
            <Link
              href="/"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-white/10 text-xs text-[#86948a] hover:text-white font-['Space_Grotesk'] text-center"
            >
              Voltar para a Loja
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#050706] font-['Space_Grotesk'] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#10b981]/20"
            >
              <span>Ir para Área do Cliente</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}

export default function OrderPage(props: OrderPageProps) {
  return (
    <Suspense fallback={<div className="max-w-4xl mx-auto p-16 text-center text-xs text-[#10b981] font-mono">Carregando detalhes do pedido...</div>}>
      <OrderContent {...props} />
    </Suspense>
  );
}
