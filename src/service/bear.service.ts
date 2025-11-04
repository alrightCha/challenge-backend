import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { BearRepository } from "../persistence/repositories/bear.repository";
import { Bear } from "../persistence/entities/bear.entity";
import { JobType, LocalQueueService } from "../queue/local-queue.service";
import { MemoryCacheService } from "../cache/memory-cache.service";

@Injectable()
export class BearService {
  constructor(
    private readonly queueService: LocalQueueService,
    private readonly cacheService: MemoryCacheService
  ) {}

  // CREATE NEW BEAR
  async createNewBear(
    name: string,
    colors: string[],
    size: number
  ): Promise<boolean> {
    this.queueService.enqueue(JobType.CREATE_BEAR, { name, size, colors });
    await this.queueService.waitForProcessing();
    return true;
  }

  // READ

  //Find bear by size
  findBearBySizeInRange(start: number, end: number): Bear[] {
    const bears = this.cacheService.getBearBySizeInRange(start, end);
    return bears;
  }

  //Find bear by color (or find all bears)
  findBearByColor(colors: number[]): Bear[] {
    const bears = this.cacheService.getBearsByColors(colors);
    return bears;
  }

  //Find bear by color(s) and size
  findBearByColorAndSize(colors: number[], start: number, end: number): Bear[] {
    const bears = this.cacheService.getBearsByColorsAndSize(colors, start, end);
    return bears;
  }

  //UPDATE

  //Update size for bear
  async updateBearSize(bearId: number, bearSize: number): Promise<boolean> {
    this.queueService.enqueue(JobType.UPDATE_BEAR_SIZE, {
      id: bearId,
      size: bearSize,
    });
    await this.queueService.waitForProcessing();
    return true;
  }

  //Update name for bear
  async updateBearName(bearId: number, newName: string): Promise<boolean> {
    this.queueService.enqueue(JobType.UPDATE_BEAR_NAME, {
      id: bearId,
      name: newName,
    });
    await this.queueService.waitForProcessing();
    return true;
  }

  //Update colors for bear

  //Replace all colors for bear
  async updateBearColors(bearId: number, colors: string[]): Promise<boolean> {
    this.queueService.enqueue(JobType.UPDATE_BEAR_COLORS, {
      id: bearId,
      colors: colors,
    });
    await this.queueService.waitForProcessing();
    return true;
  }

  //DELETE BEAR
  async deleteBear(bearId: number): Promise<boolean> {
    this.queueService.enqueue(JobType.DELETE_BEAR, {
      id: bearId,
    });
    await this.queueService.waitForProcessing();
    return true;
  }
}
