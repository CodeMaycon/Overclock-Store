import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Reembolso | Overclock Store",
  description: "Diretrizes e procedimentos para cancelamento, arrependimento e resolução de problemas na Overclock Store.",
};

export default function RefundPage() {
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
          Política de Reembolso
        </h1>
        <p className="text-xs text-[#86948a] font-mono">
          Última atualização: Novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            1. Diretrizes Gerais
          </h2>
          <p>
            As solicitações de cancelamento, arrependimento, reembolso e resolução de problemas na Overclock Store são tratadas conforme a legislação aplicável e as disposições desta Política de Reembolso. Nosso objetivo é garantir transparência, segurança jurídica e satisfação ao cliente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            2. Produtos Digitais e Licenças Não Ativadas
          </h2>
          <p>
            Para compras de licenças digitais que ainda não foram ativadas, visualizadas ou utilizadas, o cliente poderá solicitar o cancelamento e estorno do valor pago entrando em contato com nosso atendimento oficial em até 7 (sete) dias corridos a contar da data de confirmação do pedido.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            3. Incompatibilidade e Falhas Técnicas
          </h2>
          <p>
            Caso o software apresente falha técnica insanável ou incompatibilidade que impeça seu funcionamento, mesmo após o cumprimento das instruções do guia e assistência da equipe de suporte técnico, será fornecida substituição de chave ou estorno do valor pago, mediante avaliação técnica do caso.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            4. Procedimento para Solicitação
          </h2>
          <p>
            Para solicitar atendimento referente a reembolso, o cliente deverá abrir um chamado através dos canais oficiais da Overclock Store (comunidade oficial no Discord ou e-mail de suporte), informando:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-[#86948a] pt-1">
            <li>Número do pedido (ex: ORD-2026-XXXXX)</li>
            <li>E-mail cadastrado na conta</li>
            <li>Descrição detalhada da situação ou incompatibilidade encontrada</li>
            <li>Registro em captura de tela ou log de erro, quando aplicável</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            5. Prazos e Forma de Estorno
          </h2>
          <p>
            Após a aprovação da solicitação pela equipe, o reembolso é realizado diretamente via Pix através do intermediador de pagamentos (Mercado Pago), respeitando os prazos operacionais da instituição bancária.
          </p>
        </section>
      </div>
    </div>
  );
}
