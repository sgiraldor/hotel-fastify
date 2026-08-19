import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';
@Index(['tipoDocumento', 'identificacion'], { unique: true })

@Entity('huesped')
export class Huesped {
    @PrimaryGeneratedColumn()
    id!: number;
    @Column({type: 'varchar'})
    identificacion!: string;
    @Column({type: 'varchar'})
    nombre!: string;
    @Column({type: 'varchar'})
    apellido!: string;
    @Column({type: 'varchar'})
    telefono!: string;
    @Column({type: 'varchar'})
    tipoDocumento!: string;
    @Column({type: 'date'})
    fechaNacimiento!: Date;
}