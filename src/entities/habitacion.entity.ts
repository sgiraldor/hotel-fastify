import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('habitacion')
export class Habitacion {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  numeroHabitacion!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  precioHabitacion!: number;

  @Column({ type: 'varchar' })
  estadoHabitacion!: string;

  @Column({ type: 'varchar' })
  tipoHabitacion!: string;
}