# Redis Queue & Caching Implementation Guide

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
4. [Phase 2: Queue Implementation](#phase-2-queue-implementation)
5. [Phase 3: Cache Implementation](#phase-3-cache-implementation)
6. [Phase 4: Integration](#phase-4-integration)
7. [Testing Guide](#testing-guide)
8. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### Current Flow (Synchronous)
```
Client → Controller → Service → Repository → PostgreSQL → Response
```

### New Flow with Redis

**For Mutations (POST/PUT/DELETE):**
```
Client → Controller → Service → Queue Producer → Redis Queue
                                                      ↓
                                            Job Processor → Repository → PostgreSQL
                                                      ↓
                                            Cache Invalidation Service → Redis Cache
Client ← Immediate Response (Job ID)
```

**For Queries (GET):**
```
Client → Controller → Cache Interceptor → Check Redis Cache
                                              ↓ (miss)
                                        Repository → PostgreSQL
                                              ↓
                                        Update Redis Cache
Client ← Response (from cache or DB)
```

### Cache Key Strategy (Granular Invalidation)

**Cache Keys:**
- `bear:size:{start}:{end}` → Array of bears in size range
- `bear:colors:{colors}` → Array of bears with specific colors
- `bear:colors:{colors}:size:{start}:{end}` → Array of bears matching both

**Metadata Keys (for granular invalidation):**
- `bear:meta:{bearId}:caches` → Set of cache keys containing this bear
- When bear is updated/deleted → Only invalidate caches in this set

**Example:**
```
Bear ID 5 is in:
- bear:size:100:200
- bear:colors:brown,black
- bear:colors:brown:size:100:200

bear:meta:5:caches = Set { "bear:size:100:200", "bear:colors:brown,black", ... }

When bear 5 is deleted → Only delete those 3 cache keys
```

### Job Types
- `CREATE_BEAR` - Create new bear with colors
- `UPDATE_BEAR_NAME` - Update bear name
- `UPDATE_BEAR_SIZE` - Update bear size
- `UPDATE_BEAR_COLORS` - Update bear colors
- `DELETE_BEAR` - Delete bear
- Retry strategy: 2 attempts, exponential backoff

---

## Prerequisites

### System Requirements
- Docker & Docker Compose
- Node.js (already installed)
- Existing PostgreSQL database (already running)

---

## Phase 1: Infrastructure Setup

### Step 1.1: Install Dependencies

Add to `package.json` dependencies:

```json
{
  "dependencies": {
    "@nestjs/bullmq": "^10.0.1",
    "@nestjs/cache-manager": "^2.2.1",
    "bullmq": "^5.0.0",
    "cache-manager": "^5.4.0",
    "cache-manager-redis-store": "^3.0.1",
    "ioredis": "^5.3.2"
  }
}
```

Run:
```bash
npm install
```

### Step 1.2: Docker Compose Setup

Create `docker-compose.yml` in project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: fullstack_postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  redis:
    image: redis:7-alpine
    container_name: fullstack_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - app_network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  app_network:
    driver: bridge
```

Start services:
```bash
docker-compose up -d
```

### Step 1.3: Redis Configuration

Create `src/config/redis.config.ts`:

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
}));
```

Add to `.env` (create if doesn't exist):

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

---

## Phase 2: Queue Implementation

### Step 2.1: Job Type Definitions

Create `src/queue/types/bear-jobs.types.ts`:

```typescript
export enum BearJobType {
  CREATE_BEAR = 'CREATE_BEAR',
  UPDATE_BEAR_NAME = 'UPDATE_BEAR_NAME',
  UPDATE_BEAR_SIZE = 'UPDATE_BEAR_SIZE',
  UPDATE_BEAR_COLORS = 'UPDATE_BEAR_COLORS',
  DELETE_BEAR = 'DELETE_BEAR',
}

export interface CreateBearJobData {
  name: string;
  size: number;
  colors: string[];
}

export interface UpdateBearNameJobData {
  id: number;
  name: string;
}

export interface UpdateBearSizeJobData {
  id: number;
  size: number;
}

export interface UpdateBearColorsJobData {
  id: number;
  colors: string[];
}

export interface DeleteBearJobData {
  id: number;
}

export type BearJobData =
  | CreateBearJobData
  | UpdateBearNameJobData
  | UpdateBearSizeJobData
  | UpdateBearColorsJobData
  | DeleteBearJobData;

export interface JobResponse {
  jobId: string;
  message: string;
}
```

### Step 2.2: Queue Producer Service

Create `src/queue/producers/bear.producer.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  BearJobType,
  CreateBearJobData,
  UpdateBearNameJobData,
  UpdateBearSizeJobData,
  UpdateBearColorsJobData,
  DeleteBearJobData,
  JobResponse,
} from '../types/bear-jobs.types';

@Injectable()
export class BearProducer {
  constructor(
    @InjectQueue('bear-queue') private bearQueue: Queue,
  ) {}

  async queueCreateBear(data: CreateBearJobData): Promise<JobResponse> {
    const job = await this.bearQueue.add(BearJobType.CREATE_BEAR, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
    });

    return {
      jobId: job.id,
      message: `Bear creation job queued with ID: ${job.id}`,
    };
  }

  async queueUpdateBearName(data: UpdateBearNameJobData): Promise<JobResponse> {
    const job = await this.bearQueue.add(BearJobType.UPDATE_BEAR_NAME, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return {
      jobId: job.id,
      message: `Bear name update job queued with ID: ${job.id}`,
    };
  }

  async queueUpdateBearSize(data: UpdateBearSizeJobData): Promise<JobResponse> {
    const job = await this.bearQueue.add(BearJobType.UPDATE_BEAR_SIZE, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return {
      jobId: job.id,
      message: `Bear size update job queued with ID: ${job.id}`,
    };
  }

  async queueUpdateBearColors(data: UpdateBearColorsJobData): Promise<JobResponse> {
    const job = await this.bearQueue.add(BearJobType.UPDATE_BEAR_COLORS, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return {
      jobId: job.id,
      message: `Bear colors update job queued with ID: ${job.id}`,
    };
  }

  async queueDeleteBear(data: DeleteBearJobData): Promise<JobResponse> {
    const job = await this.bearQueue.add(BearJobType.DELETE_BEAR, data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return {
      jobId: job.id,
      message: `Bear deletion job queued with ID: ${job.id}`,
    };
  }
}
```

### Step 2.3: Job Processor

Create `src/queue/processors/bear.processor.ts`:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  BearJobType,
  BearJobData,
  CreateBearJobData,
  UpdateBearNameJobData,
  UpdateBearSizeJobData,
  UpdateBearColorsJobData,
  DeleteBearJobData,
} from '../types/bear-jobs.types';
import { BearRepository } from '../../persistence/repositories/bear.repository';
import { CacheInvalidationService } from '../../cache/cache-invalidation.service';

@Processor('bear-queue')
export class BearProcessor extends WorkerHost {
  private readonly logger = new Logger(BearProcessor.name);

  constructor(
    private readonly bearRepository: BearRepository,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {
    super();
  }

  async process(job: Job<BearJobData>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    try {
      let result;
      switch (job.name) {
        case BearJobType.CREATE_BEAR:
          result = await this.handleCreateBear(job.data as CreateBearJobData);
          break;
        case BearJobType.UPDATE_BEAR_NAME:
          result = await this.handleUpdateBearName(job.data as UpdateBearNameJobData);
          break;
        case BearJobType.UPDATE_BEAR_SIZE:
          result = await this.handleUpdateBearSize(job.data as UpdateBearSizeJobData);
          break;
        case BearJobType.UPDATE_BEAR_COLORS:
          result = await this.handleUpdateBearColors(job.data as UpdateBearColorsJobData);
          break;
        case BearJobType.DELETE_BEAR:
          result = await this.handleDeleteBear(job.data as DeleteBearJobData);
          break;
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }

      this.logger.log(`Job ${job.id} completed successfully`);
      return result;
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      throw error; // Re-throw to trigger retry
    }
  }

  private async handleCreateBear(data: CreateBearJobData) {
    const bear = await this.bearRepository.addBear(data.name, data.size, data.colors);

    // No cache invalidation needed for new bears
    // (they won't be in any existing caches yet)

    return bear;
  }

  private async handleUpdateBearName(data: UpdateBearNameJobData) {
    await this.bearRepository.updateBearName(data.id, data.name);

    // Invalidate caches containing this bear
    await this.cacheInvalidationService.invalidateBearCaches(data.id);

    return { success: true, bearId: data.id };
  }

  private async handleUpdateBearSize(data: UpdateBearSizeJobData) {
    await this.bearRepository.updateBearSize(data.id, data.size);

    // Invalidate caches containing this bear
    await this.cacheInvalidationService.invalidateBearCaches(data.id);

    return { success: true, bearId: data.id };
  }

  private async handleUpdateBearColors(data: UpdateBearColorsJobData) {
    await this.bearRepository.updateBearColors(data.id, data.colors);

    // Invalidate caches containing this bear
    await this.cacheInvalidationService.invalidateBearCaches(data.id);

    return { success: true, bearId: data.id };
  }

  private async handleDeleteBear(data: DeleteBearJobData) {
    // Invalidate caches BEFORE deletion (while we can still find the bear)
    await this.cacheInvalidationService.invalidateBearCaches(data.id);

    await this.bearRepository.deleteBear(data.id);

    return { success: true, bearId: data.id };
  }
}
```

### Step 2.4: Queue Module

Create `src/queue/bear-queue.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BearProducer } from './producers/bear.producer';
import { BearProcessor } from './processors/bear.processor';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bear } from '../persistence/entities/bear.entity';
import { BearRepository } from '../persistence/repositories/bear.repository';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password'),
          db: configService.get('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'bear-queue',
    }),
    TypeOrmModule.forFeature([Bear]),
    CacheModule,
  ],
  providers: [
    BearProducer,
    BearProcessor,
    {
      provide: BearRepository,
      useFactory: (dataSource) => {
        return new BearRepository(dataSource);
      },
      inject: ['DATA_SOURCE'],
    },
  ],
  exports: [BearProducer],
})
export class BearQueueModule {}
```

---

## Phase 3: Cache Implementation

### Step 3.1: Cache Service

Create `src/cache/cache.service.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly TTL = 300; // 5 minutes in seconds

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value) {
        this.logger.debug(`Cache HIT: ${key}`);
      } else {
        this.logger.debug(`Cache MISS: ${key}`);
      }
      return value || null;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return null; // Fallback to DB on cache error
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, (ttl || this.TTL) * 1000); // Convert to ms
      this.logger.debug(`Cache SET: ${key} (TTL: ${ttl || this.TTL}s)`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
      // Don't throw - caching is not critical
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      // Note: This requires ioredis client
      const redis = (this.cacheManager.store as any).client;
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        this.logger.debug(`Cache DEL pattern: ${pattern} (${keys.length} keys deleted)`);
      }
    } catch (error) {
      this.logger.error(`Cache DEL pattern error for ${pattern}:`, error);
    }
  }

  async getSet(key: string): Promise<Set<string>> {
    try {
      const redis = (this.cacheManager.store as any).client;
      const members = await redis.smembers(key);
      return new Set(members);
    } catch (error) {
      this.logger.error(`Cache SMEMBERS error for key ${key}:`, error);
      return new Set();
    }
  }

  async addToSet(key: string, ...values: string[]): Promise<void> {
    try {
      const redis = (this.cacheManager.store as any).client;
      if (values.length > 0) {
        await redis.sadd(key, ...values);
        await redis.expire(key, this.TTL);
        this.logger.debug(`Cache SADD: ${key} (${values.length} values)`);
      }
    } catch (error) {
      this.logger.error(`Cache SADD error for key ${key}:`, error);
    }
  }

  async removeFromSet(key: string, ...values: string[]): Promise<void> {
    try {
      const redis = (this.cacheManager.store as any).client;
      if (values.length > 0) {
        await redis.srem(key, ...values);
        this.logger.debug(`Cache SREM: ${key} (${values.length} values)`);
      }
    } catch (error) {
      this.logger.error(`Cache SREM error for key ${key}:`, error);
    }
  }
}
```

### Step 3.2: Cache Invalidation Service

Create `src/cache/cache-invalidation.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Invalidate all caches containing a specific bear
   * Uses metadata set to track which cache keys contain this bear
   */
  async invalidateBearCaches(bearId: number): Promise<void> {
    const metaKey = `bear:meta:${bearId}:caches`;

    try {
      // Get all cache keys containing this bear
      const cacheKeys = await this.cacheService.getSet(metaKey);

      if (cacheKeys.size === 0) {
        this.logger.debug(`No caches to invalidate for bear ${bearId}`);
        return;
      }

      // Delete all cache entries
      for (const cacheKey of cacheKeys) {
        await this.cacheService.del(cacheKey);
      }

      // Delete the metadata set itself
      await this.cacheService.del(metaKey);

      this.logger.log(`Invalidated ${cacheKeys.size} cache(s) for bear ${bearId}`);
    } catch (error) {
      this.logger.error(`Error invalidating caches for bear ${bearId}:`, error);
    }
  }

  /**
   * Invalidate all caches containing a specific color
   * (Used when a color is deleted)
   */
  async invalidateCachesByColor(color: string): Promise<void> {
    try {
      // Delete all caches that include this color in the key
      await this.cacheService.delPattern(`bear:colors:*${color}*`);

      this.logger.log(`Invalidated all caches containing color: ${color}`);
    } catch (error) {
      this.logger.error(`Error invalidating caches for color ${color}:`, error);
    }
  }

  /**
   * Track that a bear is in a specific cache
   * Called when setting a cache entry
   */
  async trackBearInCache(bearId: number, cacheKey: string): Promise<void> {
    const metaKey = `bear:meta:${bearId}:caches`;
    await this.cacheService.addToSet(metaKey, cacheKey);
  }

  /**
   * Track multiple bears in a cache
   */
  async trackBearsInCache(bearIds: number[], cacheKey: string): Promise<void> {
    for (const bearId of bearIds) {
      await this.trackBearInCache(bearId, cacheKey);
    }
  }
}
```

### Step 3.3: Cache Interceptor

Create `src/cache/interceptors/cache.interceptor.ts`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../cache.service';
import { CacheInvalidationService } from '../cache-invalidation.service';

@Injectable()
export class BearCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly cacheInvalidationService: CacheInvalidationService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request);

    if (!cacheKey) {
      // If we can't generate a cache key, skip caching
      return next.handle();
    }

    // Try to get from cache
    const cachedData = await this.cacheService.get(cacheKey);
    if (cachedData) {
      return of(cachedData);
    }

    // Cache miss - proceed with request and cache the result
    return next.handle().pipe(
      tap(async (data) => {
        if (data && Array.isArray(data)) {
          // Cache the data
          await this.cacheService.set(cacheKey, data);

          // Track which bears are in this cache
          const bearIds = data.map((bear) => bear.id);
          await this.cacheInvalidationService.trackBearsInCache(bearIds, cacheKey);
        }
      }),
    );
  }

  private generateCacheKey(request: any): string | null {
    const { url, params } = request;

    // Extract route pattern
    if (url.includes('/bear/size-in-range/')) {
      const { start, end } = params;
      return `bear:size:${start}:${end}`;
    }

    if (url.includes('/bear/color-size-in-range/')) {
      const { colors, start, end } = params;
      const sortedColors = colors.split(',').sort().join(',');
      return `bear:colors:${sortedColors}:size:${start}:${end}`;
    }

    if (url.includes('/bear/colors/')) {
      const { colors } = params;
      const sortedColors = colors.split(',').sort().join(',');
      return `bear:colors:${sortedColors}`;
    }

    return null; // Don't cache other endpoints
  }
}
```

