import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Bear {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    size: number;
}
