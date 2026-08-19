export interface DatosHabitacion {
  numeroHabitacion: string;
  precioHabitacion: number;
  estadoHabitacion: string;
  tipoHabitacion: string;
}

export function validarHabitacion(datos: DatosHabitacion): boolean {
  return Boolean(
    datos.numeroHabitacion &&
      datos.precioHabitacion > 0 &&
      datos.estadoHabitacion &&
      datos.tipoHabitacion,
  );
}