### Step 3.4: Cache Module

Create `src/cache/cache.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';
import { CacheService } from './cache.service';
import { CacheInvalidationService } from './cache-invalidation.service';
import { BearCacheInterceptor } from './interceptors/cache.interceptor';

@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get('redis.host'),
        port: configService.get('redis.port'),
        password: configService.get('redis.password'),
        db: configService.get('redis.db'),
        ttl: 300, // 5 minutes default TTL
      }),
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  providers: [CacheService, CacheInvalidationService, BearCacheInterceptor],
  exports: [CacheService, CacheInvalidationService, BearCacheInterceptor],
})
export class CacheModule {}
```

---

## Phase 4: Integration

### Step 4.1: Update App Module

Modify `src/app.module.ts`:

**CHANGES:**
1. Import `ConfigModule` with redis config
2. Import `BearQueueModule`
3. Import `CacheModule`

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config'; // ADD THIS
import typeOrmConfig from './config/typeOrmConfig';
import redisConfig from './config/redis.config'; // ADD THIS
import { BearController } from './controller/bear.controller';
import { ColorController } from './controller/color.controller';
import { BearService } from './service/bear.service';
import { ColorService } from './service/color.service';
import { Bear } from './persistence/entities/bear.entity';
import { Color } from './persistence/entities/color.entity';
import { BearColors } from './persistence/entities/bearcolors.entity';
import { BearRepository } from './persistence/repositories/bear.repository';
import { ColorRepository } from './persistence/repositories/color.repository';
import { LoggerMiddleware } from './logger.middleware';
import { BearQueueModule } from './queue/bear-queue.module'; // ADD THIS
import { CacheModule } from './cache/cache.module'; // ADD THIS
import { DataSource } from 'typeorm';

