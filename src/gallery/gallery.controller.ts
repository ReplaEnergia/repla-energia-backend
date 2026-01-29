import {
  Controller,
  Get,
  Post,
  Header,
  Query,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';

@Controller('api/gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) {}

  @Get()
  @Header('Content-Type', 'application/json')
  async getGallery(@Query('category') category?: string) {
    return this.galleryService.getGallery(category);
  }

  @Post('clear-cache')
  @Header('Content-Type', 'application/json')
  async clearCache(
    @Query('category') category?: string,
    @Headers('x-revalidate-token') token?: string,
  ) {
    const expectedToken = process.env.GALLERY_REVALIDATE_TOKEN;
    if (expectedToken && token !== expectedToken) {
      throw new HttpException('Não autorizado', HttpStatus.UNAUTHORIZED);
    }

    return this.galleryService.clearCache(category);
  }

  @Get('test')
  @Header('Content-Type', 'application/json')
  async testConnection() {
    return this.galleryService.testSupabaseConnection();
  }

  @Get('structure')
  @Header('Content-Type', 'application/json')
  async getStructure() {
    return this.galleryService.getBucketStructure();
  }

  @Get('debug')
  @Header('Content-Type', 'application/json')
  async debug(
    @Query('category') category?: string,
    @Query('refresh') refresh?: string,
  ) {
    try {
      if (refresh === 'true') {
        await this.galleryService.clearCache(category);
      }

      const gallery = await this.galleryService.getGallery(category);
      const connection = await this.galleryService.testSupabaseConnection();
      const structure = await this.galleryService.getBucketStructure();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        category: category || 'Todos',
        gallery: {
          itemCount: gallery.items.length,
          sampleItems: gallery.items.slice(0, 3).map(item => ({
            id: item.id.substring(0, 30) + '...',
            title: item.title,
            src: item.src.substring(0, 80) + '...',
            category: item.category,
          })),
        },
        connection,
        structure,
        environment: {
          bucket: process.env.SUPABASE_BUCKET || 'Rapla (padrão)',
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}