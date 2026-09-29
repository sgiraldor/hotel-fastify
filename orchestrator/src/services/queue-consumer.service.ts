import {
  obtenerMensajes,
  eliminarMensaje,
} from '../clients/queue.client';


// ----------------------------------------------------
// CONSUMIR Y PROCESAR MENSAJES DE OCI QUEUE
// ----------------------------------------------------

export async function consumirMensajes() {

  const mensajes = await obtenerMensajes();

  if (!mensajes || mensajes.length === 0) {
    return {
      procesados: 0,
      message: 'No hay mensajes disponibles en la cola',
    };
  }

  let procesados = 0;
  let fallidos = 0;

  for (const mensaje of mensajes) {

    try {

      if (!mensaje.content) {
        throw new Error(
          'El mensaje no contiene contenido'
        );
      }

      const contenido = JSON.parse(mensaje.content);

      console.log(
        'Procesando mensaje:',
        contenido
      );

      // ------------------------------------------------
      // PROCESAMIENTO DEL MENSAJE
      // ------------------------------------------------

      console.log(
        `Mensaje procesado. traceId: ${contenido.traceId}`
      );

      // Solo eliminamos el mensaje si fue procesado
      // correctamente.

      if (!mensaje.receipt) {
        throw new Error(
          'El mensaje no contiene receipt'
        );
      }

      await eliminarMensaje(mensaje.receipt);

      procesados++;

    } catch (error) {

      fallidos++;

      console.error(
        'Error procesando mensaje:',
        error
      );

      // Si ocurre un error, NO eliminamos el mensaje.
      // OCI podra entregarlo nuevamente y, si supera
      // el numero maximo de intentos, lo enviara a DLQ.
    }
  }

  return {
    recibidos: mensajes.length,
    procesados,
    fallidos,
  };
}