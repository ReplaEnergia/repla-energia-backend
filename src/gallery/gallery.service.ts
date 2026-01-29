import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Defina os slugs baseados nas SUAS pastas
type CategorySlug =
  | 'instalacoes'
  | 'manutencao'
  | 'energia-solar'
  | 'automacao'
  | 'iluminacao'
  | 'industrial';

// Mapeamento das pastas para labels bonitas
const SLUG_TO_LABEL: Record<CategorySlug, string> = {
  instalacoes: 'Instalações',
  manutencao: 'Manutenção',
  'energia-solar': 'Energia Solar',
  automacao: 'Automação',
  iluminacao: 'Iluminação',
  industrial: 'Industrial',
};

const ALL_SLUGS: CategorySlug[] = [
  'instalacoes',
  'manutencao',
  'energia-solar',
  'automacao',
  'iluminacao',
  'industrial',
];

export interface GalleryItemDto {
  id: string;
  type: 'image' | 'video';
  src: string;
  thumbnail: string;
  title: string;
  category: string;
  categorySlug: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class GalleryService {
  private readonly logger = new Logger(GalleryService.name);
  private readonly CACHE_TTL = 60 * 60 * 24; // 1 DIA de cache!
  private redis: Redis;
  private supabase: SupabaseClient;
  private bucket: string;

  constructor() {
    // Configuração do Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Bucket correto: "Rapla" (com R maiúsculo)
    this.bucket = process.env.SUPABASE_BUCKET || 'Repla';

    // Configuração do Redis
    this.redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });

