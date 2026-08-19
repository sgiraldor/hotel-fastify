export interface DatosCheckIn {
    huespedId: number;
    habitacionId: number;
    fechaIngreso: string;
    fechaSalida: string;
    pagoTotalHabitacion: number;
    pagoRealizado: number;
    estadoPago: string;
    }

export function validarCheckIn(datos: DatosCheckIn): boolean {
  const fechaIngreso = new Date(datos.fechaIngreso);
  const fechaSalida = new Date(datos.fechaSalida);

  return Boolean(
    datos.huespedId > 0 &&
    datos.habitacionId > 0 &&
    datos.fechaIngreso &&
    datos.fechaSalida &&
    fechaSalida >= fechaIngreso &&
    datos.pagoTotalHabitacion > 0 &&
    datos.pagoRealizado >= 0 &&
    datos.pagoRealizado <= datos.pagoTotalHabitacion &&
    datos.estadoPago
  );
}