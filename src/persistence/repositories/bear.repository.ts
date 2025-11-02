import { Between, DataSource, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Bear } from "../entities/bear.entity";
import { Color } from "../entities/color.entity";
import { BearColors } from "../entities/bearcolors.entity";

@Injectable()
export class BearRepository extends Repository<Bear> {
  constructor(readonly dataSource: DataSource) {
    super(Bear, dataSource.createEntityManager());
  }

  async findBearBySizeInRange(start: number, end: number): Promise<Bear[]> {
    return this.find({
      where: {
        size: Between(start, end),
      },
    });
  }

  async updateBearSize(bearId: number, newSize: number): Promise<boolean> {
    const result = await this.update({ id: bearId }, { size: newSize });
    return (result.affected ?? 0) > 0;
  }

  async addColorToBear(bearId: number, colorId: number): Promise<boolean> {
    const manager = this.manager;

    const bear = await manager.findOne(Bear, { where: { id: bearId } });
    if (!bear) {
      throw new Error("Bear not found");
    }

    const color = await manager.findOne(Color, { where: { id: colorId } });
    if (!color) {
      throw new Error("Color not found !");
    }

    const existing = await manager.findOne(BearColors, {
      where: { bear_id: bearId, color_id: colorId },
    });

    if (existing) {
      return false;
    }

    const link = manager.create(BearColors, {
      bear_id: bearId,
      color_id: colorId,
      bear,
      color,
    });

    await manager.save(link);

    return true;
  }

  async removeBearColor(bear_id: number, color_id: number): Promise<boolean> {
    const manager = this.manager;

    const result = await manager.delete(BearColors, {
      where: { bear_id: bear_id, color_id: color_id },
    });

    const colorExistsForBear = result.affected ?? 0;

    return colorExistsForBear > 0;
  }

  async getBearsWithColors(): Promise<Bear[]> {
    return this.createQueryBuilder("bear")
      .leftJoinAndSelect("bear.bearColors", "bc")
      .leftJoinAndSelect("bc.color", "color")
      .getMany();
  }

  async findBearByColors(colorList: number[]): Promise<Bear[]> {
    if (!colorList || colorList.length === 0) {
      return this.getBearsWithColors();
    }

    return this.createQueryBuilder("bear")
      .innerJoin("bear.bearColors", "bc")
      .innerJoin("bc.color", "color")
      .where("color.id IN (:...colorList)", { colorList })
      .getMany();
  }
}

export const BearRepositoryProvider = {
  provide: BearRepository,
  useFactory: (dataSource: DataSource): BearRepository =>
    new BearRepository(dataSource),
  inject: [DataSource],
};
