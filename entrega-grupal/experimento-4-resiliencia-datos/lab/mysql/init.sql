-- Datos sintéticos del laboratorio seguridad-caos-exp4.
-- Credenciales solo locales (no reales / no cloud / no Hotel).

CREATE DATABASE IF NOT EXISTS lab_resilience_db;
USE lab_resilience_db;

-- Commits sintéticos confirmados (fuente de verdad para RPO observado).
CREATE TABLE IF NOT EXISTS synthetic_commits (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  commit_id VARCHAR(64) NOT NULL UNIQUE,
  run_id VARCHAR(64) NOT NULL,
  scenario VARCHAR(16) NOT NULL,
  payload VARCHAR(255) NOT NULL,
  committed_at_utc DATETIME(3) NOT NULL,
  INDEX idx_run (run_id),
  INDEX idx_committed (committed_at_utc)
);

-- Tabla dedicada al fallo lógico controlado (nunca borrar datadir).
CREATE TABLE IF NOT EXISTS synthetic_fault_target (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  run_id VARCHAR(64) NOT NULL,
  note VARCHAR(255) NOT NULL,
  created_at_utc DATETIME(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_meta (
  k VARCHAR(64) PRIMARY KEY,
  v VARCHAR(255) NOT NULL
);

INSERT INTO lab_meta (k, v) VALUES
  ('project', 'seguridad-caos-exp4'),
  ('db_name', 'lab_resilience_db'),
  ('purpose', 'synthetic-rpo-rto-lab')
ON DUPLICATE KEY UPDATE v = VALUES(v);
