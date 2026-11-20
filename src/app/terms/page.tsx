import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";

export const metadata = {
  title: "Termos de Uso | Overclock Store",
  description: "Termos e condições de uso da plataforma Overclock Store para aquisição e utilização de licenças digitais.",
};

export default function TermsPage() {
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
          Termos de Uso
        </h1>
        <p className="text-xs text-[#86948a] font-mono">
          Última atualização: Novembro de 2026
        </p>
      </div>

      <div className="space-y-6 text-sm leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            1. Natureza do Serviço
          </h2>
          <p>
            A Overclock Store é uma plataforma de intermediação e distribuição de licenças digitais, utilitários de otimização e ferramentas de software para computadores pessoais (PC). Ao adquirir uma licença na Overclock Store, o cliente declara ciência dos requisitos técnicos, termos e condições do produto adquirido.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            2. Pagamentos e Entrega
          </h2>
          <p>
            Os pagamentos são processados via checkout Pix pelo Mercado Pago. A liberação da licença ocorre de forma automatizada após a validação e confirmação do pagamento pela instituição bancária / intermediador de pagamentos. A chave de acesso é disponibilizada diretamente no Painel do Cliente e encaminhada ao e-mail cadastrado.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            3. Compatibilidade e Status dos Produtos
          </h2>
          <p>
            É responsabilidade do usuário verificar previamente a compatibilidade do software com a versão do seu sistema operacional (Windows 10, Windows 11 ou outras especificadas na página do produto), processador e demais especificações de hardware. Recomendamos a consulta à página de Status dos Produtos antes de finalizar qualquer pedido.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            4. Vinculação de Hardware (HWID)
          </h2>
          <p>
            Determinadas licenças podem requerer vinculação com o identificador de hardware (HWID) da máquina do cliente para fins de autenticação e proteção contra uso simultâneo não autorizado. As solicitações de redefinição de HWID são analisadas e processadas de acordo com as diretrizes específicas de cada software no Painel do Cliente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            5. Isenção e Independência
          </h2>
          <p>
            A Overclock Store opera de forma independente, sem qualquer afiliação, patrocínio ou endosso por parte de desenvolvedoras, publicadoras de jogos eletrônicos ou fabricantes de plataformas. Marcas registradas mencionadas são utilizadas estritamente para identificação de compatibilidade. O usuário reconhece que softwares de terceiros podem apresentar riscos inerentes às suas finalidades e assume a responsabilidade de seu uso consciente.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-['Space_Grotesk'] text-lg font-bold text-white">
            6. Atendimento e Suporte
          </h2>
          <p>
            Dúvidas, suporte técnico e orientações são prestados através dos canais oficiais indicados no site da Overclock Store e em nossa comunidade oficial no Discord.
          </p>
        </section>
      </div>
    </div>
  );
}
