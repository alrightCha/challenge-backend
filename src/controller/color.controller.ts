import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from "@nestjs/common";
import { ColorService } from "../service/color.service";
import { Color } from "../persistence/entities/color.entity";

@Controller("color")
export class ColorController {
  constructor(private readonly colorService: ColorService) {}

  @Get("all")
  getColors(): Promise<Color[]> {
    return this.colorService.getColors();
  }

  @Post("create/:color")
  async createColor(@Param("color") color: string): Promise<number> {
    const colorId = await this.colorService.createNewColor(color);
    return colorId;
  }

  @Delete(":color")
  async deleteColor(@Param("color") color: string) {
    const deletion = await this.colorService.deleteColor(color);
    return deletion;
  }
}
