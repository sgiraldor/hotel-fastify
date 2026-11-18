# Verificación — corrida declarativa OCI 2026-11-17 21:35

## Autorización

Sports (Jarrison) y Cine (Daniel) autorizaron la ventana. Preflight de Hotel: contexto `context-hotel-oke-cc3levwtx6a`, 2/2 Ready, interruptor apagado, habitación y `/live` en 200.

## Comando (una sola vez)

```powershell
powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1 -RealRun -ConfirmExperiment -DurationSeconds 60 -ObserveSeconds 5 -JournalPath evidencias\seguimiento-4-local\oci-replicas-journal-20261117-213502.json
```

UTC inicio: `2026-11-18T02:35:02.3208202Z`  
UTC fin wrapper: `2026-11-18T02:35:11.7018931Z`

## Resultado

**NO EXITOSA.** Chaos Toolkit arrancó el experimento real, validó el manifiesto y entró al steady-state. Falló al evaluar la tolerancia regex del probe `both-replicas-healthy` porque el provider `process` de chaostoolkit-lib 1.45.1 devuelve un `dict` `{status, stdout, stderr}` y el regex esperaba un string:

`TypeError: expected string or bytes-like object, got 'dict'`

El method (enable) **no se ejecutó**. Las inyecciones históricas no cambiaron (`activations=4` en ambas; `injections` 420 / 202).

## Journal

La ruta pedida era `evidencias/seguimiento-4-local/oci-replicas-journal-20261117-213502.json`. **No se escribió**: el proceso de Chaos Toolkit abortó con traceback antes de persistir el journal.

Log completo: `evidencias/seguimiento-4-local/oci-replicas-run-20261117-213502.txt`  
SHA-256: `52658cb1f32a8461af74ea45507391a77b4694cc9ac613572b2376054f816318`

## Rollback / seguridad

El wrapper ejecutó el `finally` con `chaos-replicas.ps1 -Action disable` en las dos réplicas. Ambas respondieron `controlStatus=200`, `activo=false`, `temporalActivo=false`, habitación 200, `/live` 200.

## Post-check (solo lectura)

UTC: `2026-11-18T02:35:32.1544426Z`

| Comprobación | Resultado |
|---|---|
| status ambas réplicas | `activo=false`, habitación 200, `/live` 200, exit 0 |
| Deployment | 2/2 Ready |
| Pods | `glg2z` y `tmqlg` Running 1/1, reinicios 0 |
| NLB `/live` | 200 |
| NLB `/api/v2/habitacion/1` | 200 |

## Activación HTTP 503

**No demostrada en esta corrida.** No hubo `verify-active` ni enable.

## Segunda corrida

No se repitió. Hace falta una nueva autorización después de corregir la tolerancia del steady-state (`target: stdout` o `tolerance: 0` sobre el exit code del process provider).
