export interface DatosHuesped {
  identificacion: string;
  nombre: string;
  apellido: string;
  telefono: string;
  tipoDocumento: string;
  fechaNacimiento: string;
}

export function validarHuesped(datos: DatosHuesped): boolean {
  return Boolean(
    datos.identificacion &&
      datos.nombre &&
      datos.apellido &&
      datos.telefono &&
      datos.tipoDocumento &&
      datos.fechaNacimiento,
  );
}