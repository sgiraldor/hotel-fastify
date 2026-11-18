# Verificación — segunda corrida declarativa OCI 2026-11-17 21:48

## Autorización

Segunda ejecución real autorizada. Commit `1b3da02`. Sports y Cine restaurados; sin experimentos concurrentes.

## Preflight (UTC)

`2026-11-18T02:48:27.3521923Z`

- Contexto `context-hotel-oke-cc3levwtx6a`
- Deployment 2/2 Ready
- Pods `glg2z` y `tmqlg`, reinicios 0
- Ambas: `activo=false`, habitación 200, `/live` 200
- NLB 200/200
- Chaos Toolkit 1.21.4 + `oci_replicas_provider`

## Comando (una sola vez)

```powershell
powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1 -RealRun -ConfirmExperiment -DurationSeconds 60 -ObserveSeconds 5 -JournalPath evidencias\seguimiento-4-local\oci-replicas-journal-20261117-214843.json
```

UTC inicio wrapper: `2026-11-18T02:48:43.0430228Z`  
UTC fin wrapper: `2026-11-18T02:49:27.5229924Z`  
Exit code: 0

## Journal auténtico

Archivo: `evidencias/seguimiento-4-local/oci-replicas-journal-20261117-214843.json`  
SHA-256: `85e3efb657ef4982a3bb1b05a99b13a5f17efd2ac65324ce4b32aaf9e07b1bb7`

| Campo | Valor |
|---|---|
| status | `completed` |
| dry | ausente / no dry-run (actividades con duración real y `output: true`) |
| deviated | `false` |
| start | `2026-11-18T02:48:43.850397+00:00` |
| end | `2026-11-18T02:49:23.130790+00:00` |
| duration | 39,28 s |
| steady before | met |
| steady after | met |

### Actividades

| Actividad | status | duración s | output |
|---|---|---:|---|
| enable-both-replicas | succeeded | 4,68 | `true` |
| both-replicas-return-503 (`verify-active`) | succeeded | 4,51 | `true` |
| wait-observation-window | succeeded | 5,06 | process status 0 |
| disable-both-replicas | succeeded | 4,43 | `true` |
| both-replicas-recovered | succeeded | 6,12 | `true` |
| rollback emergency-disable | succeeded | 4,51 | `true` |

`verify-active` solo sale 0 si **ambas** réplicas tienen `temporalActivo`, habitación 503 con `CHAOS_DEPENDENCY_DOWN` y `/live` 200.

## Contadores por pod (antes → después)

| Pod | activations | injections |
|---|---|---|
| `hotel-api-5c4b965cf6-glg2z` | 4 → 5 | 420 → 422 |
| `hotel-api-5c4b965cf6-tmqlg` | 4 → 5 | 202 → 204 |

## Post-check (UTC `2026-11-18T02:49:40.9809395Z`)

| Comprobación | Resultado |
|---|---|
| status ambas | `activo=false`, `temporalActivo=false`, habitación 200, `/live` 200 |
| Deployment | 2/2 Ready |
| Pods | Running 1/1, reinicios 0 |
| NLB `/live` | 200 |
| NLB `/api/v2/habitacion/1` | 200 |

Log: `oci-replicas-run-20261117-214843.txt`  
SHA-256: `0301875513a9c47d1379a7b15d1be06078a24896a5d50f03bdbfc6cd287e4281`

## Conclusión

Ejecución real **PASS**. HTTP 503 demostrado en ambas réplicas por `verify-active` exitoso. Rollback y recuperación **PASS**. No se realizó una tercera corrida.
