import { describe, it, expect } from 'vitest';
import { validarHuesped } from '../src/utils/huesped.utils';

describe('Pruebas unitarias para el huesped', () => {
  it('aceptar al huesped porque estan todos los datos', () => {
    const resultado = validarHuesped({
      identificacion: '1030123456',
      nombre: 'Samuel',
      apellido: 'Giraldo',
      telefono: '3001234567',
      tipoDocumento: 'CC',
      fechaNacimiento: '2002-05-15',
    });

    expect(resultado).toBe(true);
  });

  it('el huesped no tiene nombre', () => {
    const resultado = validarHuesped({
      identificacion: '1030123456',
      nombre: '',
      apellido: 'Giraldo',
      telefono: '3001234567',
      tipoDocumento: 'CC',
      fechaNacimiento: '2002-05-15',
    });

    expect(resultado).toBe(false);
  });

  it('el huesped no tiene identifiacaion', () => {
    const resultado = validarHuesped({
      identificacion: '',
      nombre: 'Samuel',
      apellido: 'Giraldo',
      telefono: '3001234567',
      tipoDocumento: 'CC',
      fechaNacimiento: '2002-05-15',
    });

    expect(resultado).toBe(false);
  });
});