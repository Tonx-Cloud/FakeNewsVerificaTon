import React from 'react'
import Nav from '@/components/Nav'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Política de Privacidade — Fake News Verificaton',
  description: 'Política de privacidade e proteção de dados do Fake News Verificaton conforme a LGPD.',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors">
      <Nav />

      <article className="max-w-3xl mx-auto px-6 py-10 prose prose-sm dark:prose-invert prose-headings:text-slate-800 dark:prose-headings:text-white">
        <h1>Política de Privacidade</h1>
        <p className="text-sm text-slate-400">Última atualização: fevereiro de 2026</p>

        <p>
          O <strong>Fake News Verificaton</strong> (&quot;nós&quot;, &quot;nosso&quot;) respeita a sua privacidade e está comprometido com a proteção dos seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
        </p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li><strong>E-mail:</strong> utilizado para login (OTP/magic link) e para envio de alertas, caso você se inscreva.</li>
          <li><strong>Nome (opcional):</strong> como gostaria de ser chamado nos e-mails de alerta.</li>
          <li><strong>WhatsApp (opcional):</strong> para futuras notificações de alerta, se fornecido.</li>
          <li><strong>Endereço IP:</strong> usado temporariamente para limitação de requisições (rate limiting). Não é armazenado de forma persistente.</li>
          <li><strong>Conteúdo enviado para análise:</strong> textos, links, imagens ou áudios submetidos são processados pela IA e um resumo é armazenado para fins de agregação (trending). O conteúdo completo não é retido além do processamento.</li>
        </ul>

        <h2>2. Finalidade do tratamento</h2>
        <ul>
          <li>Fornecer o serviço de análise de desinformação.</li>
          <li>Autenticação de usuários via Supabase Auth.</li>
          <li>Envio de alertas de desinformação e resumos semanais (apenas para inscritos).</li>
          <li>Agregação de dados para exibição de tendências (fakes em alta).</li>
          <li>Segurança e prevenção de abuso (rate limiting, captcha).</li>
        </ul>

        <h2>3. Base legal</h2>
        <p>
          O tratamento de dados se baseia no <strong>consentimento</strong> (Art. 7º, I, LGPD) obtido no momento da inscrição, e no <strong>legítimo interesse</strong> (Art. 7º, IX, LGPD) para a operação do serviço de análise e segurança.
        </p>

        <h2>4. Compartilhamento com terceiros</h2>
        <p>Seus dados podem ser compartilhados com:</p>
        <ul>
          <li><strong>Supabase:</strong> armazenamento de dados e autenticação (servidores nos EUA).</li>
          <li><strong>Google (Gemini AI):</strong> o conteúdo submetido é enviado para a API do Gemini para análise. O Google pode processar esses dados conforme sua política de privacidade.</li>
          <li><strong>Vercel:</strong> hospedagem do site e processamento de requisições.</li>
          <li><strong>Cloudflare:</strong> proteção anti-bot (Turnstile).</li>
          <li><strong>Upstash:</strong> rate limiting via Redis.</li>
          <li><strong>Resend:</strong> envio de e-mails transacionais e alertas.</li>
        </ul>
        <p>Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing.</p>

        <h2>5. Retenção de dados</h2>
        <ul>
          <li><strong>Conta e perfil:</strong> mantidos enquanto sua conta estiver ativa.</li>
          <li><strong>Inscrições:</strong> mantidas até que você solicite exclusão ou cancele.</li>
          <li><strong>Análises:</strong> resumos são mantidos para estatísticas agregadas. Dados pessoais não são vinculados às análises.</li>
          <li><strong>Logs de IP:</strong> retidos temporariamente (máximo 24h) para rate limiting.</li>
        </ul>

        <h2>6. Seus direitos (LGPD)</h2>
        <p>Você tem direito a:</p>
        <ul>
          <li>Confirmar a existência de tratamento de dados.</li>
          <li>Acessar seus dados pessoais.</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
          <li>Solicitar a eliminação dos seus dados pessoais.</li>
          <li>Revogar o consentimento a qualquer momento.</li>
          <li>Solicitar a portabilidade dos dados.</li>
        </ul>

        <h2>7. Exclusão de dados</h2>
        <p>
          Para solicitar a exclusão dos seus dados, envie um e-mail para{' '}
          <a href="mailto:contato@fakenewsverificaton.com.br">contato@fakenewsverificaton.com.br</a>{' '}
          com o assunto &quot;Exclusão de dados&quot;. Processaremos sua solicitação em até 15 dias úteis.
        </p>
        <p>
          Você também pode cancelar sua inscrição de alertas a qualquer momento através do link de cancelamento presente nos e-mails.
        </p>

        <h2>8. Segurança</h2>
        <p>
          Adotamos medidas técnicas como criptografia em trânsito (HTTPS/TLS), autenticação segura (OTP), limitação de requisições e verificação anti-bot para proteger seus dados.
        </p>

        <h2>9. Cookies</h2>
        <p>
          Utilizamos cookies estritamente necessários para autenticação e preferências (modo escuro). Não utilizamos cookies de rastreamento ou publicidade.
        </p>

        <h2>10. Contato</h2>
        <p>
          Para dúvidas sobre esta política ou sobre o tratamento dos seus dados:{' '}
          <a href="mailto:contato@fakenewsverificaton.com.br">contato@fakenewsverificaton.com.br</a>
        </p>
      </article>

      <Footer />
    </main>
  )
}
