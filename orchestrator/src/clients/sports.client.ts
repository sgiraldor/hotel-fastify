import { apiConfig } from '../config/apis.config';

export async function obtenerJugadorPorId(
    id: number,
    traceId: string
) {
    const url = `${apiConfig.gcp.baseUrl}/api/v2/jugadores/${id}`;

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

    return response.json();
}