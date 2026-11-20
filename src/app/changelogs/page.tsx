"use client";

import Link from "next/link";
import { GitCommit, Tag, Sparkles, Shield, ChevronRight } from "lucide-react";
import { MOCK_CHANGELOGS } from "@/lib/mock-data";
import { Badge } from "@/components/ui/Badge";

export default function ChangelogsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">
      
      {/* Header */}
      <div>
        <span className="text-xs font-mono uppercase text-emerald-400 block mb-1">
          Registro de Lançamentos
        </span>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Changelogs & Atualizações
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Acompanhe o ciclo contínuo de atualizações, melhorias de desempenho e patches de segurança.
        </p>
      </div>

      {/* Linha do Tempo de Changelogs */}
      {MOCK_CHANGELOGS.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 border border-white/8 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
            <GitCommit className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum changelog publicado ainda</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            As notas de versão, patches de segurança e melhorias de performance dos novos softwares serão publicadas aqui continuamente.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {MOCK_CHANGELOGS.map((chg) => (
            <div
              key={chg.id}
              className="glass-card rounded-2xl p-6 border border-white/8 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {chg.version}
                  </span>
                  <span className="text-sm font-bold text-white">
                    {chg.productName}
                  </span>
                </div>
                <span className="text-xs font-mono text-gray-500">{chg.date}</span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-2">{chg.title}</h3>
                <ul className="space-y-2">
                  {chg.changes.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <Link
                  href={`/products/${chg.productSlug}`}
                  className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
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
