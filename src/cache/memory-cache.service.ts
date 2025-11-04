import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { BearRepository } from "../persistence/repositories/bear.repository";
import { ColorRepository } from "../persistence/repositories/color.repository";
import { Bear } from "../persistence/entities/bear.entity";
import { Color } from "../persistence/entities/color.entity";

@Injectable()
export class MemoryCacheService implements OnModuleInit {
  private readonly logger = new Logger(MemoryCacheService.name);

  // Data structures
  private sortedBears: Bear[] = [];
  private bearMap: Map<number, Bear> = new Map();
  private colorIndex: Map<number, Set<number>> = new Map();
  private allColors: Color[] = [];

  constructor(
    private readonly bearRepository: BearRepository,
    private readonly colorRepository: ColorRepository
  ) {}

  async onModuleInit() {
    await this.rebuildCache();
    this.logger.log("Memory cache initialized");
  }

  async rebuildCache(): Promise<void> {
    const bears = await this.bearRepository.findBearBySizeInRange(0, 9999);
    this.sortedBears = bears.sort((a, b) => a.size - b.size);
    this.bearMap.clear();

    bears.forEach((bear) => {
      this.bearMap.set(bear.id, bear);
    });

    this.colorIndex.clear();

    bears.forEach((bear) => {
      if (bear.bearColors && bear.bearColors.length > 0) {
        bear.bearColors.forEach((bearColor) => {
          const colorId = bearColor.color_id;
          if (!this.colorIndex.has(colorId)) {
            this.colorIndex.set(colorId, new Set());
          }
          this.colorIndex.get(colorId)!.add(bear.id);
        });
      }
    });

    this.allColors = await this.colorRepository.getColors();
  }

  getBearBySizeInRange(start: number, end: number): Bear[] {
    const startIdx = this.binarySearchStart(start);
    const results: Bear[] = [];

    // Collect all bears in range
    for (let i = startIdx; i < this.sortedBears.length; i++) {
      const bear = this.sortedBears[i];
      if (bear.size > end) break;
      if (bear.size >= start) {
        results.push(bear);
      }
    }

    return results;
  }

  getBearsByColors(colorIds: number[]): Bear[] {
    if (colorIds.length === 0) {
      return this.sortedBears;
    }

    const bearIds = new Set<number>();
    colorIds.forEach((colorId) => {
      const bearsWithColor = this.colorIndex.get(colorId);
      if (bearsWithColor) {
        bearsWithColor.forEach((bearId) => bearIds.add(bearId));
      }
    });

    // Return bears
    return Array.from(bearIds)
      .map((id) => this.bearMap.get(id))
      .filter((bear) => bear !== undefined) as Bear[];
  }

  getBearsByColorsAndSize(
    colorIds: number[],
    start: number,
    end: number
  ): Bear[] {
    // First filter by colors
    let bears = this.getBearsByColors(colorIds);

    // Then filter by size range
    bears = bears.filter((bear) => bear.size >= start && bear.size <= end);

    return bears;
  }

  getAllColors(): Color[] {
    return this.allColors;
  }

  //bears are sorted. So find the start to make use of it and keep going until end in 
  //function using this 
  private binarySearchStart(target: number): number {
    let left = 0;
    let right = this.sortedBears.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (this.sortedBears[mid].size < target) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    return left;
  }

  getStats() {
    return {
      bears: this.sortedBears.length,
      colors: this.allColors.length,
      colorIndexSize: this.colorIndex.size,
    };
  }
}
