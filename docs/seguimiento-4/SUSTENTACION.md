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
| Latencia de Sports | Experimento distinto del 503 y del de Cine. Baseline 273 completas, R0 113 completas, R1 273 parciales. El 100 % de R1 es degradado, no completo. El paquete original no trae el inicio ni el fin exactos de k6. No afirmar el circuit breaker |
| Cine | Saturación de concurrencia, no CPU ni memoria. Serie 75 s: 264, 186 y 186 completas; p95 481,74 / 715,09 / 696,51 ms. La baja de 2,6 % no se atribuye a los patrones. GKE v2 baja el RPS de 29,97 a 27,87. Bulkhead y admission solo en sondas aparte. Chaos Toolkit real: journal `completed`, start 202 y rollback 200. `appliedCount=0` en la activación; no es la prueba de carga |
| Chaos gate | Corrió en el runner. La negativa 44189190442 quedó roja y la positiva 44189597682 quedó verde. Los artefactos revisados están en `evidencias/chaos-gate/` |
| Grafana | `http://127.0.0.1:3001/d/experimento-a-503`, ventana 00:40 a 01:20 -05. Capturas `98-grafana-experimento-a-*.png`. k6 está marcado como archivo |
| Baseline 289 | JSON original `baseline-hotel503-baseline-20261117-003033.json`: 289/289, 0 parciales, 0 fallidas, p95 312,02064 ms |

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
