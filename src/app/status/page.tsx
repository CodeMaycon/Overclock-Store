"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Shield, 
  Cpu, 
  Terminal, 
  Server,
  Zap,
  Radio,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

interface StatusIncident {
  title: string;
  description: string;
  updatedAt: string;
}

interface StatusServiceItem {
  id: string;
  name: string;
  category: string;
  status: "OPERATIONAL" | "MAINTENANCE" | "DEGRADED";
  uptimePercentage: number;
  historyBars: ("UP" | "DEGRADED" | "DOWN")[];
  currentIncident: StatusIncident | null;
}

export default function StatusPage() {
  const [services, setServices] = useState<StatusServiceItem[]>([]);
  const [overallUptime, setOverallUptime] = useState(99.98);
  const [zeroIncidentsDays, setZeroIncidentsDays] = useState(142);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/status");
        if (res.ok) {
          const data = await res.json();
          setServices(data.services || []);
          if (data.overallUptime) setOverallUptime(data.overallUptime);
          if (data.zeroIncidentsDays) setZeroIncidentsDays(data.zeroIncidentsDays);
        }
      } catch (err) {
        console.error("Falha ao carregar status:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 space-y-10">
      
      {/* ---------------------------------------------------- */}
      {/* 1. HEADER TELEMETRY (STITCH SPEC)                   */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-[#10b981] uppercase tracking-wider mb-2">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>INFRAESTRUTURA ENTERPRISE &amp; STATUS DOS SERVIÇOS</span>
          </div>
          <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-extrabold text-white tracking-tight uppercase leading-tight">
            Painel de Telemetria <span className="bg-gradient-to-r from-[#4edea3] to-[#10b981] bg-clip-text text-transparent">&amp; Disponibilidade</span>
          </h1>
          <p className="mt-1 text-xs text-[#bbcabf] font-['Geist']">
            Monitoramento em tempo real de latência, injeção de driver e integridade dos clusters globais da Overclock Store.
          </p>
        </div>

        {/* 3 Metric Mini-Cards Stitch */}
        <div className="grid grid-cols-3 gap-3 shrink-0 font-mono">
          <div className="p-3 rounded-xl bg-[#101412] border border-white/8 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#86948a] text-[10px]">
              <span>UPTIME GLOBAL</span>
              <Activity className="w-3 h-3 text-[#10b981]" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-['Space_Grotesk'] text-xl font-bold text-white">{overallUptime}%</span>
            </div>
            <span className="text-[9px] text-[#86948a]">Clusters BR/US</span>
          </div>

          <div className="p-3 rounded-xl bg-[#101412] border border-white/8 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#86948a] text-[10px]">
              <span>SEM INCIDENTES</span>
              <Shield className="w-3 h-3 text-[#45dfa4]" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-['Space_Grotesk'] text-xl font-bold text-white">{zeroIncidentsDays}</span>
              <span className="text-[9px] text-[#45dfa4]">Dias</span>
            </div>
            <span className="text-[9px] text-[#86948a]">Proteção Ativa</span>
          </div>

          <div className="p-3 rounded-xl bg-[#101412] border border-white/8 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#86948a] text-[10px]">
              <span>TELEMETRIA</span>
              <Terminal className="w-3 h-3 text-[#10b981]" />
            </div>
            <div className="flex items-baseline gap-1 my-1">
              <span className="font-['Space_Grotesk'] text-sm font-bold text-[#10b981]">SHA-256</span>
            </div>
            <span className="text-[9px] text-[#86948a]">Zero Falhas</span>
          </div>
        </div>
      </div>

      {/* Banner Geral de Saúde */}
      <div className="p-5 rounded-2xl bg-[#0b0f0d] border border-[#10b981]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-['Space_Grotesk'] text-sm font-bold text-white">
              Todos os Sistemas Centrais Operam em Normalidade
            </h3>
            <p className="text-xs text-[#bbcabf] font-['Geist']">
              Clusters de autenticação, nós de entrega de licenças e dispatch de chaves com latência média de 18ms.
            </p>
          </div>
        </div>

        <span className="font-mono text-xs px-3 py-1 rounded-full bg-[#10b981]/15 text-[#10b981] font-bold border border-[#10b981]/30 shrink-0 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>OPERACIONAL</span>
        </span>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. SERVICES & MODULES MATRIX                        */}
      {/* ---------------------------------------------------- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-['Space_Grotesk'] text-base font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-[#10b981]" />
            <span>Infraestrutura Core &amp; Módulos de Software</span>
          </h2>
          <span className="font-mono text-xs text-[#86948a]">
            {services.length} NÓS MONITORADOS
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#86948a] font-mono text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
            <span>Sincronizando telemetria com nós em tempo real...</span>
          </div>
        ) : (
          <div className="space-y-3">
            {services.map((srv) => {
            const isOperational = srv.status === "OPERATIONAL";
            const isMaintenance = srv.status === "MAINTENANCE";

            return (
              <div
                key={srv.id}
                className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 space-y-4 hover:border-white/15 transition-colors shadow-lg"
              >
                {/* Linha Topo: Nome, Categoria e Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] text-[#86948a] uppercase block">
                      {srv.category}
                    </span>
                    <h3 className="font-['Space_Grotesk'] text-base font-bold text-white">
                      {srv.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#86948a]">
                      {srv.uptimePercentage}% uptime
                    </span>

                    {isOperational && (
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        OPERACIONAL
                      </span>
                    )}
                    {isMaintenance && (
                      <span className="px-2.5 py-0.5 rounded-full font-mono text-[10px] bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        MANUTENÇÃO (TEMPO PAUSADO)
                      </span>
                    )}
                  </div>
                </div>

                {/* Histórico Diário (30 Barras Stitch Spec) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-[#86948a]">
                    <span>30 dias atrás</span>
                    <span className="text-[#10b981]">100% checagens operacionais</span>
                    <span>Hoje</span>
                  </div>

                  <div className="grid grid-cols-30 gap-1 h-7 items-center">
                    {srv.historyBars.map((bar, idx) => (
                      <div
                        key={idx}
                        title={`Dia ${idx + 1}: ${bar === "UP" ? "Operacional" : "Manutenção Preventiva"}`}
                        className={`h-full rounded-sm transition-opacity hover:opacity-80 ${
                          bar === "UP"
                            ? "bg-[#10b981]/80"
                            : bar === "DEGRADED"
                            ? "bg-amber-400"
                            : "bg-amber-500/60"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Incidente & Freeze Time Banner se Aplicável */}
                {srv.currentIncident && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs font-['Geist']">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-300 font-['Space_Grotesk'] flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {srv.currentIncident.title}
                      </span>
                      <span className="font-mono text-[10px] text-amber-400/80">
                        {srv.currentIncident.updatedAt}
                      </span>
                    </div>
                    <p className="text-[#bbcabf] leading-relaxed">
                      {srv.currentIncident.description}
                    </p>
                    <div className="pt-1 flex items-center gap-2 font-mono">
                      <span className="text-[10px] font-bold text-[#10b981] bg-[#10b981]/15 px-2.5 py-0.5 rounded border border-[#10b981]/30">
                        FREEZE TIME: ATIVADO (Zero perda de tempo nas chaves)
                      </span>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
          </div>
        )}
      </div>

      {/* Explicação de Freeze Time */}
      <div className="rounded-2xl bg-[#0b0f0d] p-6 border border-white/8 space-y-3">
        <h4 className="font-['Space_Grotesk'] text-sm font-bold text-[#10b981] uppercase tracking-wider flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Protocolo Oficial de Manutenção &amp; Freeze Time
        </h4>
        <p className="text-xs text-[#bbcabf] leading-relaxed font-['Geist']">
          Sempre que um jogo recebe uma atualização que altere padrões de memória, nossos engenheiros acionam o congelamento preventivo. Durante este intervalo, o contador de todas as licenças ativas do produto é paralisado. Ao normalizar o serviço, o tempo em que o módulo esteve pausado é recalculado e somado à validade da sua chave sem nenhum prejuízo.
        </p>
      </div>

    </div>
  );
}
