import fastify from 'fastify';
import dotenv from 'dotenv';


dotenv.config();

const app = fastify({
    logger: true,
});


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