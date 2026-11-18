INSERT INTO habitacion (numeroHabitacion, precioHabitacion, estadoHabitacion, tipoHabitacion)
SELECT 'gate-101', 100.00, 'disponible', 'sencilla'
WHERE NOT EXISTS (
  SELECT 1 FROM habitacion WHERE numeroHabitacion = 'gate-101'
);
