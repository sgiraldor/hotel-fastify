import { apiConfig } from '../config/apis.config';


// ----------------------------------------------------
// CONSULTAR CACHE
// ----------------------------------------------------

export async function obtenerCache(
  key: string,
  traceId: string
) {

  const url = `${apiConfig.cache.baseUrl}/cache/${key}`;

  const response = await fetch(url, {
    headers: {
      'x-trace-id': traceId,
    },
  });


  const data = await response.json();


  // Cuando no existe en cache
  if (response.status === 404) {
    return {
      hit: false,
      data,
    };
  }


  if (!response.ok) {
    throw new Error(
      `Error consultando cache: ${response.status}`
    );
  }


  return {
    hit: true,
    data,
  };
}



// ----------------------------------------------------
// GUARDAR EN CACHE
// ----------------------------------------------------

export async function guardarCache(
  key: string,
  value: unknown,
  traceId: string,
  ttl = 300
) {

  const url = `${apiConfig.cache.baseUrl}/cache`;


  const response = await fetch(url, {
    method: 'POST',

    headers: {
      'Content-Type': 'application/json',
      'x-trace-id': traceId,
    },

    body: JSON.stringify({
      key,
      value,
      ttl,
    }),
  });


  if (!response.ok) {
    throw new Error(
      `Error guardando en cache: ${response.status}`
    );
  }


  return response.json();
}



// ----------------------------------------------------
// ELIMINAR CACHE
// ----------------------------------------------------

export async function eliminarCache(
  key: string,
  traceId: string
) {

  const url = `${apiConfig.cache.baseUrl}/cache/${key}`;


  const response = await fetch(url, {
    method: 'DELETE',

    headers: {
      'x-trace-id': traceId,
    },
  });


  if (!response.ok) {
    throw new Error(
      `Error eliminando cache: ${response.status}`
    );
  }


  return response.json();
}