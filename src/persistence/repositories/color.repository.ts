import { DataSource, In, Repository } from "typeorm";
import { Injectable } from "@nestjs/common";
import { Color } from "../entities/color.entity";
import { BearColors } from "../entities/bearcolors.entity";
import { Bear } from "../entities/bear.entity";

@Injectable()
export class ColorRepository extends Repository<Color> {
  constructor(readonly dataSource: DataSource) {
    super(Color, dataSource.createEntityManager());
  }

  //Inserts a color and returns its id if needed to be used
  async addColor(name: string): Promise<number> {
    const existing = await this.findOne({ where: { name } });
    if (existing) {
      return existing.id;
    }
    const result = await this.insert({ name });
    return result.identifiers[0].id as number;
  }

  //Get all colors and their respective ids
  async getColors(): Promise<Color[]> {
    const result = await this.find();
    return result;
  }

  //Delete a color & returns if deleted at least a row (true)
  async deleteColor(name: string): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      // find color id
      const correctName = name.trim().toLowerCase(); 
      const color = await manager.findOne(Color, { where: { name :correctName } });
      if (!color) {
        return false;
      }

      const colorId = color.id;

      const bearColors = await manager.find(BearColors, {
        where: { color_id: colorId },
      });

      const bearIds = bearColors.map((bc) => bc.bear_id);

      if (bearIds.length > 0) {
        //Delete all bears that have that color
        await manager.delete(Bear, { id: In(bearIds) });
      }
      //Delete color itself and automatically deletes colors in the table of bearcolors with cascade enabled
      await manager.delete(Color, { id: colorId });

      return true;
    });
  }
}

export const ColorRepositoryProvider = {
  provide: ColorRepository,
  useFactory: (dataSource: DataSource): ColorRepository =>
    new ColorRepository(dataSource),
  inject: [DataSource],
};
