import { Injectable } from "@nestjs/common";
import { ColorRepository } from "../persistence/repositories/color.repository";
import { Color } from "../persistence/entities/color.entity";
import { JobType, LocalQueueService } from "../queue/local-queue.service";
import { MemoryCacheService } from "../cache/memory-cache.service";

@Injectable()
export class ColorService {
  constructor(
    private readonly queueService: LocalQueueService,
    private readonly cacheService: MemoryCacheService
  ) {}

  //TODO: CHeck return type
  // CREATE NEW COLOR
  async createNewColor(name: string, hex: string): Promise<boolean> {
    this.queueService.enqueue(JobType.ADD_COLOR, {
      name: name,
      hex: hex,
    });
    await this.queueService.waitForProcessing();
    return true;
  }

  // DELETE COLOR
  async deleteColor(colorName: string): Promise<boolean> {
    this.queueService.enqueue(JobType.DELETE_COLOR, {
      name: colorName,
    });
    await this.queueService.waitForProcessing();
    return true;
  }

  //GET ALL COLORS
  getColors(): Color[] {
    return this.cacheService.getAllColors();
  }
}
