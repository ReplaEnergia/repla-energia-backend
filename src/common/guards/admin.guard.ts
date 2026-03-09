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

    // Suporta ambos os cabeçalhos para retrocompatibilidade
    const token =
      request.headers['x-api-key'] ||
      request.headers['x-revalidate-token'];

    // Determina o token esperado pela variável de ambiente
    const expectedToken = process.env.ADMIN_API_KEY || process.env.GALLERY_REVALIDATE_TOKEN;

    if (!expectedToken) {
      // Se não há token configurado no ambiente, por segurança negamos acesso.
      throw new UnauthorizedException('Chave administrativa não configurada no servidor.');
    }

    if (token !== expectedToken) {
      throw new UnauthorizedException('Token administrativo inválido ou ausente.');
    }

    return true;
  }
}
