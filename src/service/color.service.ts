import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ColorRepository } from "../persistence/repositories/color.repository";
import { Color } from "../persistence/entities/color.entity";

@Injectable()
export class ColorService {
  constructor(private readonly colorRepository: ColorRepository) {}

  // CREATE NEW COLOR 
  async createNewColor(
    name: string, 
    hex: string 
  ): Promise<number> {
    const result = await this.colorRepository.addColor(name, hex);
    return result;
  }

  // DELETE COLOR
  async deleteColor(colorName: string): Promise<boolean> {
    const isDeleted = await this.colorRepository.deleteColor(colorName);
    return isDeleted;
  }


  //GET ALL COLORS
  async getColors(): Promise<Color[]> {
    const colors = await this.colorRepository.getColors();
    return colors;
  }
}
