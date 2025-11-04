import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { LocalQueueService, JobType, QueueJob } from "./local-queue.service";
import { BearRepository } from "../persistence/repositories/bear.repository";
import { MemoryCacheService } from "../cache/memory-cache.service";
import { ColorRepository } from "../persistence/repositories/color.repository";

@Injectable()
export class QueueProcessorService {
  private readonly logger = new Logger(QueueProcessorService.name);
  private isProcessing = false;

  constructor(
    private readonly queueService: LocalQueueService,
    private readonly bearRepository: BearRepository,
    private readonly colorRepository: ColorRepository,
    private readonly cacheService: MemoryCacheService
  ) {}

  //Process queue every second
  @Cron(CronExpression.EVERY_SECOND)
  async processQueue() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return;
    }

    // Check if queue has jobs
    if (this.queueService.isEmpty()) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process one job at a time (FIFO)
      const job = this.queueService.dequeue();
      if (!job) {
        return;
      }

      await this.processJob(job);
    } catch (error) {
      this.logger.error(
        `Queue processing error: ${error.message}`,
        error.stack
      );
    } finally {
      this.isProcessing = false;
    }
  }

  private async processJob(job: QueueJob): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.log(`Processing job ${job.id} (${job.type})`);

      switch (job.type) {
        case JobType.CREATE_BEAR:
          await this.bearRepository.addBear(
            job.data.name,
            job.data.size,
            job.data.colors
          );
          break;

        case JobType.UPDATE_BEAR_NAME:
          await this.bearRepository.updateBearName(job.data.id, job.data.name);
          break;

        case JobType.UPDATE_BEAR_SIZE:
          await this.bearRepository.updateBearSize(job.data.id, job.data.size);
          break;

        case JobType.UPDATE_BEAR_COLORS:
          await this.bearRepository.updateBearColors(
            job.data.id,
            job.data.colors
          );
          break;

        case JobType.DELETE_BEAR:
          await this.bearRepository.deleteBear(job.data.id);
          break;

        case JobType.ADD_COLOR:
          await this.colorRepository.addColor(job.data.name, job.data.hex);
          break; 
        case JobType.DELETE_COLOR:
          await this.colorRepository.deleteColor(job.data.name);
          break; 
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Rebuild cache after successful mutation
      await this.cacheService.rebuildCache();

      const duration = Date.now() - startTime;
      this.logger.log(`Job ${job.id} completed in ${duration}ms`);
    } catch (error) {
      this.logger.error(`Job ${job.id} failed: ${error.message}`, error.stack);
      // In production, you might want to retry or move to dead-letter queue
    }
  }
}
