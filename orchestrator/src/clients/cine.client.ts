import { apiConfig } from '../config/apis.config';

export async function obtenerPeliculaPorId(
    id: number,
    traceId: string
) {
    const url = `${apiConfig.azure.baseUrl}/api/v2/peliculas/${id}`;

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

    return response.json();
}