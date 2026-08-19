import { describe, it, expect } from 'vitest';
import { validarCheckIn } from '../src/utils/checkin.utils';

describe('Pruebas unitarias para el checkin', () => {
  it('todos los datos estan bein', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 360000,
        pagoRealizado: 180000,
        estadoPago: 'PENDIENTE',
    });

    expect(resultado).toBe(true);
  });

  it('no esta bien, la slida es anterior a la entrada ', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-22',
        fechaSalida: '2026-08-20',
        pagoTotalHabitacion: 360000,
        pagoRealizado: 180000,
        estadoPago: 'PENDIENTE',
    });

    expect(resultado).toBe(false);
  });

  it('el pago es de 0', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 0,
        pagoRealizado: 0,
        estadoPago: 'PENDIENTE',
    });

    expect(resultado).toBe(false);
  });

  it('el pago es negativo', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 360000,
        pagoRealizado: -50000,
        estadoPago: 'PENDIENTE',
    });

    expect(resultado).toBe(false);
  });

  it('el pago supera el total de la habitacion', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 360000,
        pagoRealizado: 500000,
        estadoPago: 'PAGADO',
    });

    expect(resultado).toBe(false);
  });

  it('no tiene estado del pago de la habitacion', () => {
    const resultado = validarCheckIn({
        huespedId: 1,
        habitacionId: 1,
        fechaIngreso: '2026-08-20',
        fechaSalida: '2026-08-22',
        pagoTotalHabitacion: 360000,
        pagoRealizado: 180000,
        estadoPago: '',
    });

    expect(resultado).toBe(false);
  });
});