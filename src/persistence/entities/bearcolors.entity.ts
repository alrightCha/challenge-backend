import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Bear } from "./bear.entity";
import { Color } from "./color.entity";

@Entity("bear_colors")
export class BearColors {
  @PrimaryGeneratedColumn()
  id: number; 
  
  @Column()
  bear_id: number;

  @Column()
  color_id: number;

  @ManyToOne(() => Bear, (bear) => bear.bearColors, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bear_id" })
  bear: Bear;

  @ManyToOne(() => Color, (color) => color.bearColors, { onDelete: "CASCADE" })
  @JoinColumn({ name: "color_id" })
  color: Color;
}
