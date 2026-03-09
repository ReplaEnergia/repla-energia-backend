/**
 * Gera o template HTML para e-mails de envio de currículo.
 *
 * @param name    - Nome do candidato
 * @param email   - E-mail do candidato
 * @param message - Mensagem de apresentação
 * @returns String HTML pronta para ser enviada via Resend
 */
export function buildResumeTemplate(
  name: string,
  email: string,
  message: string,
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Novo currículo recebido</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0fdf4; font-family: Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; padding: 40px 0;">
    <tr>
      <td align="center">

        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background-color: #ffffff; border-radius: 8px;
                 box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background-color: #16A34A; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                📄 Novo currículo recebido
              </h1>
              <p style="margin: 8px 0 0 0; color: #dcfce7; font-size: 14px;">
                Um novo candidato enviou seu currículo através do site.
              </p>
            </td>
          </tr>

          <!-- Destaque do candidato -->
          <tr>
            <td style="padding: 32px 40px 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 20px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                             border-radius: 8px; border: 1px solid #bbf7d0;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #16A34A;
                               text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
                      👤 Candidato
                    </p>
                    <p style="margin: 0; font-size: 22px; color: #14532d; font-weight: 700;">
                      ${escapeHtml(name)}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 24px 40px 32px 40px;">

              <!-- E-mail -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f9fafb;
                             border-left: 4px solid #16A34A; border-radius: 4px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">E-mail de contato</p>
                    <p style="margin: 0; font-size: 16px; color: #111827;">
                      <a href="mailto:${escapeHtml(email)}"
                         style="color: #16A34A; text-decoration: none; font-weight: 600;">
                        ${escapeHtml(email)}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Mensagem de apresentação -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 16px; background-color: #f9fafb;
                             border-left: 4px solid #16A34A; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">Apresentação</p>
                    <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;
                               white-space: pre-line;">
                      ${escapeHtml(message)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Aviso de anexo -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px 20px; background-color: #fef9c3;
                             border: 1px solid #fde68a; border-radius: 6px;">
                    <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
                      📎 O currículo do candidato está anexado a este e-mail.
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #78350f;">
                      Verifique os anexos para acessar o arquivo enviado.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Rodapé -->
          <tr>
            <td style="padding: 20px 40px; background-color: #f9fafb;
                       border-top: 1px solid #E5E7EB; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF;">
                Este e-mail foi gerado automaticamente. Por favor, não responda diretamente a esta mensagem.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

/**
 * Escapa caracteres HTML especiais para prevenir XSS nos templates.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
