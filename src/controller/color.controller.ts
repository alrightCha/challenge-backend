import { Controller, Delete, Get, Param, Post, Body } from "@nestjs/common";
import { ColorService } from "../service/color.service";
import { Color } from "../persistence/entities/color.entity";
import { CreateColorDto } from "../dto";

@Controller("color")
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Get("all")
  getColors(): Promise<Color[]> {
    return this.colorService.getColors();
  }

  @Post()
  async createColor(@Body() createColorDto: CreateColorDto): Promise<number> {
    const { name, hex } = createColorDto;
    const colorId = await this.colorService.createNewColor(name, hex);
    return colorId;
  }

  @Delete(":color")
  async deleteColor(@Param("color") color: string) {
    const deletion = await this.colorService.deleteColor(color);
    return deletion;
  }
}
