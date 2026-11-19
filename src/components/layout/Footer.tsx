import Link from "next/link";

export function Footer() {
  return (
    <footer className="relative z-10 w-full bg-surface-container-lowest mt-16 pt-16 pb-10 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 lg:px-12">
        {/* 5-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
          {/* Column 1: Brand */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary font-bold">
                <span className="material-symbols-outlined text-xl text-primary">bolt</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-lg uppercase text-on-surface tracking-tight font-extrabold leading-none">
                  OVERCLOCK
                </span>
                <span className="font-mono-badge text-[9px] text-primary/80 uppercase tracking-widest mt-1 font-bold">
                  DIGITAL STORE
                </span>
              </div>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Plataforma líder em fornecimento de licenças de software digitais, entrega instantânea automatizada e segurança de alta performance.
            </p>
            <div className="flex items-center gap-1.5 font-mono-badge text-mono-badge text-primary px-3 py-1.5 rounded-lg bg-surface-container w-fit border border-white/5">
              <span className="material-symbols-outlined text-xs">verified_user</span>
              <span>SERVIDORES ATIVOS 99.99%</span>
            </div>
          </div>

          {/* Column 2: Products */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono-badge text-mono-badge uppercase tracking-wider text-outline font-semibold">
              Produtos
            </h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li>
                <Link href="/products/phantom-apex" className="text-on-surface-variant hover:text-primary transition-colors">
                  Phantom Apex Suite
                </Link>
              </li>
              <li>
                <Link href="/products/spectre-val" className="text-on-surface-variant hover:text-primary transition-colors">
                  Spectre Valorant Pro
                </Link>
              </li>
              <li>
                <Link href="/products/vortex-warzone" className="text-on-surface-variant hover:text-primary transition-colors">
                  Vortex Warzone DMA
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-on-surface-variant hover:text-primary transition-colors">
                  Ver Todos os Softwares
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono-badge text-mono-badge uppercase tracking-wider text-outline font-semibold">
              Navegação
            </h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li>
                <Link href="/products" className="text-on-surface-variant hover:text-primary transition-colors">
                  Catálogo de Produtos
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-on-surface-variant hover:text-primary transition-colors">
                  Status do Sistema
                </Link>
              </li>
              <li>
                <Link href="/changelogs" className="text-on-surface-variant hover:text-primary transition-colors">
                  Notas de Atualizações
                </Link>
              </li>
              <li>
                <Link href="/reviews" className="text-on-surface-variant hover:text-primary transition-colors">
                  Avaliações de Clientes
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors">
                  Perguntas Frequentes (FAQ)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Community */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono-badge text-mono-badge uppercase tracking-wider text-outline font-semibold">
              Comunidade
            </h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li className="flex items-center justify-between">
                <a href="https://discord.gg/gqMDjvaSC" target="_blank" rel="noopener noreferrer" className="text-on-surface-variant hover:text-primary transition-colors">
                  Servidor Discord
                </a>
                <span className="font-mono-badge text-mono-badge text-primary px-1.5 py-0.5 rounded bg-surface-container font-semibold">
                  Comunidade VIP
                </span>
              </li>
              <li>
                <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors">
                  Área do Cliente
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors">
                  Suporte Especializado 24/7
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Legal & Security */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono-badge text-mono-badge uppercase tracking-wider text-outline font-semibold">
              Segurança &amp; Termos
            </h4>
            <ul className="flex flex-col gap-2 font-body-sm text-body-sm">
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors">
                  Política de Privacidade
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="text-on-surface-variant hover:text-primary transition-colors">
                  Garantia de Entrega Imediata
                </Link>
              </li>
              <li>
                <Link href="/status" className="text-on-surface-variant hover:text-primary transition-colors">
                  Verificação de Integridade
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip: Copyright & Payment Badges */}
        <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-center sm:text-left">
            <span className="font-mono-data text-mono-data text-outline">
              © {new Date().getFullYear()} OVERCLOCK STORE. Todos os direitos reservados.
            </span>
            <span className="hidden sm:inline text-outline">•</span>
            <span className="font-mono-badge text-mono-badge text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-xs">enhanced_encryption</span>
              Entrega criptografada instantânea
            </span>
          </div>

          {/* Formas de Pagamento Seguras */}
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <div className="px-2.5 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-[#10b981] font-bold flex items-center gap-1 border border-white/5">
              <span className="material-symbols-outlined text-xs">qr_code_2</span> PIX AUTOMÁTICO
            </div>
            <div className="px-2.5 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-on-surface flex items-center gap-1 border border-white/5">
              <span className="material-symbols-outlined text-xs text-primary">credit_card</span> CARTÃO
            </div>
            <div className="px-2.5 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-on-surface flex items-center gap-1 border border-white/5">
              <span className="material-symbols-outlined text-xs text-primary">currency_bitcoin</span> CRIPTO (BTC/USDT)
            </div>
            <div className="px-2.5 py-1 rounded bg-surface-container font-mono-badge text-mono-badge text-on-surface flex items-center gap-1 border border-white/5">
              <span className="material-symbols-outlined text-xs text-primary">account_balance_wallet</span> MERCADO PAGO
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
