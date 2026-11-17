# Guía breve de sustentación — Hotel (Samuel)

Mostrar evidencia ya recogida. No repetir k6 ni volver a activar el 503.

## Qué demostrar (5–7 min)

1. **Contrato OCI.** `GET http://149.130.165.30/api/v2/habitacion/1` responde 200 y devuelve `x-trace-id` cuando el interruptor está apagado.
2. **Traza sana.** Tempo, trace `4f8140a18fbaa1f98caaa8990d14341c`, con SERVER de `sports-api`, `hotel-api` y `cine-api`. Respaldo: `evidencias/seguimiento-4-local/93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`.
3. **R0.** 320 fallidas, disponibilidad 0 %, p95 224,13 ms. Las dos réplicas estuvieron en 503 desde antes de k6 hasta después del fin. Archivo: `94-r0-retry-cobertura.txt`.
4. **R1 definitiva.** 349 parciales, 0 fallidas, p95 234,60 ms. Ese 100 % es disponibilidad degradada: Hotel no volvió a 200 durante la carga. Archivo: `96-r1-retry-cobertura.txt`.
5. **Traza del fallo.** `68adbcf21b960acf374c54886c56d681`: Sports HTTP 200, `flujo.status=partial`, Hotel 503, Cine 200. El fallback es de Sports. Fail-fast y bulkhead de Hotel se muestran con los experimentos locales B y C, y no explican este cambio.
6. **Recuperación.** Tras el disable, las dos réplicas quedaron con `activo=false`, habitación 200 y `/live` 200. El disable de R1 fue posterior al fin de k6; el TTL no cortó la ventana.
7. **Chaos Toolkit local**, si hace falta el experimento declarativo: steady 200, 503, `/live` 200 y recovery 200 (`40-chaostoolkit-journal.json`). La inyección OCI fue por réplica, porque un POST al NLB cambia un solo proceso.

Decir en voz alta que la primera R1 se descartó: el TTL venció dentro de k6 (`95-r1-cobertura.txt`). No usar sus 13 completas.

## Cómo contar la cobertura

En R0 el enable de `glg2z` y `tmqlg` es anterior al inicio, el disable es posterior al fin y los 503 del run suman 320. En R1 el disable también es posterior al fin, el TTL seguía vivo y no hubo HTTP 200 del `RUN_ID` durante k6. Hotel solo vio 18 de 349 solicitudes. Eso puede deberse a un circuit breaker de Sports; no hay métrica del breaker en este repositorio, así que se presenta como observación y no como medición cerrada.

## Qué no afirmar

| Hecho | Cómo decirlo |
|---|---|
| R1 disponibilidad 100 % | Son 349 parciales. Cero completas. Hotel siguió caído |
| Fail-fast y bulkhead | Aíslan MySQL en local. B baja el p95 y también el éxito. C rechaza 190454 veces. No causan el parcial de R1 |
| Circuit breaker | Compatible con 18 llegadas frente a 349 solicitudes. Falta la métrica de Sports |
| Latencia de Sports y agotamiento de Cine | No están evidenciados en este repo |
| Chaos gate | El workflow existe y no ejecuta el experimento |
| Grafana | Falta la captura con la ventana del 503 y la métrica de parciales |
| Baseline 289 | Es la cifra definitiva del grupo. Su JSON de k6 no está archivado |

## Comandos de lectura

```powershell
# Chaos Toolkit local. No toca OCI.
$env:HOTEL_BASE_URL="http://127.0.0.1:3000"
$env:CHAOS_LAB_TOKEN="..."
.\chaos\run-experiment.ps1

# OCI, solo lectura
curl.exe -sS -i http://149.130.165.30/live
curl.exe -sS -i -H "x-trace-id: demo" http://149.130.165.30/api/v2/habitacion/1
./chaos/chaos-replicas.ps1 -Action status
```

`status` no activa el fallo. `enable` exige `-ConfirmExperiment` y no se usa en la sustentación.

## Evidencias

| Prefijo | Contenido | Ámbito |
|---|---|---|
| `94-r0-retry-cobertura.txt` | R0 definitiva, 503 cubierto | OCI + Sports |
| `96-r1-retry-cobertura.txt` | R1 definitiva, 503 cubierto | OCI + Sports |
| `96-tempo-68adbcf21b960acf374c54886c56d681.json` | Parcial, Hotel 503, Cine 200 | Tempo |
| `95-r1-cobertura.txt` | Primera R1, descartada | OCI + Sports |
| `93-*` | Traza sana de las tres APIs | Tempo |
| `40-*` | Chaos Toolkit | Local |
| `42-*` | k6 del callee, R0 y R1 en 100 % de error | Local |
| `50-*` | Fail-fast con MySQL lenta | Local |
| `60-*` | Bulkhead a 24 VU | Local |

El procedimiento que se usó está en `RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`. El informe corto está en `INFORME_SAMUEL_6P.md`.
