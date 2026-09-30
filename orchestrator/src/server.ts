import 'dotenv/config';
import './observability/otel';
import fastify from 'fastify';
import { hotelRoutes } from './routes/hotel.routes';
import { sportsRoutes } from './routes/sports.routes';
import { cineRoutes } from './routes/cine.routes';
import { orchestratorRoutes } from './routes/orchestrator.routes';
import { queueRoutes } from './routes/queue.routes';
import { camposDeCorrelacion } from './observability/log-context';
import { registrarMetricasHttp } from './observability/http-metrics';
import { iniciarGaugePendiente } from './observability/queue-metrics';

const app = fastify({
    logger: {
        level: 'info',
        mixin() {
            return camposDeCorrelacion();
        },
    },
});

registrarMetricasHttp(app, 'hotel-orchestrator');
iniciarGaugePendiente();

app.register(hotelRoutes);
app.register(sportsRoutes);
app.register(cineRoutes);
app.register(orchestratorRoutes);
app.register(queueRoutes);

app.get('/', async () =>{
    return{
        message: 'MS orquestador funcionando',
    };
});

const start = async () =>{
    try{
        const port = Number(process.env.ORCHESTRATOR_PORT) || 4000;

        await app.listen({
            port,
            host: '0.0.0.0'
        });

        console.log (`Servidor corriendo en el puerto ${port}`);

    } catch (error) {
        app.log.error(error);
        process.exit(1);
    }
};

start();