"use client";

import { Star, ShieldCheck, MessageSquare, ExternalLink } from "lucide-react";
import { MOCK_REVIEWS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";

export default function ReviewsPage() {
  const reviews = MOCK_REVIEWS;
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0 ? 5.0 : 5.0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      
      {/* Header com Média Geral */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/8">
        <div>
          <span className="text-xs font-mono uppercase text-emerald-400 block mb-1">
            Opinião da Comunidade
          </span>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Avaliações Verificadas de Clientes
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Apenas usuários com pedidos concluídos e licenças ativadas podem publicar avaliações.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B0F0D] border border-white/10 flex items-center gap-4 shrink-0">
          <div className="text-3xl font-extrabold text-white">
            {totalReviews > 0 ? averageRating.toFixed(2) : "5.0"}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="text-xs text-gray-400 block mt-1">
              {totalReviews > 0 
                ? `Baseado em ${totalReviews} compras aprovadas` 
                : "Aguardando primeiras avaliações verificadas"}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Avaliações / Empty state */}
      {reviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 border border-white/8 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <Star className="w-6 h-6 fill-current text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma avaliação pública ainda</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            As avaliações de clientes verificados aparecerão aqui automaticamente após a conclusão das compras e validação das primeiras licenças dos novos softwares.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((rev) => (
            <div
              key={rev.id}
              className="glass-card rounded-2xl p-6 border border-white/8 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.userAvatar}
                      alt={rev.userName}
                      className="w-9 h-9 rounded-full object-cover border border-white/10"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-white">{rev.userName}</h3>
                      <span className="text-[11px] text-gray-500 font-mono">{rev.productPlan}</span>
                    </div>
                  </div>

                  <Badge variant="emerald">
                    <ShieldCheck className="w-3 h-3" />
                    Verificado
                  </Badge>
                </div>

                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(rev.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>

                <p className="text-xs text-gray-300 leading-relaxed italic">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                <span>{rev.productName}</span>
                <span>{rev.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Convite Discord Reviews */}
      <div className="glass-card rounded-2xl p-6 border border-[#5865F2]/25 bg-[#5865F2]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-[#7983F5]" />
          <div>
            <h4 className="text-sm font-bold text-white">Canal de Feedbacks em Tempo Real</h4>
            <p className="text-xs text-gray-400">Veja o que os membros estão falando ao vivo no nosso canal #reviews do Discord.</p>
          </div>
        </div>
        <a
          href="https://discord.gg/gqMDjvaSC"
          target="_blank"
          rel="noreferrer"
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5865F2] hover:bg-[#4752C4] text-white flex items-center gap-1.5 transition-colors shrink-0"
        >
          <span>Abrir Discord Oficial</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

    </div>
  );
}
