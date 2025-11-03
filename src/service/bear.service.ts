import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { BearRepository } from "../persistence/repositories/bear.repository";
import { Bear } from "../persistence/entities/bear.entity";

@Injectable()
export class BearService {
  constructor(private readonly bearRepository: BearRepository) {}

  // CREATE NEW BEAR
  async createNewBear(
    name: string,
    colors: string[],
    size: number
  ): Promise<boolean> {
    const result = await this.bearRepository.addBear(name, size, colors);
    return result;
  }

  // READ

  //Find bear by size
  async findBearBySizeInRange(start: number, end: number): Promise<Bear[]> {
    const bears = await this.bearRepository.findBearBySizeInRange(start, end);
    return bears;
  }

  //Find bear by color (or find all bears)
  async findBearByColor(colors: number[]): Promise<Bear[]> {
    const bears = await this.bearRepository.findBearByColors(colors);
    return bears;
  }

  //Find bear by color(s) and size
  async findBearByColorAndSize(
    colors: number[],
    start: number,
    end: number
  ): Promise<Bear[]> {
    const bears = await this.bearRepository.findBearByColorsAndSizes(
      colors,
      start,
      end
    );
    return bears;
  }

  //UPDATE

  //Update size for bear
  async updateBearSize(bearId: number, bearSize: number): Promise<boolean> {
    const isUpdated = await this.bearRepository.updateBearSize(
      bearId,
      bearSize
    );
    return isUpdated;
  }

  //Update name for bear
  async updateBearName(bearId: number, newName: string): Promise<boolean> {
    const isUpdated = await this.bearRepository.updateBearName(bearId, newName);
    return isUpdated;
  }

  //Update colors for bear

  //Add color
  async addBearColor(bearId: number, newColor: number): Promise<boolean> {
    const isUpdated = await this.bearRepository.addColorToBear(
      bearId,
      newColor
    );
    return isUpdated;
  }

  //Remove color for bear
  async deleteBearColor(bearId: number, color: number): Promise<boolean> {
    const isDeleted = await this.bearRepository.removeBearColor(bearId, color);
    return isDeleted;
  }

  //Replace all colors for bear
  async updateBearColors(bearId: number, colors: string[]): Promise<boolean> {
    const isUpdated = await this.bearRepository.updateBearColors(bearId, colors);
    return isUpdated;
  }

  //DELETE BEAR
  async deleteBear(bearId: number): Promise<boolean> {
    const isDeleted = await this.bearRepository.deleteBear(bearId);
    return isDeleted;
  }
}
