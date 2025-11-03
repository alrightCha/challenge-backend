import {
  BadRequestException,
  Controller,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  Put,
  ParseArrayPipe,
  Post,
  Body,
} from "@nestjs/common";
import { BearService } from "../service/bear.service";
import { Bear } from "../persistence/entities/bear.entity";
import { CreateBearDto, UpdateBearDto } from "../dto";

@Controller("bear")
export class BearController {
  constructor(private readonly bearService: BearService) {}

  @Post()
  async createNewBear(@Body() createBearDto: CreateBearDto): Promise<boolean> {
    const { name, size, colors = [] } = createBearDto;
    return this.bearService.createNewBear(name, colors, size);
  }

  @Get("size-in-range/:start/:end")
  getBearBySizeInRange(
    @Param("start") start: number,
    @Param("end") end: number
  ): Promise<Bear[]> {
    if (start > end) {
      throw new BadRequestException(`Start ${start} is larger than end ${end}`);
    }

    return this.bearService.findBearBySizeInRange(start, end);
  }

  @Get("color-size-in-range/:colors/:start/:end")
  getBearByColorsAndSizeInRange(
    @Param("colors", new ParseArrayPipe({ items: Number, separator: "," }))
    colors: number[],
    @Param("start") start: number,
    @Param("end") end: number
  ): Promise<Bear[]> {
    if (start > end) {
      throw new BadRequestException(`Start ${start} is larger than end ${end}`);
    }

    if (start < 0) {
      throw new BadRequestException(`Start ${start} cannot be negative`);
    }

    return this.bearService.findBearByColorAndSize(colors, start, end);
  }

  @Get("colors/:colors")
  getBearsByColor(
    @Param("colors", new ParseArrayPipe({ items: Number, separator: "," }))
    colors: number[]
  ): Promise<Bear[]> {
    return this.bearService.findBearByColor(colors);
  }

  @Put(":id")
  async updateBear(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateBearDto: UpdateBearDto
  ) {
    const { name, size, colors } = updateBearDto;

    if (!name && !size && !colors) {
      throw new BadRequestException("At least one field (name, size, or colors) must be provided for update");
    }

    if (name) {
      await this.bearService.updateBearName(id, name);
    }
    if (size) {
      await this.bearService.updateBearSize(id, size);
    }
    if (colors) {
      await this.bearService.updateBearColors(id, colors);
    }

    return { success: true, message: "Bear updated successfully" };
  }

  @Delete(":id")
  async deleteBear(@Param("id", ParseIntPipe) id: number) {
    const deletion = await this.bearService.deleteBear(id);
    return deletion;
  }
}
