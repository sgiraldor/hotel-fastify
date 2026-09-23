import { apiConfig } from '../config/apis.config';

export async function obtenerHuespedPorId(id: number) {
  const url = `${apiConfig.hotel.baseUrl}/api/v2/huesped/${id}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error consultando Hotel API. Status: ${response.status}`,
    );
  }

  return await response.json();
}