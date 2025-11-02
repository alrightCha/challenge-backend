import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { BearColors } from './bearcolors.entity';

@Entity()
export class Bear {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    size: number;

    @OneToMany(() => BearColors, (bc) => bc.bear_id, { cascade: true})
    bearColors: BearColors[]; 
}
