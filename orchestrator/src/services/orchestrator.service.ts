import {
  obtenerHabitacionPorId,
  obtenerHabitaciones,
} from '../clients/hotel.client';

import {
  obtenerJugadorPorId,
  obtenerTorneos,
} from '../clients/sports.client';

import {
  obtenerPeliculaPorId,
  obtenerPeliculas,
} from '../clients/cine.client';

import { publicarMensaje } from '../clients/queue.client';


// ----------------------------------------------------
// FLUJO ORIGINAL POR ID
// ----------------------------------------------------

export async function ejecutarFlujoOrquestado(
  habitacionId: number,
  jugadorId: number,
  peliculaId: number,
  traceId: string
) {

  const [habitacion, jugador, pelicula] = await Promise.all([
    obtenerHabitacionPorId(habitacionId, traceId),
    obtenerJugadorPorId(jugadorId, traceId),
    obtenerPeliculaPorId(peliculaId, traceId),
  ]);

  return {
    traceId,
    habitacion,
    jugador,
    pelicula,
  };
}


// ----------------------------------------------------
// FUNCION PARA SELECCIONAR UN ELEMENTO ALEATORIO
// ----------------------------------------------------

function seleccionarAleatorio<T>(elementos: T[]): T {

  if (elementos.length === 0) {
    throw new Error('No hay elementos disponibles para seleccionar');
  }

  const indice = Math.floor(Math.random() * elementos.length);

  return elementos[indice]!;
}


// ----------------------------------------------------
// PUBLICAR RESULTADO EN OCI QUEUE
// ----------------------------------------------------

async function publicarResultadoEnCola(
  origen: 'hotel' | 'sports' | 'cine',
  resultado: unknown,
  traceId: string
) {

  await publicarMensaje({
    traceId,
    tipo: 'flujo-orquestado',
    origen,
    data: resultado,
    timestamp: new Date().toISOString(),
  });
}


// ----------------------------------------------------
// FLUJO DINAMICO
// ----------------------------------------------------

export async function ejecutarFlujoDinamico(
  origen: 'hotel' | 'sports' | 'cine',
  data: unknown,
  traceId: string
) {

  // --------------------------------------------------
  // SI EL ORIGEN ES HOTEL
  // Conservamos la habitacion recibida.
  // Buscamos torneo y pelicula aleatorios.
  // --------------------------------------------------

  if (origen === 'hotel') {

    const [torneos, peliculas] = await Promise.all([
      obtenerTorneos(traceId),
      obtenerPeliculas(traceId),
    ]);

    const torneoAleatorio = seleccionarAleatorio(torneos);
    const peliculaAleatoria = seleccionarAleatorio(peliculas);

    const resultado = {
      traceId,
      origen,
      habitacion: data,
      torneo: torneoAleatorio,
      pelicula: peliculaAleatoria,
    };

    await publicarResultadoEnCola(
      origen,
      resultado,
      traceId
    );

    return resultado;
  }


  // --------------------------------------------------
  // SI EL ORIGEN ES SPORTS
  // Conservamos el torneo recibido.
  // Buscamos habitacion y pelicula aleatorias.
  // --------------------------------------------------

  if (origen === 'sports') {

    const [habitaciones, peliculas] = await Promise.all([
      obtenerHabitaciones(traceId),
      obtenerPeliculas(traceId),
    ]);

    const habitacionAleatoria = seleccionarAleatorio(habitaciones);
    const peliculaAleatoria = seleccionarAleatorio(peliculas);

    const resultado = {
      traceId,
      origen,
      habitacion: habitacionAleatoria,
      torneo: data,
      pelicula: peliculaAleatoria,
    };

    await publicarResultadoEnCola(
      origen,
      resultado,
      traceId
    );

    return resultado;
  }


  // --------------------------------------------------
  // SI EL ORIGEN ES CINE
  // Conservamos la pelicula recibida.
  // Buscamos habitacion y torneo aleatorios.
  // --------------------------------------------------

  if (origen === 'cine') {

    const [habitaciones, torneos] = await Promise.all([
      obtenerHabitaciones(traceId),
      obtenerTorneos(traceId),
    ]);

    const habitacionAleatoria = seleccionarAleatorio(habitaciones);
    const torneoAleatorio = seleccionarAleatorio(torneos);

    const resultado = {
      traceId,
      origen,
      habitacion: habitacionAleatoria,
      torneo: torneoAleatorio,
      pelicula: data,
    };

    await publicarResultadoEnCola(
      origen,
      resultado,
      traceId
    );

    return resultado;
  }


  throw new Error('Origen no valido');
}