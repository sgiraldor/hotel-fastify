import { apiConfig } from '../config/apis.config';

import {
  obtenerCache,
  guardarCache,
} from './cache.client';


// ----------------------------------------------------
// OBTENER HUESPED POR ID
// ----------------------------------------------------

export async function obtenerHuespedPorId(
  id: number,
  traceId?: string
) {

  const url = `${apiConfig.hotel.baseUrl}/api/v2/huesped/${id}`;

  const response = await fetch(url, {
    headers: traceId
      ? {
          'x-trace-id': traceId,
        }
      : {},
  });

  if (!response.ok) {

    throw new Error(
      `Error consultando Hotel API. Status: ${response.status}`,
    );

  }

  return await response.json();
}



// ----------------------------------------------------
// OBTENER HABITACION POR ID CON CACHE
// ----------------------------------------------------

export async function obtenerHabitacionPorId(
  id: number,
  traceId: string
) {

  const cacheKey = `habitacion:${id}`;


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
  // CONSULTAR HOTEL API
  // -----------------------------------------

  const url =
    `${apiConfig.hotel.baseUrl}/api/v2/habitacion/${id}`;


  const response = await fetch(url, {

    headers: {
      'x-trace-id': traceId,
    },

  });



  if (!response.ok) {

    throw new Error(
      `Error consultando habitacion en Hotel API. Status: ${response.status}`,
    );

  }


  const habitacion = await response.json();



  // -----------------------------------------
  // 3. GUARDAR EN CACHE
  // -----------------------------------------

  await guardarCache(
    cacheKey,
    habitacion,
    traceId,
    300
  );


  return habitacion;

}



// ----------------------------------------------------
// OBTENER TODAS LAS HABITACIONES
// ----------------------------------------------------

export async function obtenerHabitaciones(
  traceId: string
) {

  const url =
    `${apiConfig.hotel.baseUrl}/api/v2/habitacion`;


  const response = await fetch(url, {

    headers: {
      'x-trace-id': traceId,
    },

  });



  if (!response.ok) {

    throw new Error(
      `Error consultando habitaciones en Hotel API. Status: ${response.status}`,
    );

  }


  return await response.json();

}