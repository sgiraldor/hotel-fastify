const STORAGE_API_URL = process.env.STORAGE_API_URL;


if (!STORAGE_API_URL) {
  throw new Error(
    'STORAGE_API_URL no está configurada'
  );
}


// -----------------------------------------
// ESTRUCTURA DEL ARTIFACT
// -----------------------------------------

export interface FlowArtifact {

  traceId: string;

  origen?: string;

  habitacion: unknown;

  torneo: unknown;

  pelicula: unknown;

}


// -----------------------------------------
// RESPUESTA DE STORAGE AL GUARDAR
// -----------------------------------------

export interface StoredArtifact {

  bucket: string;

  object: string;

}


// -----------------------------------------
// GUARDAR ARTIFACT EN OBJECT STORAGE
// -----------------------------------------

export async function saveArtifact(
  artifact: FlowArtifact
): Promise<StoredArtifact> {


  const response = await fetch(
    `${STORAGE_API_URL}/api/v2/artifacts`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        'x-trace-id': artifact.traceId,
      },

      body: JSON.stringify(artifact),

    }
  );


  if (!response.ok) {

    throw new Error(
      `Error guardando artifact: ${response.status} ${await response.text()}`
    );

  }


  return response.json() as Promise<StoredArtifact>;

}


// -----------------------------------------
// CONSULTAR ARTIFACT
// -----------------------------------------

export async function getArtifact(
  traceId: string
): Promise<FlowArtifact> {


  const response = await fetch(
    `${STORAGE_API_URL}/api/v2/artifacts/${encodeURIComponent(traceId)}`,
    {
      headers: {
        'x-trace-id': traceId,
      },
    }
  );


  if (!response.ok) {

    throw new Error(
      `Error leyendo artifact: ${response.status} ${await response.text()}`
    );

  }


  return response.json() as Promise<FlowArtifact>;

}