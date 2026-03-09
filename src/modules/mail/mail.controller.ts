import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { MailService } from './mail.service';
import { SendEmailDto } from './dto/send-email.dto';

/**
 * MailController
 *
 * Gerencia a rota de envio de e-mails.
 * O rate limiting global (5 req/min por IP) é aplicado automaticamente
 * via ThrottlerGuard registrado globalmente no AppModule.
 *
 * Rota: POST /mail/send
 */
@Controller('api/mail')
export class MailController {
  constructor(private readonly mailService: MailService) { }

  /**
   * Endpoint para envio de e-mail.
   *
   * Validações automáticas via ValidationPipe global (configurado no main.ts).
   * Em caso de dados inválidos, retorna 400 Bad Request.
   * Em caso de rate limit excedido, retorna 429 Too Many Requests.
   *
   * @param sendEmailDto - Payload validado pelo class-validator
   * @returns Objeto com `success` e `message` indicando resultado do envio
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() sendEmailDto: SendEmailDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.mailService.sendEmail(sendEmailDto);
  }
}
