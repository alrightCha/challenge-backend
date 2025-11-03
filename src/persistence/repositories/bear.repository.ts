import { Between, DataSource, In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Bear } from "../entities/bear.entity";
import { Color } from "../entities/color.entity";
import { BearColors } from "../entities/bearcolors.entity";

@Injectable()
export class BearRepository extends Repository<Bear> {
  constructor(readonly dataSource: DataSource) {
    super(Bear, dataSource.createEntityManager());
  }

  //Add bear
  async addBear(
    name: string,
    size: number,
    colors: string[]
  ): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const bear = await manager.save(Bear, { name, size });
      const bearId = bear.id;

      if (!colors || colors.length == 0) {
        return true;
      }

      const wantedNames = Array.from(
        new Set(
          colors.map((c) => c.trim().toLowerCase()).filter((c) => c.length > 0)
        )
      );

      if (wantedNames.length === 0) return true;

      const existingColors = await manager.find(Color, {
        where: { name: In(wantedNames) },
      });

      const existingByName = new Map(existingColors.map((c) => [c.name, c.id]));

      const missingNames = wantedNames.filter((n) => !existingByName.has(n));

      if (missingNames.length > 0) {
        await manager
          .createQueryBuilder()
          .insert()
          .into(Color)
          .values(missingNames.map((n) => ({ name: n })))
          .orIgnore()
          .execute();
      }

      const allColors = await manager.find(Color, {
        where: { name: In(wantedNames) },
      });

      const colorIds = allColors.map((c) => c.id);

      const linkRows = colorIds.map((colorId) => ({
        bear_id: bearId,
        color_id: colorId,
      }));

      await manager
        .createQueryBuilder()
        .insert()
        .into(BearColors)
        .values(linkRows)
        .orIgnore()
        .execute();

      return true;
    });
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

  async updateBearName(bearId: number, newName: string): Promise<boolean> {
    const result = await this.update({ id: bearId }, { name: newName });
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

  async findBearByColorsAndSizes(
    colorList: number[],
    start: number,
    end: number
  ): Promise<Bear[]> {
    if (!colorList || colorList.length === 0) {
      return this.findBearBySizeInRange(start, end);
    }

    return this.createQueryBuilder("bear")
      .innerJoin("bear.bearColors", "bc")
      .innerJoin("bc.color", "color")
      .where("color.id IN (:...colorList)", { colorList })
      .andWhere("size BETWEEN :start AND :end", { start, end })
      .distinct(true)
      .getMany();
  }

  //Will remove bear colors as well since we have delete cascade on bear_colors.bear_id
  async deleteBear(bearId: number): Promise<boolean> {
    const result = await this.manager.delete(Bear, { id: bearId });
    return (result.affected ?? 0) > 0;
  }
}

export const BearRepositoryProvider = {
  provide: BearRepository,
  useFactory: (dataSource: DataSource): BearRepository =>
    new BearRepository(dataSource),
  inject: [DataSource],
};
