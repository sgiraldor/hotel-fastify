-- Datos sintéticos del laboratorio. Credenciales solo locales (no reales / no cloud).
-- Defensa adicional (mínimo privilegio): usuarios con grants acotados para demo opcional.

CREATE TABLE IF NOT EXISTS synthetic_rooms (
  id INT PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL
);

INSERT INTO synthetic_rooms (code, status) VALUES
  ('LAB-101', 'available'),
  ('LAB-102', 'occupied'),
  ('LAB-103', 'maintenance');

-- Usuario legítimo de aplicación (ya creado por MYSQL_USER del compose).
-- Usuario de solo lectura (mínimo privilegio) — preparado, no usado por R0/R1 de red.
CREATE USER IF NOT EXISTS 'lab_readonly'@'%' IDENTIFIED BY 'lab-only-readonly-not-real';
GRANT SELECT ON lab_hotel_db.synthetic_rooms TO 'lab_readonly'@'%';

-- Usuario sin privilegios útiles (para demostrar deny a nivel auth/datos, distinto de red).
CREATE USER IF NOT EXISTS 'lab_denied'@'%' IDENTIFIED BY 'lab-only-denied-not-real';
-- Sin GRANT intencional.

FLUSH PRIVILEGES;