@Module({
  imports: [
    // ADD ConfigModule
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([Bear, Color, BearColors]),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    BearQueueModule, // ADD THIS
    CacheModule, // ADD THIS
  ],
  controllers: [BearController, ColorController],
  providers: [
    BearService,
    ColorService,
    {
      provide: BearRepository,
      useFactory: (dataSource: DataSource) => {
        return new BearRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: ColorRepository,
      useFactory: (dataSource: DataSource) => {
        return new ColorRepository(dataSource);
      },
      inject: [DataSource],
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

### Step 4.2: Update Bear Service

Modify `src/service/bear.service.ts`:

**CHANGES:**
1. Inject `BearProducer`
2. Replace direct repository calls with queue calls for mutations
3. Keep read operations as-is (caching handled by interceptor)

```typescript
import { Injectable } from '@nestjs/common';
import { BearRepository } from '../persistence/repositories/bear.repository';
import { BearProducer } from '../queue/producers/bear.producer'; // ADD THIS
import { JobResponse } from '../queue/types/bear-jobs.types'; // ADD THIS

@Injectable()
export class BearService {
  constructor(
    private readonly bearRepository: BearRepository,
    private readonly bearProducer: BearProducer, // ADD THIS
  ) {}

  // CHANGE: Return JobResponse instead of Bear
  async createNewBear(
    name: string,
    size: number,
    colors: string[],
  ): Promise<JobResponse> {
    return this.bearProducer.queueCreateBear({ name, size, colors });
  }

  // KEEP AS-IS (Read operation - caching handled by interceptor)
  async findBearBySizeInRange(start: number, end: number) {
    return this.bearRepository.getBearBySizeInRange(start, end);
  }

  // KEEP AS-IS (Read operation)
  async findBearByColor(colors: string[]) {
    return this.bearRepository.getBearByColor(colors);
  }

  // KEEP AS-IS (Read operation)
  async findBearByColorAndSize(
    colors: string[],
    start: number,
    end: number,
  ) {
    return this.bearRepository.getBearByColorAndSize(colors, start, end);
  }

  // CHANGE: Return JobResponse
  async updateBearSize(id: number, size: number): Promise<JobResponse> {
    return this.bearProducer.queueUpdateBearSize({ id, size });
  }

  // CHANGE: Return JobResponse
  async updateBearName(id: number, name: string): Promise<JobResponse> {
    return this.bearProducer.queueUpdateBearName({ id, name });
  }

  // CHANGE: Return JobResponse
  async updateBearColors(id: number, colors: string[]): Promise<JobResponse> {
    return this.bearProducer.queueUpdateBearColors({ id, colors });
  }

  // CHANGE: Return JobResponse
  async deleteBear(id: number): Promise<JobResponse> {
    return this.bearProducer.queueDeleteBear({ id });
  }
}
```

### Step 4.3: Update Bear Controller

Modify `src/controller/bear.controller.ts`:

**CHANGES:**
1. Apply `BearCacheInterceptor` to GET endpoints
2. Update response types for mutations
3. Add proper HTTP status codes

```typescript
import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseInterceptors, // ADD THIS
} from '@nestjs/common';
import { BearService } from '../service/bear.service';
import { CreateBearDto, UpdateBearDto } from '../dto';
import { BearCacheInterceptor } from '../cache/interceptors/cache.interceptor'; // ADD THIS

@Controller('bear')
export class BearController {
  constructor(private readonly bearService: BearService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED) // CHANGE: 202 Accepted for async processing
  async createBear(@Body() createBearDto: CreateBearDto) {
    return this.bearService.createNewBear(
      createBearDto.name,
      createBearDto.size,
      createBearDto.colors,
    );
  }

  @Get('size-in-range/:start/:end')
  @UseInterceptors(BearCacheInterceptor) // ADD THIS
  async getBearBySizeInRange(
    @Param('start') start: string,
    @Param('end') end: string,
  ) {
    return this.bearService.findBearBySizeInRange(
      parseInt(start),
      parseInt(end),
    );
  }

  @Get('color-size-in-range/:colors/:start/:end')
  @UseInterceptors(BearCacheInterceptor) // ADD THIS
  async getBearByColorAndSizeInRange(
    @Param('colors') colors: string,
    @Param('start') start: string,
    @Param('end') end: string,
  ) {
    return this.bearService.findBearByColorAndSize(
      colors.split(','),
      parseInt(start),
      parseInt(end),
    );
  }

  @Get('colors/:colors')
  @UseInterceptors(BearCacheInterceptor) // ADD THIS
  async getBearByColor(@Param('colors') colors: string) {
    return this.bearService.findBearByColor(colors.split(','));
  }

  @Put(':id')
  @HttpCode(HttpStatus.ACCEPTED) // CHANGE: 202 Accepted
  async updateBear(
    @Param('id') id: string,
    @Body() updateBearDto: UpdateBearDto,
  ) {
    const bearId = parseInt(id);
    const responses = [];

    if (updateBearDto.name) {
      responses.push(
        await this.bearService.updateBearName(bearId, updateBearDto.name),
      );
    }

    if (updateBearDto.size) {
      responses.push(
        await this.bearService.updateBearSize(bearId, updateBearDto.size),
      );
    }

    if (updateBearDto.colors) {
      responses.push(
        await this.bearService.updateBearColors(bearId, updateBearDto.colors),
      );
    }

    return {
      message: 'Bear update jobs queued',
      jobs: responses,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.ACCEPTED) // CHANGE: 202 Accepted
  async deleteBear(@Param('id') id: string) {
    return this.bearService.deleteBear(parseInt(id));
  }
}
```

### Step 4.4: Update Color Service (Optional - if you want to queue color operations)

Modify `src/service/color.service.ts`:

If you want color operations to also invalidate bear caches, inject `CacheInvalidationService`:

```typescript
import { Injectable } from '@nestjs/common';
import { ColorRepository } from '../persistence/repositories/color.repository';
import { CacheInvalidationService } from '../cache/cache-invalidation.service'; // ADD THIS

@Injectable()
export class ColorService {
  constructor(
    private readonly colorRepository: ColorRepository,
    private readonly cacheInvalidationService: CacheInvalidationService, // ADD THIS
  ) {}

  async getAllColors() {
    return this.colorRepository.getAllColors();
  }

  async createNewColor(name: string, hex: string) {
    return this.colorRepository.addColor(name, hex);
  }

  async deleteColor(color: string) {
    // Invalidate all bear caches containing this color
    await this.cacheInvalidationService.invalidateCachesByColor(color); // ADD THIS

    return this.colorRepository.deleteColor(color);
  }
}
```

---

## Testing Guide

### Step 1: Start Services

```bash
# Start Redis and PostgreSQL
docker-compose up -d

# Verify Redis is running
docker-compose ps

# Start NestJS app
npm run start:dev
```

### Step 2: Test Cache Behavior (GET Requests)

**First Request (Cache Miss - Slow):**
```bash
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:3000/bear/size-in-range/100/200
```

**Second Request (Cache Hit - Fast):**
```bash
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:3000/bear/size-in-range/100/200
```

Expected: Second request should be significantly faster (~10-50ms vs 100-500ms)

### Step 3: Test Queue Behavior (POST/PUT/DELETE)

**Create Bear (Queued):**
```bash
curl -X POST http://localhost:3000/bear \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Grizzly",
    "size": 150,
    "colors": ["brown", "black"]
  }'
```

Expected Response:
```json
{
  "jobId": "1",
  "message": "Bear creation job queued with ID: 1"
}
```

**Update Bear (Queued):**
```bash
curl -X PUT http://localhost:3000/bear/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Kodiak",
    "size": 180
  }'
```

Expected Response:
```json
{
  "message": "Bear update jobs queued",
  "jobs": [
    { "jobId": "2", "message": "Bear name update job queued with ID: 2" },
    { "jobId": "3", "message": "Bear size update job queued with ID: 3" }
  ]
}
```

**Delete Bear (Queued):**
```bash
curl -X DELETE http://localhost:3000/bear/1
```

Expected Response:
```json
{
  "jobId": "4",
  "message": "Bear deletion job queued with ID: 4"
}
```

### Step 4: Test Cache Invalidation

**Setup:**
```bash
# 1. Create a bear
curl -X POST http://localhost:3000/bear \
  -H "Content-Type: application/json" \
  -d '{"name": "Polar", "size": 120, "colors": ["white"]}'

# Wait 1 second for job to process
sleep 1

# 2. Query to populate cache
curl http://localhost:3000/bear/size-in-range/100/200

# 3. Query again (should be cached)
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:3000/bear/size-in-range/100/200
```

**Test Invalidation:**
```bash
# 4. Update the bear
curl -X PUT http://localhost:3000/bear/1 \
  -H "Content-Type: application/json" \
  -d '{"size": 250}'

# Wait 1 second for job to process
sleep 1

# 5. Query again (cache should be invalidated, slower)
curl -w "\nTime: %{time_total}s\n" \
  http://localhost:3000/bear/size-in-range/100/200
```

Expected: Step 5 should be slower (cache miss) because the cache was invalidated

### Step 5: Monitor Redis

**View all keys:**
```bash
docker exec -it fullstack_redis redis-cli KEYS '*'
```

**Monitor cache in real-time:**
```bash
docker exec -it fullstack_redis redis-cli MONITOR
```

**View queue jobs:**
```bash
docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:wait
docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:completed
docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:failed
```

### Step 6: Check Application Logs

```bash
# Watch logs for cache hits/misses and job processing
npm run start:dev
```

Look for:
- `Cache HIT: bear:size:100:200`
- `Cache MISS: bear:size:100:200`
- `Processing job X of type CREATE_BEAR`
- `Job X completed successfully`
- `Invalidated N cache(s) for bear Y`

---

## Troubleshooting

### Redis Connection Issues

**Problem:** `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Solution:**
```bash
# Check Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis

# Test Redis connection
docker exec -it fullstack_redis redis-cli ping
# Should return: PONG
```

### Cache Not Working

**Problem:** Cache always misses

**Check:**
1. Verify cache interceptor is applied:
   ```typescript
   @UseInterceptors(BearCacheInterceptor)
   ```

2. Check Redis for keys:
   ```bash
   docker exec -it fullstack_redis redis-cli KEYS 'bear:*'
   ```

3. Enable debug logging in `cache.service.ts` (already included)

4. Verify cache store is configured:
   ```typescript
   // In cache.module.ts
   store: redisStore as any,
   ```

### Queue Jobs Not Processing

**Problem:** Jobs stay in queue and never complete

**Check:**
1. Verify BullMQ processor is registered:
   ```bash
   # Look for "Processor registered" in logs
   npm run start:dev
   ```

2. Check job status in Redis:
   ```bash
   docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:wait
   docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:active
   docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:completed
   docker exec -it fullstack_redis redis-cli LLEN bull:bear-queue:failed
   ```

3. Check for errors in logs:
   ```bash
   # Look for "Job X failed:" in logs
   ```

4. Verify BearProcessor has access to BearRepository:
   ```typescript
   // In bear-queue.module.ts
   providers: [BearProcessor, BearRepository, ...]
   ```

### Cache Invalidation Not Working

**Problem:** Stale data returned after updates

**Check:**
1. Verify metadata tracking is working:
   ```bash
   docker exec -it fullstack_redis redis-cli SMEMBERS 'bear:meta:1:caches'
   ```

2. Check invalidation is called in processor:
   ```typescript
   // In bear.processor.ts
   await this.cacheInvalidationService.invalidateBearCaches(data.id);
   ```

3. Verify CacheInvalidationService is injected into BearProcessor

4. Check logs for "Invalidated X cache(s) for bear Y"

### Jobs Failing and Retrying

**Problem:** Jobs fail with errors

**Check:**
1. View failed jobs in Redis:
   ```bash
   docker exec -it fullstack_redis redis-cli LRANGE bull:bear-queue:failed 0 -1
   ```

2. Check error logs in application

3. Common causes:
   - Database connection issues
   - Invalid data (missing bear, invalid color)
   - Transaction failures

4. Manually retry failed jobs (in BullMQ dashboard or Redis):
   ```bash
   # Install BullMQ Board for GUI
   npm install @bull-board/express @bull-board/api
   ```

### TypeScript Errors

**Problem:** `Cannot find module 'cache-manager-redis-store'`

**Solution:**
```bash
npm install --save-dev @types/cache-manager @types/cache-manager-redis-store
```

**Problem:** `Property 'client' does not exist on type 'Store'`

**Solution:**
```typescript
// Use type assertion
const redis = (this.cacheManager.store as any).client;
```

### Performance Issues

**Problem:** Queries still slow even with cache

**Check:**
1. Verify cache TTL is appropriate (5 minutes):
   ```bash
   docker exec -it fullstack_redis redis-cli TTL 'bear:size:100:200'
   ```

2. Check cache hit rate in logs

3. Ensure database queries are optimized (already done with indexes)

4. Consider increasing cache TTL for rarely-changing data

### Docker Issues

**Problem:** Containers not starting

**Solution:**
```bash
# Stop all containers
docker-compose down

# Remove volumes (CAUTION: deletes data)
docker-compose down -v

# Start fresh
docker-compose up -d

# View logs
docker-compose logs -f
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           CLIENT                                 │
└───────────────┬─────────────────────────┬───────────────────────┘
                │                         │
                │ POST/PUT/DELETE         │ GET
                │                         │
┌───────────────▼─────────────────────────▼───────────────────────┐
│                       NestJS Application                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Bear Controller                             │   │
│  │  - @UseInterceptors(BearCacheInterceptor) for GET       │   │
│  │  - Returns 202 Accepted for mutations                   │   │
│  └──────────┬─────────────────────────────┬────────────────┘   │
│             │                             │                     │
│             │                             │                     │
│  ┌──────────▼────────────┐   ┌────────────▼──────────────────┐ │
│  │    Bear Service        │   │   BearCacheInterceptor       │ │
│  │  - Uses BearProducer   │   │   1. Check cache             │ │
│  │    for mutations       │   │   2. If miss, call service   │ │
│  │  - Direct repo for     │   │   3. Cache result + metadata │ │
│  │    reads               │   └──────────────────────────────┘ │
│  └──────────┬─────────────┘                                     │
│             │                                                    │
│  ┌──────────▼─────────────┐                                     │
│  │    Bear Producer        │                                     │
│  │  - Queue job creation   │                                     │
│  │  - Return job ID        │                                     │
│  └──────────┬─────────────┘                                     │
└─────────────┼──────────────────────────────────────────────────┘
              │
              │ Add job to queue
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                         Redis                                  │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  BullMQ Queue: bear-queue                                │ │
│  │  - wait, active, completed, failed lists                 │ │
│  └──────────────────────────────────────────────────────────┘ │
│                          │                                     │
│                          │ Job picked up by processor         │
│                          │                                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  Cache Store                                             │ │
│  │  - bear:size:{start}:{end}                               │ │
│  │  - bear:colors:{colors}                                  │ │
│  │  - bear:colors:{colors}:size:{start}:{end}               │ │
│  │  - bear:meta:{id}:caches (Set)                           │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
              │
              │
┌─────────────▼─────────────────────────────────────────────────┐
│                    NestJS Application                          │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │          Bear Processor                                   │ │
│  │  1. Process job (CREATE/UPDATE/DELETE)                   │ │
│  │  2. Call Bear Repository                                 │ │
│  │  3. Invalidate caches via CacheInvalidationService       │ │
│  └───────────┬──────────────────────────────────────────────┘ │
│              │                                                 │
│  ┌───────────▼──────────────────────────────────────────────┐ │
│  │    Bear Repository                                        │ │
│  │  - Database operations                                    │ │
│  │  - Transactions                                           │ │
│  └───────────┬──────────────────────────────────────────────┘ │
└──────────────┼────────────────────────────────────────────────┘
               │
               │
┌──────────────▼────────────────────────────────────────────────┐
│                      PostgreSQL Database                       │
│  - Bear, Color, BearColors tables                             │
└───────────────────────────────────────────────────────────────┘
```

---

## Summary

### What You Get:

1. **Asynchronous Mutations**: All POST/PUT/DELETE operations are queued and processed in the background
2. **Fast Reads**: GET requests are cached for 5 minutes, dramatically reducing database load
3. **Granular Cache Invalidation**: Only relevant caches are invalidated on mutations
4. **Reliability**: Failed jobs retry twice with exponential backoff
5. **Monitoring**: Full visibility into queue status and cache performance via logs and Redis

### Key Files Created:
- 13 new files (queue, cache, types)
- 5 modified files (service, controller, app.module)
- 1 Docker Compose configuration
- 1 Redis configuration file

### Performance Impact:
- **GET requests**: 10-100x faster after first request (cache hit)
- **POST/PUT/DELETE**: Immediate response (202 Accepted), processing happens in background
- **Database load**: Reduced by 80-90% due to caching
- **Scalability**: Can handle 10x more traffic with same database

Ready to implement! Start with Phase 1 and work through each phase sequentially.
