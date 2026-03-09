import { IsOptional, IsString } from 'class-validator';

/**
 * DTO para validação de busca de galerias.
 * Usa class-validator para garantir que os inputs da querystring sejam seguros.
 */
export class GetGalleryDto {
  @IsOptional()
  @IsString({ message: 'A categoria deve ser uma string válida.' })
  category?: string;

  @IsOptional()
  @IsString()
  refresh?: string;
}
