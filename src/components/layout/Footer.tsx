import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full bg-[#050706] mt-16 pt-16 pb-12 border-t border-white/5 font-['Geist']">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Column 1: Brand & Description */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <Link href="/" className="flex items-center shrink-0 w-fit" aria-label="Overclock Store">
              <img
                src="/logo.png"
                alt="OVERCLOCK STORE"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-xs text-[#86948a] leading-relaxed">
              Overclock Store — Licenças digitais, spoofers e utilitários para PC com entrega automática via Pix, status transparente e suporte em português.
            </p>
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#10b981] px-3 py-1.5 rounded-lg bg-white/5 w-fit border border-white/5">
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              <span>STATUS POR PRODUTO</span>
            </div>
          </div>

          {/* Column 2: Navegação & Produtos */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
              Catálogo &amp; Loja
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-[#86948a]">
              <li>
                <Link href="/products" className="hover:text-[#10b981] transition-colors">
                  Explorar Catálogo
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-[#10b981] transition-colors">
                  Status dos Produtos
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="hover:text-[#10b981] transition-colors">
                  Avaliações Verificadas
                </Link>
              </li>
              <li>
                <Link href="/changelogs" className="hover:text-[#10b981] transition-colors">
                  Notas de Atualizações
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Suporte & Comunidade */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
              Atendimento &amp; Ajuda
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-[#86948a]">
              <li>
                <Link href="/dashboard" className="hover:text-[#10b981] transition-colors">
                  Painel do Cliente
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[#10b981] transition-colors">
                  Perguntas Frequentes (FAQ)
                </Link>
              </li>
              <li>
                <a
                  href="https://discord.gg/w7R5wX3r99"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#10b981] transition-colors inline-flex items-center gap-1.5"
                >
                  <span>Servidor Discord Oficial</span>
                  <span className="text-[10px] font-mono text-[#10b981] bg-[#10b981]/10 px-1.5 py-0.5 rounded">
                    Suporte
                  </span>
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Jurídico & Legislação */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-xs uppercase tracking-wider text-white font-bold">
              Termos &amp; Políticas
            </h4>
            <ul className="flex flex-col gap-2.5 text-xs text-[#86948a]">
              <li>
                <Link href="/terms" className="hover:text-[#10b981] transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#10b981] transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/refund" className="hover:text-[#10b981] transition-colors">
                  Política de Reembolso
                </Link>
              </li>
              <li>
                <Link href="/status" className="hover:text-[#10b981] transition-colors">
                  Condições de Funcionamento
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <p className="text-xs text-[#86948a] leading-relaxed max-w-2xl font-['Geist']">
              © {currentYear} Overclock Store. Todos os direitos reservados. Loja independente de licenças digitais — sem afiliação, patrocínio ou endosso de desenvolvedoras ou publicadoras de jogos. Todas as marcas citadas pertencem aos seus respectivos proprietários.
            </p>
          </div>

          {/* Formas de Pagamento Ativas (Apenas Pix Mercado Pago) */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-lg bg-white/5 font-mono text-xs text-[#10b981] font-bold flex items-center gap-1.5 border border-white/8">
              <span>⚡ PIX VIA MERCADO PAGO</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
