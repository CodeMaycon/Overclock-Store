import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade | Overclock Store",
  description: "Diretrizes de privacidade e proteção de dados dos clientes da Overclock Store.",
};

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 space-y-8 text-[#bbcabf] font-['Geist']">
      <div className="pb-6 border-b border-white/8 space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#10b981] hover:underline mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para a Home</span>
        </Link>
        <h1 className="font-['Space_Grotesk'] text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Política de Privacidade
        </h1>
        <p className="text-xs text-[#86948a] font-mono">
          Última atualização: Novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            1. Coleta de Informações
          </h2>
          <p>
            A Overclock Store coleta exclusivamente os dados indispensáveis para o processamento de compras, entrega de licenças e suporte ao cliente: endereço de e-mail, nome ou identificador público, histórico de pedidos e, quando aplicável, o identificador de hardware (HWID) para ativação segura da licença.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            2. Pagamentos e Dados Financeiros
          </h2>
          <p>
            As transações financeiras são intermediadas diretamente pelo Mercado Pago via Pix. A Overclock Store não armazena dados bancários, senhas financeiras ou chaves privadas do usuário.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            3. Finalidade e Utilização dos Dados
          </h2>
          <p>
            Os dados coletados são empregados para: validação e entrega automática das licenças adquiridas; envio de recibos e instruções de ativação por e-mail; fornecimento de suporte técnico e segurança contra fraudes e acessos não autorizados.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            4. Compartilhamento de Dados
          </h2>
          <p>
            Não comercializamos, alugamos ou compartilhamos dados pessoais com terceiros para fins de marketing. O compartilhamento ocorre unicamente com os provedores estritamente necessários para a operação do serviço (Mercado Pago para pagamentos e Resend para envio de e-mails transacionais).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            5. Direitos do Titular
          </h2>
          <p>
            O cliente pode solicitar a qualquer momento a visualização, atualização ou exclusão de seus dados cadastrais através dos canais de suporte oficiais da Overclock Store, ressalvadas as obrigações legais de guarda de registros fiscais e comerciais.
          </p>
        </section>
      </div>
    </div>
  );
}
