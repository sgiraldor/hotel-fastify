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
  traceId: string
) {

  const cacheKey = `pelicula:${id}`;


  // -----------------------------
  // 1. BUSCAR EN CACHE
  // -----------------------------

  const cache = await obtenerCache(
    cacheKey,
    traceId
  );


  if (cache.hit) {

    return cache.data.value;

  }



  // -----------------------------
  // 2. CACHE MISS
  // CONSULTAR CINE API
  // -----------------------------

  const url =
    `${apiConfig.azure.baseUrl}/peliculas/${id}`;


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



  // -----------------------------
  // 3. GUARDAR EN CACHE
  // -----------------------------

  await guardarCache(
    cacheKey,
    pelicula,
    traceId,
    300
  );


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