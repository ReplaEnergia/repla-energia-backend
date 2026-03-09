import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Tipos de e-mail suportados, cada um com seu próprio template HTML.
 */
export enum EmailType {
  CONTACT = 'contact',
  RESUME = 'resume',
}

/**
 * DTO para o anexo do e-mail.
 * O conteúdo deve ser enviado em Base64.
 * Limite de 10MB validado no MailService.
 */
export class AttachmentDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome do arquivo é obrigatório.' })
  filename: string;

  /**
   * Conteúdo do arquivo em Base64.
   * Limite de ~13.3MB em Base64 (equivale a ~10MB de arquivo original).
   */
  @IsString()
  @IsNotEmpty({ message: 'O conteúdo do arquivo é obrigatório.' })
  @MaxLength(13_981_014, {
    message: 'O anexo excede o limite de 10MB.',
  })
  content: string;

  @IsString()
  @IsNotEmpty({ message: 'O tipo MIME do arquivo é obrigatório.' })
  type: string;
}

/**
 * DTO principal para envio de e-mail.
 * Valida todos os campos antes de chegar ao MailService.
 */
export class SendEmailDto {
  /**
   * Define qual template HTML será utilizado:
   * - "contact": e-mail de contato padrão
   * - "resume": envio de currículo com indicação de anexo
   */
  @IsEnum(EmailType, {
    message: 'O tipo deve ser "contact" ou "resume".',
  })
  type: EmailType;

  /**
   * Nome: obrigatório se for currículo. Opcional para contato (feedback anônimo).
   */
  @ValidateIf((o) => o.type === EmailType.RESUME || (o.name !== undefined && o.name !== ''))
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório para envio de currículos.' })
  name?: string;

  /**
   * Email: obrigatório se for currículo. Opcional para contato (feedback anônimo).
   */
  @ValidateIf((o) => o.type === EmailType.RESUME || (o.email !== undefined && o.email !== ''))
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @IsNotEmpty({ message: 'O e-mail é obrigatório para envio de currículos.' })
  email?: string;

  @IsString()
  phone: string;

  @IsString()
  area: string;

  @IsString()
  @IsNotEmpty({ message: 'O assunto é obrigatório.' })
  subject: string;

  @IsString()
  @IsNotEmpty({ message: 'A mensagem é obrigatória.' })
  message: string;

  /**
   * Anexo obrigatório para currículos.
   */
  @ValidateIf((o) => o.type === EmailType.RESUME)
  @IsNotEmpty({ message: 'O currículo deve ser enviado em anexo.' })
  @ValidateNested()
  @Type(() => AttachmentDto)
  attachment?: AttachmentDto;
}
