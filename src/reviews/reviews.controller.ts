import { Controller, Get, Post, Header } from '@nestjs/common';
import { ReviewsService, ReviewsResponse } from './reviews.service';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @Header('Content-Type', 'application/json')
  async getReviews(): Promise<ReviewsResponse> {
    return this.reviewsService.getReviews();
  }

  @Post('clear-cache')
  @Header('Content-Type', 'application/json')
  async clearCache() {
    return this.reviewsService.clearCache();
  }

  @Get('redis-status')
  @Header('Content-Type', 'application/json')
  async getRedisStatus() {
    return this.reviewsService.getRedisStatus();
  }

  @Get('keys')
  @Header('Content-Type', 'application/json')
  async getAllKeys() {
    return this.reviewsService.getAllKeys();
  }

  @Get('test')
  @Header('Content-Type', 'application/json')
  async testConnection() {
    try {
      // Testa a conexão com Redis
      const redisStatus = await this.reviewsService.getRedisStatus();
      
      // Testa a API do Google
      const reviews = await this.reviewsService.getReviews();
      
      return {
        success: true,
        timestamp: new Date().toISOString(),
        redis: redisStatus,
        reviews: {
          count: reviews.reviews.length,
          cacheHit: reviews.cacheHit,
          ttl: reviews.cacheTTL
        },
        environment: {
          redisUrlConfigured: !!process.env.KV_REST_API_URL,
          redisTokenConfigured: !!process.env.KV_REST_API_TOKEN,
          placeIdConfigured: !!process.env.PLACE_ID,
          apiKeyConfigured: !!process.env.API_KEY
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('force-refresh')
  @Header('Content-Type', 'application/json')
  async forceRefresh() {
    try {
      // Limpa o cache primeiro
      await this.reviewsService.clearCache();
      
      // Busca novos dados
      const reviews = await this.reviewsService.getReviews();
      
      return {
        success: true,
        message: 'Cache forçado a atualizar',
        timestamp: new Date().toISOString(),
        reviews: {
          count: reviews.reviews.length,
          rating: reviews.rating,
          total: reviews.total,
          lastUpdated: reviews.lastUpdated
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}