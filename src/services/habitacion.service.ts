import { AppDataSource } from '../config/database';
import { Habitacion } from '../entities/habitacion.entity';

interface CrearHabitacionData {
  numeroHabitacion: string;
  precioHabitacion: number;
  estadoHabitacion: string;
  tipoHabitacion: string;
}

interface ActualizarHabitacionData {
  numeroHabitacion?: string;
  precioHabitacion?: number;
  estadoHabitacion?: string;
  tipoHabitacion?: string;
}

export class HabitacionService {
  private habitacionRepository = AppDataSource.getRepository(Habitacion);

  async crear(datos: CrearHabitacionData) {
    const nuevaHabitacion = this.habitacionRepository.create({
      numeroHabitacion: datos.numeroHabitacion,
      precioHabitacion: datos.precioHabitacion,
      estadoHabitacion: datos.estadoHabitacion,
      tipoHabitacion: datos.tipoHabitacion,
    });

    return await this.habitacionRepository.save(nuevaHabitacion);
  }

  async obtenerTodos() {
    return await this.habitacionRepository.find();
  }

  async obtenerPorId(id: number) {
    return await this.habitacionRepository.findOneBy({ id });
  }

  async actualizar(id: number, datos: ActualizarHabitacionData) {
    const habitacion = await this.habitacionRepository.findOneBy({ id });

    if (!habitacion) {
      return null;
    }

    if (datos.numeroHabitacion !== undefined) {
      habitacion.numeroHabitacion = datos.numeroHabitacion;
    }

    if (datos.precioHabitacion !== undefined) {
      habitacion.precioHabitacion = datos.precioHabitacion;
    }

    if (datos.estadoHabitacion !== undefined) {
      habitacion.estadoHabitacion = datos.estadoHabitacion;
    }

    if (datos.tipoHabitacion !== undefined) {
      habitacion.tipoHabitacion = datos.tipoHabitacion;
    }

    return await this.habitacionRepository.save(habitacion);
  }

  async eliminar(id: number) {
    const habitacion = await this.habitacionRepository.findOneBy({ id });

    if (!habitacion) {
      return false;
    }

    await this.habitacionRepository.remove(habitacion);

    return true;
  }
}