    this.logger.log(`✅ Supabase Storage configurado - Bucket: ${this.bucket}`);
  }

  private normalizeCategory(input?: string): string {
    if (!input || input.trim() === '') return 'Todos';
    const value = input.trim().toLowerCase();
    if (value === 'todos') return 'Todos';
    return value;
  }

  private extractTitle(filename: string): string {
    // Remove extensão e formata para título
    return filename
      .replace(/\.[^/.]+$/, '') // Remove extensão
      .replace(/[-_]/g, ' ') // Substitui hífens e underscores por espaços
      .replace(/\b\w/g, l => l.toUpperCase()) // Capitaliza palavras
      .trim() || 'Imagem';
  }

  private isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'];
    return imageExtensions.some(ext => 
      filename.toLowerCase().endsWith(ext)
    );
  }

  async getGallery(category?: string): Promise<{ items: GalleryItemDto[] }> {
    const normalized = this.normalizeCategory(category);
    const cacheKey = `gallery:${normalized}`;

    try {
      // 1. Tenta buscar do cache (1 dia)
      const cached = await this.redis.get<{ items: GalleryItemDto[] }>(cacheKey);
      
      if (cached) {
        const ttl = await this.redis.ttl(cacheKey);
        if (ttl > 60) { // Se tem mais de 1 minuto de cache
          this.logger.log(`✅ Cache HIT - ${normalized} (TTL: ${ttl}s)`);
          return cached;
        }
      }

      this.logger.log(`🔄 Cache MISS - Buscando ${normalized} do Supabase...`);

      // 2. Determina quais pastas buscar
      const folders: CategorySlug[] = normalized === 'Todos' 
        ? ALL_SLUGS 
        : (ALL_SLUGS.includes(normalized as CategorySlug) 
            ? [normalized as CategorySlug] 
            : []);

      if (folders.length === 0) {
        // Retorna array vazio em vez de erro
        return { items: [] };
      }

      // 3. Busca imagens do Supabase Storage
      const allItems: GalleryItemDto[] = [];

      for (const folder of folders) {
        try {
          this.logger.debug(`Buscando na pasta: ${folder}`);
          
          // Lista arquivos na pasta
          const { data: files, error } = await this.supabase.storage
            .from(this.bucket)
            .list(folder, {
              limit: 100,
              offset: 0,
              sortBy: { column: 'name', order: 'asc' },
            });

          if (error) {
            this.logger.warn(`⚠️ Erro na pasta ${folder}:`, error.message);
            continue;
          }

          if (!files || files.length === 0) {
            this.logger.warn(`⚠️ Nenhum arquivo na pasta ${folder}`);
            continue;
          }

          // Filtra apenas imagens
          const imageFiles = files.filter(file => 
            this.isImageFile(file.name)
          );

          // Processa cada imagem
          for (const file of imageFiles) {
            // URL pública da imagem
            const { data: urlData } = this.supabase.storage
              .from(this.bucket)
              .getPublicUrl(`${folder}/${file.name}`);

            if (!urlData.publicUrl) {
              continue;
            }

            const item: GalleryItemDto = {
              id: file.id || `${folder}/${file.name}`,
              type: 'image',
              src: urlData.publicUrl,
              thumbnail: urlData.publicUrl, // Mesma URL, poderia otimizar depois
              title: this.extractTitle(file.name),
              category: SLUG_TO_LABEL[folder],
              categorySlug: folder,
              metadata: {
                size: file.metadata?.size,
                mimetype: file.metadata?.mimetype,
                lastModified: file.updated_at,
              },
            };

            allItems.push(item);
          }

          this.logger.log(`✅ ${imageFiles.length} imagens em ${folder}`);

        } catch (error) {
          this.logger.error(`❌ Erro na pasta ${folder}:`, error);
        }
      }

      // Ordena por título
      allItems.sort((a, b) => a.title.localeCompare(b.title));

      const payload = { items: allItems };

      // 4. Salva no cache (1 dia)
      if (allItems.length > 0) {
        await this.redis.setex(cacheKey, this.CACHE_TTL, payload);
        this.logger.log(`💾 Cache salvo por 1 dia: ${allItems.length} itens`);
      } else {
        // Se não encontrou nada, cacheia vazio por 1 hora
        await this.redis.setex(cacheKey, 3600, payload);
        this.logger.warn(`⚠️ Nenhum item encontrado, cache vazio por 1h`);
      }

      return payload;

    } catch (error) {
      this.logger.error('❌ Erro no serviço de galeria:', error);
      
      // Fallback: retorna cache expirado se existir
      try {
        const expiredCache = await this.redis.get<{ items: GalleryItemDto[] }>(cacheKey);
        if (expiredCache) {
          this.logger.warn(`⚠️ Retornando cache expirado (${expiredCache.items.length} itens)`);
          return expiredCache;
        }
      } catch (cacheError) {
        this.logger.error('Fallback falhou:', cacheError);
      }

      // Se tudo falhar, retorna array vazio
      return { items: [] };
    }
  }

  async clearCache(category?: string): Promise<{
    success: boolean;
    clearedKeys: string[];
    clearedAt: string;
  }> {
    const normalized = this.normalizeCategory(category);
    
    try {
      const keysToClear = normalized === 'Todos'
        ? ['gallery:Todos', ...ALL_SLUGS.map(slug => `gallery:${slug}`)]
        : [`gallery:${normalized}`];

      await Promise.all(keysToClear.map(key => this.redis.del(key)));
      
      this.logger.log(`🗑️ Cache limpo: ${keysToClear.join(', ')}`);
      
      return {
        success: true,
        clearedKeys: keysToClear,
        clearedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('❌ Erro ao limpar cache:', error);
      throw new HttpException(
        `Erro ao limpar cache: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async testSupabaseConnection() {
    try {
      // Testa se consegue listar buckets
      const { data: buckets, error: bucketsError } = await this.supabase.storage.listBuckets();
      
      if (bucketsError) {
        return {
          connected: false,
          error: bucketsError.message,
          timestamp: new Date().toISOString(),
        };
      }

      // Verifica se o bucket existe
      const bucketExists = buckets?.some(b => b.name === this.bucket) || false;
      
      if (!bucketExists) {
        return {
          connected: true,
          bucketExists: false,
          message: `Bucket "${this.bucket}" não encontrado`,
          availableBuckets: buckets?.map(b => b.name) || [],
          timestamp: new Date().toISOString(),
        };
      }

      // Tenta listar alguma pasta
      const { data: folders, error: foldersError } = await this.supabase.storage
        .from(this.bucket)
        .list();

      // Conta imagens por pasta
      const categoryStats: Record<string, number> = {};
      
      for (const folder of ALL_SLUGS) {
        try {
          const { data: files } = await this.supabase.storage
            .from(this.bucket)
            .list(folder);
          
          const imageCount = files?.filter(f => this.isImageFile(f.name)).length || 0;
          categoryStats[folder] = imageCount;
        } catch {
          categoryStats[folder] = 0;
        }
      }

      return {
        connected: true,
        bucket: this.bucket,
        bucketExists: true,
        totalBuckets: buckets?.length || 0,
        folders: folders?.length || 0,
        categoryStats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Método para debug detalhado
  async getBucketStructure() {
    try {
      const structure: any = {};
      
      // Lista todas as pastas no bucket
      const { data: rootItems } = await this.supabase.storage
        .from(this.bucket)
        .list();
      
      // Para cada pasta conhecida, lista os arquivos
      for (const folder of ALL_SLUGS) {
        try {
          const { data: files } = await this.supabase.storage
            .from(this.bucket)
            .list(folder);
          
          structure[folder] = {
            exists: !!files,
            fileCount: files?.length || 0,
            imageCount: files?.filter(f => this.isImageFile(f.name)).length || 0,
            sampleFiles: files?.slice(0, 3).map(f => f.name) || []
          };
        } catch (error) {
          structure[folder] = { error: error.message };
        }
      }
      
      return {
        bucket: this.bucket,
        structure,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}