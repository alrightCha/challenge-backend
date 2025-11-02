import { Entity, Column, PrimaryGeneratedColumn, Unique, OneToMany } from 'typeorm';
import { BearColors } from './bearcolors.entity';

@Entity("colors")
export class Color {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @OneToMany(() => BearColors, (bc) => bc.color_id)
    bearColors: BearColors[]
}
