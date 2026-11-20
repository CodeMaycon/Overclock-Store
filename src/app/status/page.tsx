"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Loader2,
  RefreshCw,
  ShoppingBag
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface StatusItem {
  id: string;
  name: string;
  slug?: string;
  category: string;
  status: string;
  version: string | null;
  updatedAt: string;
}

export default function StatusPage() {
  const [items, setItems] = useState<StatusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const data = await res.json();
          // Combinar produtos e serviços cadastrados no sistema
          const combined: StatusItem[] = [];
          if (Array.isArray(data.products) && data.products.length > 0) {
            data.products.forEach((p: any) => {
              combined.push({
                id: p.id,
                name: p.name,
                slug: p.slug,
                category: p.category,
                status: p.status,
                version: p.version,
                updatedAt: p.updatedAt,
              });
            });
          } else if (Array.isArray(data.services) && data.services.length > 0) {
            data.services.forEach((s: any) => {
              combined.push({
                id: s.id,
                name: s.name,
                slug: s.productSlug || s.slug,
                category: s.category,
                status: s.status,
                version: s.version,
                updatedAt: s.lastUpdatedAt,
              });
            });
          }
          setItems(combined);
        }
      } catch (err) {
        console.error("Falha ao carregar status:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ONLINE":
      case "OPERATIONAL":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            ONLINE
          </span>
        );
      case "MAINTENANCE":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            EM MANUTENÇÃO
          </span>
        );
      case "DEGRADED":
      case "OUT_OF_STOCK":
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-orange-500/15 text-orange-300 border border-orange-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            SEM ESTOQUE
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white/10 text-[#86948a] border border-white/10">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#10b981] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span>TRANSPARÊNCIA // STATUS DOS PRODUTOS</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase leading-tight">
            Status dos Produtos
          </h1>
          <p className="mt-1 text-sm text-[#86948a] font-['Geist']">
            O que está online, em atualização, em manutenção ou em breve. Sem letra miúda.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-['Space_Grotesk'] text-xs font-bold transition-colors self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4 text-[#10b981]" />
          <span>Voltar à Loja</span>
        </Link>
      </div>

      {/* Conteúdo: Loading, Empty State ou Lista */}
      {loading ? (
        <div className="py-20 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
          <span>Carregando status dos produtos...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl p-12 border border-white/8 bg-[#0B0F0D] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#10b981]/10 text-[#10b981] mx-auto flex items-center justify-center">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
            Nenhum produto listado no momento
          </h3>
          <p className="text-xs text-[#86948a] leading-relaxed">
            O catálogo da Overclock Store está sendo preparado. Assim que os produtos forem cadastrados pela equipe, os respectivos status operacionais e revisões técnicas serão exibidos aqui em tempo real.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#10b981] text-[#050706] hover:bg-[#34d399] font-['Space_Grotesk'] text-xs font-bold transition-colors"
            >
              <span>Explorar a Loja</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[#0B0F0D] border border-white/8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono min-w-[650px]">
              <thead className="bg-[#101412] text-[#86948a] uppercase border-b border-white/8">
                <tr>
                  <th className="p-4">PRODUTO</th>
                  <th className="p-4">CATEGORIA</th>
                  <th className="p-4">STATUS ATUAL</th>
                  <th className="p-4">VERSÃO</th>
                  <th className="p-4">ÚLTIMA REVISÃO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#e0e3df]">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-white/[0.02]">
                    <td className="p-4 font-sans font-bold text-white text-sm">
                      {it.slug ? (
                        <Link href={`/products/${it.slug}`} className="hover:text-[#10b981] transition-colors">
                          {it.name}
                        </Link>
                      ) : (
                        it.name
                      )}
                    </td>
                    <td className="p-4 text-[#86948a]">{it.category}</td>
                    <td className="p-4">{getStatusBadge(it.status)}</td>
                    <td className="p-4 text-[#86948a]">{it.version || "1.0.0"}</td>
                    <td className="p-4 text-[#86948a]">
                      {new Date(it.updatedAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Box de Esclarecimento Técnico */}
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-[#86948a] leading-relaxed space-y-2">
        <div className="flex items-center gap-2 text-white font-bold font-['Space_Grotesk']">
          <Clock className="w-4 h-4 text-[#10b981]" />
          <span>Acompanhamento Transparente de Status</span>
        </div>
        <p>
          O status exibido reflete a última validação efetuada pela equipe técnica da Overclock Store. Recomendamos sempre consultar a condição atual do produto antes de realizar sua compra.
        </p>
      </div>
    </div>
  );
}
