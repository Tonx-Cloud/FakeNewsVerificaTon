import React from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Termos de Uso — Fake News Verificaton',
  description: 'Termos de uso do serviço Fake News Verificaton.',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      <Nav />

      <article className="max-w-3xl mx-auto px-6 py-10 prose prose-sm dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-white">
        <h1>Termos de Uso</h1>
        <p className="text-sm text-slate-400">Última atualização: fevereiro de 2026</p>

        <p>
          Ao utilizar o site <strong>Fake News Verificaton</strong> (&quot;Serviço&quot;), você concorda com os termos descritos abaixo. Caso não concorde, não utilize o Serviço.
        </p>

        <h2>1. Descrição do Serviço</h2>
        <p>
          O Fake News Verificaton é uma ferramenta gratuita e independente de análise de conteúdos para identificação de sinais de desinformação, viés e manipulação, utilizando inteligência artificial (Gemini AI) como assistência.
        </p>

        <h2>2. Natureza da análise</h2>
        <ul>
          <li>A análise é <strong>assistida por IA</strong> e <strong>não substitui</strong> checagem profissional de agências de fact-checking.</li>
          <li>Os resultados são indicativos e não devem ser considerados como verdade absoluta.</li>
          <li>O serviço não emite juízos de valor sobre pessoas, partidos ou ideologias — avalia apenas afirmações e evidências.</li>
          <li>Quando não há base suficiente para concluir, o resultado será &quot;Inconclusivo&quot;.</li>
        </ul>

        <h2>3. Uso aceitável</h2>
        <p>Você concorda em:</p>
        <ul>
          <li>Utilizar o serviço apenas para fins legítimos de verificação de informações.</li>
          <li>Não submeter conteúdo ilegal, difamatório, ameaçador ou que viole direitos de terceiros.</li>
          <li>Não tentar burlar mecanismos de segurança (rate limiting, captcha).</li>
          <li>Não utilizar bots, scrapers ou automação para acessar o serviço de forma abusiva.</li>
          <li>Não utilizar o serviço para gerar ou disseminar desinformação.</li>
        </ul>

        <h2>4. Limitação de responsabilidade</h2>
        <ul>
          <li>O serviço é fornecido &quot;como está&quot; (as is), sem garantias de qualquer natureza.</li>
          <li>Não garantimos a precisão, completude ou atualidade das análises.</li>
          <li>Não nos responsabilizamos por decisões tomadas com base nos resultados da análise.</li>
          <li>O serviço pode apresentar indisponibilidade temporária sem aviso prévio.</li>
        </ul>

        <h2>5. Propriedade intelectual</h2>
        <p>
          O código-fonte do Fake News Verificaton está disponível em repositório público. A marca, design e conteúdo editorial são de propriedade do desenvolvedor.
        </p>
        <p>
          Os relatórios de análise gerados são de livre uso do usuário para fins de informação e compartilhamento.
        </p>

        <h2>6. Privacidade e dados</h2>
        <p>
          O tratamento de dados pessoais está descrito na nossa{' '}
          <a href="/privacy">Política de Privacidade</a>, que é parte integrante destes Termos.
        </p>

        <h2>7. Inscrição em alertas</h2>
        <p>
          Ao se inscrever para receber alertas, você consente expressamente com o envio de e-mails contendo resumos e alertas de desinformação. Você pode cancelar a qualquer momento através do link presente nos e-mails ou entrando em contato conosco.
        </p>

        <h2>8. Modificações</h2>
        <p>
          Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas no site. O uso continuado do serviço após alterações constitui aceitação dos novos termos.
        </p>

        <h2>9. Legislação aplicável</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do domicílio do usuário para dirimir quaisquer questões decorrentes destes Termos.
        </p>

        <h2>10. Contato</h2>
        <p>
          Para dúvidas sobre estes Termos:{' '}
          <a href="mailto:contato@fakenewsverificaton.com.br">contato@fakenewsverificaton.com.br</a>
        </p>
      </article>

      <Footer />
    </main>
  )
}
