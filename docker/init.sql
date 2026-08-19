CREATE DATABASE IF NOT EXISTS hotel_db;
USE hotel_db;

CREATE TABLE IF NOT EXISTS huesped (
    id INT AUTO_INCREMENT PRIMARY KEY,
    identificacion VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    apellido VARCHAR(255) NOT NULL,
    telefono VARCHAR(255) NOT NULL,
    tipoDocumento VARCHAR(255) NOT NULL,
    fechaNacimiento DATE NOT NULL,
    UNIQUE KEY uq_huesped_documento (tipoDocumento, identificacion)
);

CREATE TABLE IF NOT EXISTS habitacion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numeroHabitacion VARCHAR(255) NOT NULL UNIQUE,
    precioHabitacion DECIMAL(10,2) NOT NULL,
    estadoHabitacion VARCHAR(255) NOT NULL,
    tipoHabitacion VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS checkin (
    id INT AUTO_INCREMENT PRIMARY KEY,
    huespedId INT NOT NULL,
    habitacionId INT NOT NULL,
    fechaIngreso DATETIME NOT NULL,
    fechaSalida DATE NOT NULL,
    pagoTotalHabitacion DECIMAL(10,2) NOT NULL,
    pagoRealizado DECIMAL(10,2) NOT NULL,
    estadoPago VARCHAR(255) NOT NULL,

    CONSTRAINT fk_checkin_huesped
        FOREIGN KEY (huespedId)
        REFERENCES huesped(id),

    CONSTRAINT fk_checkin_habitacion
        FOREIGN KEY (habitacionId)
        REFERENCES habitacion(id)
);