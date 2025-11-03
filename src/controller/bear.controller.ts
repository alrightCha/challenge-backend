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
} from "@nestjs/common";
import { BearService } from "../service/bear.service";
import { Bear } from "../persistence/entities/bear.entity";

@Controller("bear")
export class BearController {
  constructor(private readonly bearService: BearService) {}

  @Post(":name/:size/:colors")
  async createNewBear(
    @Param("name") name: string,
    @Param("size", ParseIntPipe) size: number,
    @Param("colors", new ParseArrayPipe({ items: String, separator: "," }))
    colors: string[]
  ): Promise<boolean> {
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
  getBearsByColor(@Param("colors") colors: number[]): Promise<Bear[]> {
    return this.bearService.findBearByColor(colors);
  }

  @Put(":id/:name/:size")
  async putBear(
    @Param("id", ParseIntPipe) id: number,
    @Param("name") newName: string,
    @Param("size") newSize: number
  ) {
    const isNameUpdate = newName != "";
    const isSizeUpdate = newSize > 0;

    if (!isNameUpdate && isSizeUpdate) {
      throw new Error("Wrong parameters provided");
    }
    if (isNameUpdate) {
      await this.bearService.updateBearName(id, newName);
    }
    if (isSizeUpdate) {
      await this.bearService.updateBearSize(id, newSize);
    }
  }

  @Delete(":id")
  async deleteBear(@Param("id", ParseIntPipe) id: number) {
    const deletion = await this.bearService.deleteBear(id);
    return deletion;
  }
}
