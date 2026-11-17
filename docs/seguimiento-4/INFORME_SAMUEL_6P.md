# Informe de Samuel — indisponibilidad HTTP 503 de Hotel

Aporte al informe grupal del Seguimiento #4. Hotel es la dependencia síncrona de Sports. No llama a Cine y no coordina el flujo.

## 1. Estado estable

Hotel corre en OKE con dos réplicas (`hotel-api-5c4b965cf6-glg2z` y `hotel-api-5c4b965cf6-tmqlg`), MySQL, probes `/live` y `/ready`, y el NLB `http://149.130.165.30`. El estado estable del interruptor es `activo=false`, habitación HTTP 200 y `/live` HTTP 200.

El flujo compartido usa `load/k6/flujo-profile-shared.js`: 15 s a 2 VU, 45 s a 4 VU, 15 s a 0 y una pausa de 0,3 s. En el baseline, con Hotel normal y la resiliencia de Sports activa, k6 registró 289 solicitudes completas, disponibilidad 100 % y p95 de 312,02 ms. El JSON de esa corrida no está archivado en el repositorio; el número se usa porque es el baseline definitivo del grupo, y el archivo queda pendiente.

## 2. Hipótesis

Si las dos réplicas responden 503 en `GET /api/v2/habitacion/:id` durante toda la ventana de k6, el flujo sin resiliencia de Sports falla todas las solicitudes. Con el fallback de Sports, el mismo 503 produce respuestas parciales y cero fallidas. Fail-fast y bulkhead de Hotel no convierten un 503 total en una habitación real.

## 3. Método

El fallo es de proceso. Un POST al NLB cambia una sola réplica, así que `chaos/chaos-replicas.ps1` entra por `kubectl exec` a cada pod Ready y llama a `127.0.0.1`. Cada ronda usa una activación nueva de 120 s. El token no sale del contenedor. Si una réplica no queda en 503, o si al terminar el enable quedan menos de 80 s, el script apaga las dos y no autoriza k6.

R0 (`hotel503-r0-retry-20261117-004150`) corrió con la resiliencia de Sports apagada. R1 (`hotel503-r1-retry-20261117-011303`) corrió con resiliencia y fallback de Sports encendidos. Esos flags no están en este repositorio. `RESILIENCE_MODE` de Hotel es otro interruptor y no es el que separa estas dos rondas.

Chaos Toolkit (`chaos/experiment-hotel-dependency.json`) queda como experimento declarativo local. El journal `40-chaostoolkit-journal.json` muestra 200, luego 503, `/live` en 200 y recuperación. La corrida OCI se hizo con el script por réplica.

## 4. Radio de impacto

El 503 solo aplica a `/api/v2/habitacion`. `/live` y `/ready` siguen en 200. MySQL no se modifica y Cine puede responder. El radio visible para el usuario es el flujo de Sports: sin habitación, R0 no arma una respuesta completa; en R1 Sports conserva la película y marca la habitación como degradada.

## 5. Métricas

k6 separa completas, parciales y fallidas. Una parcial es HTTP 200 con habitación y película, y además `status=partial`, `degraded=true` u `origenResiliencia=fallback`. La disponibilidad que usa el perfil es `(completas + parciales) / total`. Una parcial no es una completa. También se midieron p95, cobertura del 503 en las dos réplicas y la recuperación a HTTP 200. Los thresholds del script (error menor a 95 %, p95 menor a 15 s) son demasiado amplios para aceptar o rechazar la hipótesis.

## 6. Resultados definitivos

| Ronda | Solicitudes | Completas | Parciales | Fallidas | Disponibilidad | p95 |
|---|---:|---:|---:|---:|---|---:|
| Baseline | 289 | 289 | 0 | 0 | 100 % completa | 312,02 ms |
| R0 | 320 | 0 | 0 | 320 | 0 % | 224,13 ms |
| R1 | 349 | 0 | 349 | 0 | 100 % degradada | 234,60 ms |

La disponibilidad del 100 % en R1 son 349 respuestas parciales con fallback. Hotel no se recuperó durante la carga: las dos réplicas siguieron en 503 y k6 no registró ninguna solicitud completa. El p95 de R1 sube 4,7 % frente a R0 (234,60 ms contra 224,13 ms).

