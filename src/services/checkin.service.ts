import { AppDataSource } from '../config/database';
import { CheckIn } from '../entities/checkin.entity';
import { Huesped } from '../entities/huesped.entity';
import { Habitacion } from '../entities/habitacion.entity';

interface CrearCheckInData {
  huespedId: number;
  habitacionId: number;
  fechaIngreso: string;
  fechaSalida: string;
  pagoTotalHabitacion: number;
  pagoRealizado: number;
  estadoPago: string;
}

interface ActualizarCheckInData {
  huespedId?: number;
  habitacionId?: number;
  fechaIngreso?: string;
  fechaSalida?: string;
  pagoTotalHabitacion?: number;
  pagoRealizado?: number;
  estadoPago?: string;
}

export class CheckInService {
  private checkinRepository = AppDataSource.getRepository(CheckIn);
  private huespedRepository = AppDataSource.getRepository(Huesped);
  private habitacionRepository = AppDataSource.getRepository(Habitacion);

  async crear(datos: CrearCheckInData) {
    const huesped = await this.huespedRepository.findOneBy({
      id: datos.huespedId,
    });

    if (!huesped) {
      return {
        error: 'HUESPED_NO_ENCONTRADO' as const,
      };
    }

    const habitacion = await this.habitacionRepository.findOneBy({
      id: datos.habitacionId,
    });

    if (!habitacion) {
      return {
        error: 'HABITACION_NO_ENCONTRADA' as const,
      };
    }

    const nuevoCheckIn = this.checkinRepository.create({
      huesped,
      habitacion,
      fechaIngreso: new Date(datos.fechaIngreso),
      fechaSalida: new Date(datos.fechaSalida),
      pagoTotalHabitacion: datos.pagoTotalHabitacion,
      pagoRealizado: datos.pagoRealizado,
      estadoPago: datos.estadoPago,
    });

    const checkin = await this.checkinRepository.save(nuevoCheckIn);

    return {
      checkin,
    };
  }

  async obtenerTodos() {
    return await this.checkinRepository.find({
      relations: {
        huesped: true,
        habitacion: true,
      },
    });
  }

  async obtenerPorId(id: number) {
    return await this.checkinRepository.findOne({
      where: { id },
      relations: {
        huesped: true,
        habitacion: true,
      },
    });
  }

  async actualizar(id: number, datos: ActualizarCheckInData) {
    const checkin = await this.checkinRepository.findOne({
      where: { id },
      relations: {
        huesped: true,
        habitacion: true,
      },
    });

    if (!checkin) {
      return {
        error: 'CHECKIN_NO_ENCONTRADO' as const,
      };
    }

    if (datos.huespedId !== undefined) {
      const huesped = await this.huespedRepository.findOneBy({
        id: datos.huespedId,
      });

      if (!huesped) {
        return {
          error: 'HUESPED_NO_ENCONTRADO' as const,
        };
      }

      checkin.huesped = huesped;
    }

    if (datos.habitacionId !== undefined) {
      const habitacion = await this.habitacionRepository.findOneBy({
        id: datos.habitacionId,
      });

      if (!habitacion) {
        return {
          error: 'HABITACION_NO_ENCONTRADA' as const,
        };
      }

      checkin.habitacion = habitacion;
    }

    if (datos.fechaIngreso !== undefined) {
      checkin.fechaIngreso = new Date(datos.fechaIngreso);
    }

    if (datos.fechaSalida !== undefined) {
      checkin.fechaSalida = new Date(datos.fechaSalida);
    }

    if (datos.pagoTotalHabitacion !== undefined) {
      checkin.pagoTotalHabitacion = datos.pagoTotalHabitacion;
    }

    if (datos.pagoRealizado !== undefined) {
      checkin.pagoRealizado = datos.pagoRealizado;
    }

    if (datos.estadoPago !== undefined) {
      checkin.estadoPago = datos.estadoPago;
    }

    const checkinActualizado =
      await this.checkinRepository.save(checkin);

    return {
      checkin: checkinActualizado,
    };
  }

  async eliminar(id: number) {
    const checkin = await this.checkinRepository.findOneBy({ id });

    if (!checkin) {
      return false;
    }

    await this.checkinRepository.remove(checkin);

    return true;
  }
}