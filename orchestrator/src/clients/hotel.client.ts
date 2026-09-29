import { apiConfig } from '../config/apis.config';

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

export async function obtenerHabitacionPorId(
  id: number,
  traceId: string
) {
  const url = `${apiConfig.hotel.baseUrl}/api/v2/habitacion/${id}`;

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

  return await response.json();
}

export async function obtenerHabitaciones(
  traceId: string
) {
  const url = `${apiConfig.hotel.baseUrl}/api/v2/habitacion`;

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