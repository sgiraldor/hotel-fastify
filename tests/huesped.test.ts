import { describe, it, expect } from 'vitest';

describe('Prubas uniotarias para el huesped', () => {
  it('Convertir una fecha de nacimineto en date', () => {
    const fechaNacimiento = '2002-05-15';

    const fecha = new Date(fechaNacimiento);

    expect(fecha).toBeInstanceOf(Date);
    expect(fecha.getUTCFullYear()).toBe(2002);
    expect(fecha.getUTCMonth()).toBe(4);
    expect(fecha.getUTCDate()).toBe(15);
  });
});