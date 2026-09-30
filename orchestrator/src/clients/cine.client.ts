import { FastifyBaseLogger } from 'fastify';
import { apiConfig } from '../config/apis.config';
import {
  obtenerCache,
  guardarCache,
} from './cache.client';


// ----------------------------------------------------
// OBTENER PELICULA POR ID CON CACHE
// ----------------------------------------------------

export async function obtenerPeliculaPorId(
  id: number,
  traceId: string,
  log: FastifyBaseLogger
) {

  const cacheKey = `pelicula:${id}`;


  log.info({
    evento: 'consulta_cache',
    key: cacheKey,
    traceId,
  });



  // -----------------------------
  // 1. BUSCAR EN CACHE
  // -----------------------------

  const cache = await obtenerCache(
    cacheKey,
    traceId
  );


  log.info({
    evento: 'respuesta_cache',
    hit: cache.hit,
    traceId,
  });



  if (cache.hit) {

    log.info({
      evento: 'cache_hit',
      key: cacheKey,
      traceId,
    });

    return cache.data.value;

  }



  log.info({
    evento: 'cache_miss',
    key: cacheKey,
    traceId,
  });



  // -----------------------------
  // 2. CACHE MISS
  // CONSULTAR CINE API
  // -----------------------------

  const url =
    `${apiConfig.azure.baseUrl}/peliculas/${id}`;


  log.info({
    evento: 'consultando_cine_api',
    url,
    traceId,
  });



  const response = await fetch(url, {

    headers: {
      'x-trace-id': traceId,
    },

  });



  if (!response.ok) {

    throw new Error(
      `Error consultando pelicula en Cine API: ${response.status}`
    );

  }



  const pelicula = await response.json();



  log.info({
    evento: 'respuesta_cine_api',
    traceId,
  });



  // -----------------------------
  // 3. GUARDAR EN CACHE
  // -----------------------------

  log.info({
    evento: 'guardando_cache',
    key: cacheKey,
    ttl: 300,
    traceId,
  });



  await guardarCache(
    cacheKey,
    pelicula,
    traceId,
    300
  );



  log.info({
    evento: 'cache_guardado',
    key: cacheKey,
    traceId,
  });



  return pelicula;
}



// ----------------------------------------------------
// OBTENER TODAS LAS PELICULAS
// ----------------------------------------------------

export async function obtenerPeliculas(
  traceId: string
) {

  const url =
    `${apiConfig.azure.baseUrl}/peliculas`;


  const response = await fetch(url, {

    headers: {
      'x-trace-id': traceId,
    },

  });



  if (!response.ok) {

    throw new Error(
      `Error consultando peliculas: ${response.status}`
    );

  }


  return response.json();
}