import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { Bear } from "./bear.entity";
import { Color } from "./color.entity";

@Entity("bear_colors")
export class BearColors {
  @Column()
  bear_id: number;

  @Column()
  color_id: number;

  @ManyToOne(() => Bear, (bear) => bear.bearColors, { onDelete: "CASCADE" })
  bear: Bear;

  @ManyToOne(() => Color, (color) => color.bearColors, { onDelete: "CASCADE" })
  color: Color;
}
