import {
  Injectable,
  InternalServerErrorException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Resend } from 'resend';
import { SendEmailDto, EmailType } from './dto/send-email.dto';
import { buildContactTemplate } from './templates/contact.template';
import { buildResumeTemplate } from './templates/resume.template';

import { ConfigService } from '@nestjs/config';

/**
 * Limite máximo do anexo em bytes: 10MB.
 * Base64 infla o tamanho em ~33%, então verificamos o tamanho
 * do conteúdo base64 antes do envio.
 */
const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB em bytes originais

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  private resend: Resend;
  private readonly toEmail: string;
  private readonly fromContactEmail: string;
  private readonly fromResumeEmail: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY não configurada. Usando chave de teste. O envio de e-mails falhará.',
      );
      this.resend = new Resend('re_dummy_fallback_key');
    } else {
      this.resend = new Resend(apiKey);
    }

    this.toEmail = this.configService.get<string>('MAIL_TO') ?? 'destino@email.com';

    // Remetente padrão de contato
    this.fromContactEmail =
      this.configService.get<string>('MAIL_FROM') ?? 'Site <contato@replaenergia.com.br>';

    // Remetente de currículos
    this.fromResumeEmail =
      this.configService.get<string>('MAIL_RESUME_FROM') ?? 'Site <curriculo@replaenergia.com.br>';
  }

  /**
   * Envia um e-mail utilizando o Resend SDK.
   *
   * Fluxo:
   * 1. Valida o tamanho do anexo (se houver)
   * 2. Seleciona o template HTML com base no campo `type`
   * 3. Monta e envia o e-mail via Resend
   * 4. Retorna resposta padronizada de sucesso ou lança exceção
   */
  async sendEmail(dto: SendEmailDto): Promise<{ success: boolean; message: string }> {
    const { type, name, email, subject, message, attachment, phone, area } = dto;

    // Validação do tamanho do anexo (10MB limite)
    if (attachment) {
      this.validateAttachmentSize(attachment.content);
    }

    // Seleciona o template correto baseado no tipo de e-mail
    const htmlTemplate = this.buildTemplate(type, { name, email, subject, message, phone, area });

    // Seleciona o remetente apropriado de acordo com o tipo
    const fromSender = type === EmailType.RESUME ? this.fromResumeEmail : this.fromContactEmail;

    try {
      const { error } = await this.resend.emails.send({
        from: fromSender,
        to: [this.toEmail],
        subject,
        html: htmlTemplate,
        attachments: attachment
          ? [
            {
              filename: attachment.filename,
              content: attachment.content,
            },
          ]
          : [],
      });

      if (error) {
        this.logger.error(`Erro retornado pela API Resend: ${JSON.stringify(error)}`);
        throw new InternalServerErrorException('Erro ao enviar e-mail');
      }

      this.logger.log(
        `E-mail do tipo "${type}" enviado com sucesso de: ${email || 'Anônimo'}`,
      );
      return { success: true, message: 'Email enviado com sucesso' };
    } catch (err) {
      // Re-lança erros HTTP do NestJS (BadRequest, etc.)
      if (err instanceof BadRequestException || err instanceof InternalServerErrorException) {
        throw err;
      }

      this.logger.error(`Falha inesperada ao enviar e-mail: ${err?.message ?? err}`);
      throw new InternalServerErrorException('Erro ao enviar email');
    }
  }

  /**
   * Valida o tamanho do conteúdo Base64 do anexo.
   * Converte de Base64 para bytes e compara com o limite de 10MB.
   *
   * @param base64Content - Conteúdo do arquivo em Base64
   * @throws BadRequestException se o arquivo exceder 10MB
   */
  private validateAttachmentSize(base64Content: string): void {
    // Remove possível prefixo data URI (ex: "data:application/pdf;base64,")
    const base64Data = base64Content.includes(',')
      ? base64Content.split(',')[1]
      : base64Content;

    // Calcula tamanho em bytes: (length * 3) / 4 - padding
    const padding = (base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0);
    const sizeInBytes = (base64Data.length * 3) / 4 - padding;

    if (sizeInBytes > MAX_ATTACHMENT_SIZE_BYTES) {
      throw new BadRequestException('O anexo excede o limite máximo de 10MB.');
    }
  }

  /**
   * Seleciona e constrói o template HTML correto com base no tipo de e-mail.
   *
   * @param type    - Tipo do e-mail (contact | resume)
   * @param data    - Dados para preenchimento do template
   * @returns HTML string do template selecionado
   */
  private buildTemplate(
    type: EmailType,
    data: { name?: string; email?: string; subject: string; message: string; phone?: string; area?: string },
  ): string {
    switch (type) {
      case EmailType.CONTACT:
        return buildContactTemplate(
          data.name || 'Anônimo (Feedback)',
          data.email || 'Não informado',
          data.subject,
          data.message,
        );
      case EmailType.RESUME:
        // No resume é obrigatório pelo DTO, mas garantimos strings válidas aqui.
        return buildResumeTemplate(data.name || 'Candidato', data.email || 'Não informado', data.phone || 'Não informado', data.area || 'Não informado', data.message);
      default:
        // Proteção em runtime além da validação do DTO
        throw new BadRequestException('Tipo de e-mail inválido.');
    }
  }
}
