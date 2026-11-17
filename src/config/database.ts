import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Huesped } from '../entities/huesped.entity';
import { Habitacion } from '../entities/habitacion.entity';
import { CheckIn } from '../entities/checkin.entity';
import {
  obtenerLimitePool,
  obtenerQueryTimeoutMs,
  obtenerQueueLimit,
  obtenerEstadisticasResiliencia,
} from './resilience';

export {
  conTimeoutConsulta,
  conConsultaResiliente,
} from './resilience';

config();

const limitePool = obtenerLimitePool();
const queryTimeoutMs = obtenerQueryTimeoutMs();
const queueLimit = obtenerQueueLimit();

const databaseConfig = {
  type: 'mysql' as const,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [Huesped, Habitacion, CheckIn],
  synchronize: false,
  extra: {
    connectionLimit: limitePool,
    connectTimeout: Math.max(1000, queryTimeoutMs || 10000),
    waitForConnections: true,
    // En protected limita la cola; en unprotected 0 = ilimitada (mysql2).
    queueLimit,
  },
  ...(process.env.INSTANCE_UNIX_SOCKET
    ? {
        socketPath: process.env.INSTANCE_UNIX_SOCKET,
      }
    : {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
      }),
};

export const AppDataSource = new DataSource(databaseConfig);

export function descripcionResilienciaDb() {
  return obtenerEstadisticasResiliencia();
}
