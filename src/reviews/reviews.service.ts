import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Redis } from '@upstash/redis';

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  profile_photo_url: string;
  relative_time_description: string;
}

export interface ReviewsResponse {
  rating: number;
  total: number;
  reviews: GoogleReview[];
  lastUpdated: string;
  cacheHit: boolean;
  cacheTTL?: number;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);
  private readonly CACHE_KEY = 'google:reviews';
  private readonly CACHE_TTL = 60 * 60 * 24; // 24h em segundos

  private readonly PLACE_ID = process.env.GOOGLE_PLACE_ID;
  private readonly API_KEY = process.env.GOOGLE_API_KEY;

  private redis: Redis;

  constructor() {
    // Inicializa o Redis do Upstash com SUAS credenciais
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    this.logger.log('✅ Upstash Redis inicializado com suas credenciais');
    this.logger.debug(`URL: ${process.env.KV_REST_API_URL ? 'Configurada' : 'Usando padrão'}`);
  }

  async getReviews(): Promise<ReviewsResponse> {
    try {
      // 1. Tenta buscar do cache
      const cached = await this.redis.get<ReviewsResponse>(this.CACHE_KEY);
      
      if (cached) {
        // Verifica o TTL restante
        const ttl = await this.redis.ttl(this.CACHE_KEY);
        this.logger.log(`✅ Cache HIT - TTL restante: ${ttl} segundos (${Math.floor(ttl/3600)}h ${Math.floor((ttl%3600)/60)}m)`);
        
        return {
          ...cached,
          cacheHit: true,
          cacheTTL: ttl,
        };
      }

      this.logger.log('🔄 Cache MISS - Buscando da API do Google...');

      // 2. Busca da API do Google
      const url =
      `https://maps.googleapis.com/maps/api/place/details/json` +
        `?place_id=${this.PLACE_ID}` +
        `&fields=reviews,rating,user_ratings_total` +
        `&reviews_sort=newest` +
        `&language=pt-BR` +
        `&key=${this.API_KEY}`;


      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new HttpException(
          `Erro ao buscar avaliações: ${data.status}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const result: ReviewsResponse = {
        rating: data.result.rating || 0,
        total: data.result.user_ratings_total || 0,
        reviews: data.result.reviews?.slice(0, 5) || [],
        lastUpdated: new Date().toISOString(),
        cacheHit: false,
      };

      // 3. Salva no Upstash Redis com TTL
      await this.redis.setex(this.CACHE_KEY, this.CACHE_TTL, result);
      
      this.logger.log(`💾 Cache salvo no Upstash Redis por ${this.CACHE_TTL} segundos (24h)`);
      this.logger.log(`📊 Reviews encontrados: ${result.reviews.length}`);

      return result;
      
    } catch (error) {
      this.logger.error('❌ Erro no serviço de reviews:', error);
      
      // Fallback: retorna cache expirado se existir
      try {
        const expiredCache = await this.redis.get<ReviewsResponse>(this.CACHE_KEY);
        if (expiredCache) {
          this.logger.warn('⚠️ Retornando cache expirado (fallback)');
          return {
            ...expiredCache,
            cacheHit: true,
            cacheTTL: 0,
            lastUpdated: expiredCache.lastUpdated + ' (EXPIRED FALLBACK)'
          };
        }
      } catch (fallbackError) {
        this.logger.error('❌ Fallback também falhou:', fallbackError);
      }
      
      throw new HttpException(
        `Erro interno: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Método para limpar cache manualmente
  async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      const deleted = await this.redis.del(this.CACHE_KEY);
      this.logger.log(`🗑️ Cache limpo no Upstash Redis. Chaves deletadas: ${deleted}`);
      return {
        success: true,
        message: `Cache limpo com sucesso. ${deleted} chave(s) removida(s).`
      };
    } catch (error) {
      this.logger.error('Erro ao limpar cache:', error);
      return {
        success: false,
        message: `Erro ao limpar cache: ${error.message}`
      };
    }
  }

  // Método para verificar status do Redis
  async getRedisStatus() {
    try {
      const startTime = Date.now();
      await this.redis.ping();
      const pingTime = Date.now() - startTime;
      
      const ttl = await this.redis.ttl(this.CACHE_KEY);
      const dbsize = await this.redis.dbsize();
      
      return {
        connected: true,
        ping: `${pingTime}ms`,
        ttl,
        hasCache: ttl > 0,
        databaseSize: dbsize,
        instance: 'good-skunk-10424.upstash.io',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Método para ver todas as chaves (cuidado: não use em produção com muitas chaves)
  async getAllKeys() {
    try {
      // Nota: Upstash Redis REST API não suporta comando KEYS *
      // Vamos usar SCAN ou apenas verificar nossas chaves conhecidas
      const knownKeys = [
        this.CACHE_KEY,
        'test:connection',
        'api:requests:count'
      ];
      
      const results: Array<{ key: string; type: string; ttl: number }> = [];
      for (const key of knownKeys) {
        const type = await this.redis.type(key);
        const ttl = await this.redis.ttl(key);
        results.push({ key, type, ttl });
      }
      
      return results;
    } catch (error) {
      return { error: error.message };
    }
  }
}