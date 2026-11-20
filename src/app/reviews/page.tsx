"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ShieldCheck, MessageSquare, Loader2, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface PublicReview {
  id: string;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  productName: string;
  productSlug: string;
  category: string;
  authorName: string;
  createdAt: string;
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReviews() {
      try {
        const res = await fetch("/api/reviews");
        if (res.ok) {
          const data = await res.json();
          setReviews(data.reviews || []);
          setTotalCount(data.totalCount || 0);
          setAverageRating(data.averageRating || 0);
        }
      } catch (err) {
        console.error("Erro ao carregar avaliações:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchReviews();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/8">
        <div>
          <span className="text-xs font-mono uppercase text-[#10b981] block mb-1">
            Opinião da Comunidade
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Avaliações Verificadas de Clientes
          </h1>
          <p className="mt-2 text-sm text-[#86948a]">
            Somente clientes com compras concluídas e confirmadas na Overclock Store podem avaliar.
          </p>
        </div>

        {/* Card de Média - exibido apenas se houver avaliações reais */}
        {!loading && totalCount > 0 && (
          <div className="p-4 rounded-2xl bg-[#0B0F0D] border border-white/10 flex items-center gap-4 shrink-0">
            <div className="text-3xl font-extrabold text-white font-mono">
              {averageRating.toFixed(1)}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(averageRating) ? "fill-current" : "text-white/20"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-[#86948a] block mt-1 font-mono">
                {totalCount === 1 ? "1 avaliação verificada" : `${totalCount} avaliações verificadas`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo: Loading, Empty State ou Lista */}
      {loading ? (
        <div className="py-20 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
          <span>Carregando avaliações verificadas...</span>
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-2xl p-12 border border-white/8 bg-[#0B0F0D] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 text-[#10b981] mx-auto flex items-center justify-center">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
            Ainda não existem avaliações publicadas
          </h3>
          <p className="text-xs text-[#86948a] leading-relaxed">
            Somente clientes com compras concluídas podem avaliar os produtos adquiridos. Assim que novos pedidos forem finalizados e avaliados pelos clientes, os depoimentos serão exibidos aqui após validação da moderação.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-[#10b981]" />
              <span>Explorar Produtos da Loja</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="rounded-2xl p-6 border border-white/8 bg-[#0B0F0D] flex flex-col justify-between space-y-4 hover:border-white/15 transition-colors"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white font-['Space_Grotesk']">
                      {rev.authorName}
                    </h3>
                    <span className="text-[11px] text-[#86948a] font-mono">
                      {rev.productName}
                    </span>
                  </div>

                  {rev.isVerifiedPurchase && (
                    <Badge variant="emerald" className="text-[10px] gap-1 py-0.5">
                      <ShieldCheck className="w-3 h-3 text-[#10b981]" />
                      Compra Verificada
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < rev.rating ? "fill-current" : "text-white/20"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-[#e0e3df] leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86948a] font-mono">
                <span>{rev.category}</span>
                <span>{rev.createdAt}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
