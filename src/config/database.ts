import {DataSource} from "typeorm";
import { config } from 'dotenv';
import { Huesped } from '../entities/huesped.entity';
import { Habitacion } from '../entities/habitacion.entity';
import { CheckIn } from '../entities/checkin.entity';
config();


export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: [Huesped, Habitacion, CheckIn],
    synchronize: false,
});