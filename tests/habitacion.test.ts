import { describe, it, expect } from 'vitest';
import { validarHabitacion } from '../src/utils/habitacion.utils';

describe('Pruebas unitarias para habitacion', () => {
  it('los datos de la habitacion estan bien', () => {
    const resultado = validarHabitacion({
      numeroHabitacion: '101',
      precioHabitacion: 180000,
      estadoHabitacion: 'DISPONIBLE',
      tipoHabitacion: 'DOBLE',
    });

    expect(resultado).toBe(true);
  });

    it('no puede piorque el precio de la habitracion es negativo', () => {
    const resultado = validarHabitacion({
      numeroHabitacion: '101',
      precioHabitacion: -180000,
      estadoHabitacion: 'DISPONIBLE',
      tipoHabitacion: 'DOBLE',
    });

    expect(resultado).toBe(false);
  });

    it('no hay numero de la habitacion', () => {
    const resultado = validarHabitacion({
      numeroHabitacion: '',
      precioHabitacion: 180000,
      estadoHabitacion: 'DISPONIBLE',
      tipoHabitacion: 'DOBLE',
    });

    expect(resultado).toBe(false);
  });

    it('rechazar la habitacion porque no tiene tipo de habitacion', () => {
     const resultado = validarHabitacion({
    numeroHabitacion: '101',
    precioHabitacion: 180000,
    estadoHabitacion: 'DISPONIBLE',
    tipoHabitacion: '',
    });

  expect(resultado).toBe(false);
});
    it('el precio de la habitacion no puede ser 0', () => {
        const resultado = validarHabitacion({
        numeroHabitacion: '101',
        precioHabitacion: 0,
        estadoHabitacion: 'DISPONIBLE',
        tipoHabitacion: 'DOBLE',
        });
    expect(resultado).toBe(false);
    });

});