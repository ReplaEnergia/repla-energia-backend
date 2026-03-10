import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * AdminGuard
 *
 * Protege rotas administrativas (como clear-cache, debug e tests)
 * verificando um token presente no cabeçalho 'x-api-key' ou 'x-revalidate-token'.
 *
 * Utiliza a variável de ambiente `ADMIN_API_KEY` ou `GALLERY_REVALIDATE_TOKEN` como fallback.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Verifica token administrativo (API Key manual)
    const token = request.headers['x-api-key'] || request.headers['x-revalidate-token'];
    const expectedToken = process.env.ADMIN_API_KEY || process.env.GALLERY_REVALIDATE_TOKEN;

    // 2. Verifica token de Cron da Vercel
    const authHeader = request.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    // Se a requisição veio do Vercel Cron, está autorizada.
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      return true;
    }

    if (!expectedToken) {
      // Se não há token configurado no ambiente, por segurança negamos acesso.
      throw new UnauthorizedException('Chave administrativa não configurada no servidor.');
    }

    if (token !== expectedToken) {
      throw new UnauthorizedException('Token administrativo ou Cron inválido ou ausente.');
    }

    return true;
  }
}
