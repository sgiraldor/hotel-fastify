import { AppDataSource } from '../config/database';
import { Huesped } from '../entities/huesped.entity';

export class HuespedService {
  private huespedRepository = AppDataSource.getRepository(Huesped);

  async crear(datos: {
    identificacion: string;
    nombre: string;
    apellido: string;
    telefono: string;
    tipoDocumento: string;
    fechaNacimiento: string;
  }) {
    const nuevoHuesped = this.huespedRepository.create({
      identificacion: datos.identificacion,
      nombre: datos.nombre,
      apellido: datos.apellido,
      telefono: datos.telefono,
      tipoDocumento: datos.tipoDocumento,
      fechaNacimiento: new Date(datos.fechaNacimiento),
    });

    return await this.huespedRepository.save(nuevoHuesped);
  }

  async obtenerTodos() {
    return await this.huespedRepository.find();
  }

  async obtenerPorId(id: number) {
    return await this.huespedRepository.findOneBy({ id });
  }

  async actualizar(
    id: number,
    datos: {
      identificacion?: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
      tipoDocumento?: string;
      fechaNacimiento?: string;
    },
  ) {
    const huesped = await this.huespedRepository.findOneBy({ id });

    if (!huesped) {
      return null;
    }

    if (datos.identificacion !== undefined) {
      huesped.identificacion = datos.identificacion;
    }

    if (datos.nombre !== undefined) {
      huesped.nombre = datos.nombre;
    }

    if (datos.apellido !== undefined) {
      huesped.apellido = datos.apellido;
    }

    if (datos.telefono !== undefined) {
      huesped.telefono = datos.telefono;
    }

    if (datos.tipoDocumento !== undefined) {
      huesped.tipoDocumento = datos.tipoDocumento;
    }

    if (datos.fechaNacimiento !== undefined) {
      huesped.fechaNacimiento = new Date(datos.fechaNacimiento);
    }

    return await this.huespedRepository.save(huesped);
  }

  async eliminar(id: number) {
    const huesped = await this.huespedRepository.findOneBy({ id });

    if (!huesped) {
      return false;
    }

    await this.huespedRepository.remove(huesped);

    return true;
  }
}