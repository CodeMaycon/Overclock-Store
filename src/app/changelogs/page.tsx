"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitCommit, ChevronRight, Loader2 } from "lucide-react";

interface ChangelogItem {
  id: string;
  version: string;
  productName: string;
  productSlug: string;
  date: string;
  title: string;
  content: string;
}

export default function ChangelogsPage() {
  const [changelogs, setChangelogs] = useState<ChangelogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChangelogs() {
      try {
        const res = await fetch("/api/changelogs");
        if (res.ok) {
          const data = await res.json();
          setChangelogs(data.changelogs || []);
        }
      } catch (err) {
        console.error("Erro ao carregar changelogs:", err);
      } finally {
        setLoading(false);
      }
    }
    loadChangelogs();
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8 font-['Geist']">
      {/* Header */}
      <div>
        <span className="text-xs font-mono uppercase text-[#10b981] block mb-1">
          Registro de Lançamentos
        </span>
        <h1 className="font-['Space_Grotesk'] text-3xl font-extrabold text-white tracking-tight">
          Changelogs &amp; Atualizações
        </h1>
        <p className="mt-2 text-sm text-[#86948a]">
          Acompanhe o ciclo contínuo de atualizações, notas de versão e melhorias por produto.
        </p>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="py-20 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
          <span>Carregando notas de versão...</span>
        </div>
      ) : changelogs.length === 0 ? (
        <div className="rounded-2xl p-12 border border-white/8 bg-[#0B0F0D] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-[#10b981]/10 text-[#10b981] mx-auto flex items-center justify-center">
            <GitCommit className="w-6 h-6 text-[#10b981]" />
          </div>
          <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
            Nenhum changelog publicado ainda
          </h3>
          <p className="text-xs text-[#86948a] leading-relaxed">
            As notas de versão, patches e melhorias dos produtos serão publicadas aqui conforme as atualizações forem liberadas pela equipe técnica.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {changelogs.map((chg) => (
            <div
              key={chg.id}
              className="rounded-2xl p-6 border border-white/8 bg-[#0B0F0D] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20">
                    {chg.version}
                  </span>
                  <span className="text-sm font-bold text-white font-['Space_Grotesk']">
                    {chg.productName}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#86948a]">{chg.date}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2 font-['Space_Grotesk']">{chg.title}</h3>
                <p className="text-xs text-[#bbcabf] leading-relaxed whitespace-pre-line">
                  {chg.content}
                </p>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/products/${chg.productSlug}`}
                  className="text-xs text-[#10b981] hover:underline flex items-center gap-1 font-bold font-['Space_Grotesk']"
                >
                  <span>Ver Produto</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
