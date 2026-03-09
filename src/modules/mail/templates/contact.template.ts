/**
 * Gera o template HTML para e-mails de contato.
 *
 * @param name    - Nome do remetente
 * @param email   - E-mail do remetente
 * @param subject - Assunto da mensagem
 * @param message - Corpo da mensagem
 * @returns String HTML pronta para ser enviada via Resend
 */
export function buildContactTemplate(
  name: string,
  email: string,
  subject: string,
  message: string,
): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nova mensagem de contato</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f8; padding: 40px 0;">
    <tr>
      <td align="center">

        <!-- Container principal -->
        <table width="600" cellpadding="0" cellspacing="0"
          style="background-color: #ffffff; border-radius: 8px;
                 box-shadow: 0 2px 8px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Cabeçalho -->
          <tr>
            <td style="background-color: #4F46E5; padding: 32px 40px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
                📬 Nova mensagem de contato
              </h1>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding: 32px 40px;">

              <!-- Nome -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f9fafb;
                             border-left: 4px solid #4F46E5; border-radius: 4px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">Nome</p>
                    <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">
                      ${escapeHtml(name)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- E-mail -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f9fafb;
                             border-left: 4px solid #4F46E5; border-radius: 4px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">E-mail</p>
                    <p style="margin: 0; font-size: 16px; color: #111827;">
                      <a href="mailto:${escapeHtml(email)}"
                         style="color: #4F46E5; text-decoration: none;">
                        ${escapeHtml(email)}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Assunto -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="padding: 12px 16px; background-color: #f9fafb;
                             border-left: 4px solid #4F46E5; border-radius: 4px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">Assunto</p>
                    <p style="margin: 0; font-size: 16px; color: #111827; font-weight: 600;">
                      ${escapeHtml(subject)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Mensagem -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 16px; background-color: #f9fafb;
                             border-left: 4px solid #4F46E5; border-radius: 4px;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #6B7280;
                               text-transform: uppercase; letter-spacing: 0.05em;">Mensagem</p>
                    <p style="margin: 0; font-size: 15px; color: #374151; line-height: 1.6;
                               white-space: pre-line;">
                      ${escapeHtml(message)}
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
