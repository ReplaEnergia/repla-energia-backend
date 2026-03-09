import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

/**
 * MailModule
 *
 * Módulo de e-mail encapsulado seguindo o princípio de feature modules (arch-feature-modules).
 * Agrupa Controller e Service para o domínio de envio de e-mails.
 *
 * Para utilizar: importar no AppModule.
 */
@Module({
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
