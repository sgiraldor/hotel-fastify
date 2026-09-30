import { apiConfig } from '../config/apis.config';

import {
    obtenerCache,
    guardarCache,
} from './cache.client';


// ----------------------------------------------------
// OBTENER JUGADOR POR ID CON CACHE
// ----------------------------------------------------

export async function obtenerJugadorPorId(
    id: number,
    traceId: string
) {

    const cacheKey = `jugador:${id}`;


    // -----------------------------------------
    // 1. BUSCAR EN CACHE
    // -----------------------------------------

    const cache = await obtenerCache(
        cacheKey,
        traceId
    );


    if (cache.hit) {

        return cache.data.value;

    }



    // -----------------------------------------
    // 2. CACHE MISS
    // CONSULTAR SPORTS API
    // -----------------------------------------

    const url =
        `${apiConfig.gcp.baseUrl}/api/v2/jugadores/${id}`;


    const response = await fetch(url, {

        headers: {
            'x-trace-id': traceId,
        },

    });



    if (!response.ok) {

        throw new Error(
            `Error consultando jugador en Sports API: ${response.status}`
        );

    }


    const jugador = await response.json();



    // -----------------------------------------
    // 3. GUARDAR EN CACHE
    // -----------------------------------------

    await guardarCache(
        cacheKey,
        jugador,
        traceId,
        300
    );


    return jugador;

}



// ----------------------------------------------------
// OBTENER TORNEOS
// ----------------------------------------------------

export async function obtenerTorneos(
    traceId: string
) {

    const url =
        `${apiConfig.gcp.baseUrl}/api/v2/torneos`;


    const response = await fetch(url, {

        headers: {
            'x-trace-id': traceId,
        },

    });



    if (!response.ok) {

        throw new Error(
            `Error consultando torneos en Sports API: ${response.status}`
        );

    }


    return response.json();

}