Cobertura de R0, en `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt`: enable de las dos réplicas antes de k6, disable después del fin, TTL todavía vigente y 145 + 175 respuestas 503 con `source=temporal`, que suman las 320 fallidas. Al cerrar, `activo=false`, habitación 200 y `/live` 200.

Cobertura de R1, en `evidencias/seguimiento-4-local/96-r1-retry-cobertura.txt`: el disable de cada réplica ocurrió después del fin de k6 y el TTL no venció durante la carga. Hubo 0 HTTP 200 del `RUN_ID` dentro de k6. Las 18 llamadas que sí llegaron a Hotel fueron 503 temporales. Después del disable, las dos réplicas volvieron a habitación 200 y `/live` 200.

La primera R1 (`hotel503-r1-20261117-010050`, evidencia `95-r1-cobertura.txt`) queda fuera de la tabla. El TTL venció unos 14 a 16 s antes del fin de k6 y Hotel atendió 13 HTTP 200 dentro de la carga. Por eso se repitió.

## 7. Diagnóstico

Los logs de Hotel y las trazas de Tempo explican el resultado. En la traza `68adbcf21b960acf374c54886c56d681` (`96-tempo-68adbcf21b960acf374c54886c56d681.json`) Sports responde HTTP 200, `flujo.status=partial`, `degraded=hotel`, el SERVER de Hotel responde 503 y el SERVER de Cine responde 200. El padre de Hotel y el de Cine son CLIENT de Sports. La traza sana de las tres APIs, sin este fallo, está en `93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`.

Hotel recibió 18 de las 349 solicitudes de R1. Ese hueco es compatible con un circuit breaker de Sports, pero este repositorio no tiene la métrica del breaker. No se afirma que el circuito estuviera abierto.

## 8. Patrones de resiliencia

Los patrones de Hotel protegen MySQL, no el 503 inyectado.

Fail-fast, en `src/config/resilience.ts`, corta la consulta lenta y responde 504. En el laboratorio local con Toxiproxy a 2500 ms, el p95 pasó de 2578,1 ms en R0 a 2004,4 ms en R1, y la tasa de éxito bajó de 100 % a 0 %. Evidencias `50-*`.

Bulkhead limita las consultas concurrentes. Con 24 VU y MySQL a 3000 ms, R1 rechazó 190454 veces, mantuvo `peak_inflight` en 4 y dejó el éxito en 0,03 %. Evidencias `60-*`. Un 504 o un 503 rápido no cuenta como disponibilidad recuperada.

El cambio de R0 a R1 en el flujo lo produce Sports. El fallback se ve en la traza: respuesta parcial, Hotel en 503 y Cine en 200. El circuit breaker no está medido aquí. El código de ambos patrones está en el repositorio de Sports.

## 9. Hallazgos

El 503 sostenido sí tumba el flujo cuando Sports no se protege, y el mismo fallo deja de ser una caída total cuando Sports responde parcial. Hotel, como callee, no mejora esa disponibilidad. La primera R1 enseña que un TTL vencido dentro de k6 contamina la comparación: esas 13 completas fueron habitaciones reales, no fallback. El perfil compartido clasifica bien el parcial solo si el cuerpo trae habitación y película.

## 10. Backlog

Sigue pendiente un chaos gate que ejecute el experimento declarativo y falle el job si el umbral no se cumple. El workflow `.github/workflows/chaos-hotel-manual.yml` valida tests y no inyecta el fallo. Falta el dashboard que muestre a la vez la ventana del 503 y la métrica de parciales, el JSON del baseline, la evidencia de latencia de Jarrison, la evidencia de agotamiento de Daniel y el release del tag de entrega. `v1.1.0` no se mueve: apunta a un commit anterior a estas corridas.

## Uso de IA

Cursor ayudó a revisar logs, trazas y esta redacción. Las cifras salen de `94-r0-retry-cobertura.txt`, `96-r1-retry-cobertura.txt` y de los experimentos locales `50-*` y `60-*`. No se repitió k6 ni se volvió a activar el 503 para escribir el informe.
