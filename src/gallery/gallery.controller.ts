import {
  Controller,
  Get,
  Post,
  Header,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GalleryService } from './gallery.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { GetGalleryDto } from './dto/get-gallery.dto';

@Controller('api/gallery')
export class GalleryController {
  constructor(private readonly galleryService: GalleryService) { }

  @Get()
  @Header('Content-Type', 'application/json')
  async getGallery(@Query() query: GetGalleryDto) {
    return this.galleryService.getGallery(query.category);
  }

  @Post('clear-cache')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'application/json')
  async clearCache(@Query() query: GetGalleryDto) {
    return this.galleryService.clearCache(query.category);
  }

  @Get('test')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'application/json')
  async testConnection() {
    return this.galleryService.testSupabaseConnection();
  }

  @Get('structure')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'application/json')
  async getStructure() {
    return this.galleryService.getBucketStructure();
  }

  @Get('debug')
  @UseGuards(AdminGuard)
  @Header('Content-Type', 'application/json')
  async debug(@Query() query: GetGalleryDto) {
    try {
      if (query.refresh === 'true') {
        await this.galleryService.clearCache(query.category);
      }

      const gallery = await this.galleryService.getGallery(query.category);
      const connection = await this.galleryService.testSupabaseConnection();
      const structure = await this.galleryService.getBucketStructure();

      return {
        success: true,
        timestamp: new Date().toISOString(),
        category: query.category || 'Todos',
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