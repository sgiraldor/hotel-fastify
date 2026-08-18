import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Huesped } from './huesped.entity';
import { Habitacion } from './habitacion.entity';

@Entity('checkin')
export class CheckIn {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Huesped, { nullable: false })
  @JoinColumn({ name: 'huespedId' })
  huesped!: Huesped;

  @ManyToOne(() => Habitacion, { nullable: false })
  @JoinColumn({ name: 'habitacionId' })
  habitacion!: Habitacion;

  @Column({ type: 'datetime' })
  fechaIngreso!: Date;

  @Column({ type: 'date' })
  fechaSalida!: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pagoTotalHabitacion!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pagoRealizado!: number;

  @Column({ type: 'varchar' })
  estadoPago!: string;
}