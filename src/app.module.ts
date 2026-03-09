import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ReviewsModule } from './reviews/reviews.module';
import { GalleryModule } from './gallery/gallery.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    /**
     * Rate limiting global: 5 requisições por minuto por IP.
     * Retorna 429 Too Many Requests quando o limite é excedido.
     */
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // janela de tempo em milissegundos (1 minuto)
        limit: 5,    // máximo de requisições por janela
      },
    ]),
    ReviewsModule,
    GalleryModule,
    MailModule,
  ],
  providers: [
    /**
     * Registra o ThrottlerGuard globalmente para aplicar
     * o rate limit em todos os endpoints da API.
     */
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
