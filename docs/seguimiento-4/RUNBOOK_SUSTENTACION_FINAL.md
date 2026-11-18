# Runbook de sustentación — Hotel

PowerShell, en la raíz del repositorio `hotel-fastify`, rama `feat/seguimiento-4-chaos`.

Hay dos clases de pasos. Los de lectura no encienden el fallo. Los de inyección sí lo encienden y solo se usan si el profesor pide ver el 503 en vivo. Esta preparación no los ejecutó.

Si la nube no responde, salta a la sección de evidencias históricas. No interpretes un error de conexión como un Hotel sano.

## 0. Qué decir en una frase

Hotel es la dependencia síncrona de Sports. El fallo es un HTTP 503 en `GET /api/v2/habitacion/:id` durante toda la ventana de k6, en las dos réplicas. Sin resiliencia de Sports, las 320 solicitudes de R0 fallan. Con el fallback de Sports, las 349 de la R1 definitiva son parciales y ninguna es completa. Fail-fast y bulkhead de Hotel no fabrican esa habitación.

## 1. Solo lectura — contexto

Resultado esperado: la rama es `feat/seguimiento-4-chaos` y el tag `v1.1.0` sigue en `b66c2f5bdf2d5174903c4351ee5b720db389e521`.

```powershell
git rev-parse --abbrev-ref HEAD
git rev-parse v1.1.0
git log -1 --oneline
```

Si `git` falla, abre el repositorio en GitHub y muestra el mismo tag. No cambies de rama durante la exposición.

## 2. Solo lectura — Hotel en OCI

Resultado esperado: dos pods `Running` y `Ready`, sin reinicios nuevos. El preflight del `2026-11-18T01:21:51.406Z` ya dejó ese estado en `evidencias/seguimiento-4-local/99-hotel-oci-preflight-daniel.txt`.

```powershell
kubectl config current-context
kubectl get deployment hotel-api -n default
kubectl get pods -n default -l app=hotel-api
```

Si `kubectl` no conecta, di que el clúster no se pudo leer en ese momento y pasa a las evidencias. No declares el servicio sano.

Consulta del interruptor, sin activarlo. El script usa `GET` dentro de cada pod. El token no sale en el JSON.

```powershell
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action status
```

Resultado esperado en un Hotel listo: `activo=false`, `temporalActivo=false`, `habitacionStatus=200` y `liveStatus=200` en `glg2z` y en `tmqlg`. Los contadores `activations` e `injections` son históricos. No significan que el fallo esté encendido.

Comprobación por el balanceador, que es la ruta que usa Sports:

```powershell
(Invoke-WebRequest -Uri http://149.130.165.30/live -UseBasicParsing -TimeoutSec 15).StatusCode
(Invoke-WebRequest -Uri http://149.130.165.30/api/v2/habitacion/1 -UseBasicParsing -TimeoutSec 15).StatusCode
```

Resultado esperado: 200 y 200. Un timeout es un fallo de conexión, no un 200.

## 3. Solo lectura — flujo y traza

El flujo sano ya está archivado. Ábrelo y muestra un mismo Trace ID en Sports, Hotel y Cine:

`evidencias/seguimiento-4-local/93-tempo-4f8140a18fbaa1f98caaa8990d14341c.json`

La traza del 503, con Sports en parcial, Hotel en 503 y Cine en 200:

`evidencias/seguimiento-4-local/96-tempo-68adbcf21b960acf374c54886c56d681.json`

Frase: el fallback es de Sports. Hotel siguió caído. Cine respondió.

Si Tempo está accesible, el port-forward es de solo lectura:

```powershell
kubectl -n observability port-forward svc/grafana 3001:3000
```

Luego, en el navegador:

- `http://127.0.0.1:3001/d/seguimiento-4-multicloud`
- `http://127.0.0.1:3001/d/experimento-a-503`

La ventana del 503 es 00:40 a 01:20, hora de Bogotá, del 17 de noviembre de 2026. Las cifras 289, 320 y 349 son archivo de k6, no una serie de Prometheus. `hotel_chaos_active` y `hotel_chaos_503_total` sí salen de Prometheus. Si el panel todavía dice que el JSON del baseline no está en el repo, corrige en voz: el archivo es `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`. El texto versionado ya lo cita. Esta pasada no republicó el dashboard.

Si el port-forward falla, muestra las capturas `evidencias/seguimiento-4-local/98-grafana-experimento-a-k6.png`, `98-grafana-experimento-a-series.png` y `98-grafana-experimento-a-contador.png`.

## 4. Solo lectura — experimento declarativo

Hay dos archivos. No los mezcles.

| Archivo | Alcance |
|---|---|
| `chaos/experiment-hotel-dependency.json` | Un solo proceso (`127.0.0.1` o NLB). Journal histórico `40-chaostoolkit-journal.json` |
| `chaos/experiment-hotel-oci-replicas.json` | Las dos réplicas OCI. Chaos Toolkit llama a `replicas-toolkit.ps1`, que reutiliza `chaos-replicas.ps1` |

Dry-run seguro. No activa el 503. No demuestra ejecución real en OCI:

```powershell
powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1
```

Resultado esperado: `chaos validate` en verde y `chaos run --dry activities` sin llamar al interruptor.

Corrida real válida: `2026-11-18T02:48:43Z`. Journal `evidencias/seguimiento-4-local/oci-replicas-journal-20261117-214843.json`. Enable + `verify-active` (503 en ambas con `/live` 200) + disable + recovery. Verificación `oci-replicas-run-20261117-214843-VERIFICACION.md`. El primer intento `213502` falló antes del enable y no cuenta como inyección.

El Chaos Gate del runner también es Chaos Toolkit, contra `127.0.0.1` dentro de GitHub Actions, no contra OCI:

- Negativa, debe fallar: https://github.com/sgiraldor/hotel-fastify/actions/runs/44189190442
- Positiva, debe pasar: https://github.com/sgiraldor/hotel-fastify/actions/runs/44189597682

Artefactos en `evidencias/chaos-gate/44189190442` y `evidencias/chaos-gate/44189597682`.

## 5. Inyección — solo si se pide en vivo

No la ejecutes al abrir el runbook. Pide confirmación en voz. TTL 60 s, bajo el máximo de 300 s de la API.

Protección: hace falta `-RealRun` y `-ConfirmExperiment`. El adaptador exige `CHAOS_OCI_CONFIRM=YES`. Si una réplica no queda en 503 con `/live` 200, `chaos-replicas.ps1` apaga las dos y sale en 1. Chaos Toolkit corre con `--rollback-strategy always`. El wrapper vuelve a llamar `disable` en `finally`.

Comando de sustentación. No lo corras hasta que el profesor lo pida:

```powershell
powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1 -RealRun -ConfirmExperiment -DurationSeconds 60
```

Resultado esperado: steady-state 200 en ambas, enable en ambas, `verify-active` con 503 y `/live` 200, disable, recovery 200 en ambas. El journal queda bajo `evidencias/seguimiento-4-local/oci-replicas-journal-*.json`.

Alternativa directa, sin Chaos Toolkit, si solo quieren ver el script:

```powershell
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action enable -DurationSeconds 60 -ConfirmExperiment -SkipK6WindowGate
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action verify-active
```

## 6. Reversión — obligatoria después de la inyección

Parada de emergencia (siempre válida):

```powershell
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action disable
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action status
```

Resultado esperado: `activo=false` en las dos, habitación 200 y `/live` 200. Repite los dos `Invoke-WebRequest` del balanceador. También deben volver a 200.

Si `disable` falla en un pod, no borres el Deployment. El temporizador de esa réplica caduca solo, como máximo a los 60 s de esta demostración y nunca por encima de 300 s. Vuelve a correr `status` hasta ver `activo=false`. Si `kubectl` se cae a mitad de la inyección, espera el TTL y no lances k6.

No uses `revert-chaos.ps1` contra el NLB: solo apaga un proceso.

## 7. Si algo falla

| Síntoma | Qué hacer |
|---|---|
| `kubectl` no conecta | No declares el clúster sano. Muestra el preflight y las evidencias `94-*` y `96-*` |
| `status` devuelve 401 | El token del pod no coincidió. No reintentes con un token escrito en pantalla |
| Solo una réplica queda en 503 | El script debe apagar las dos. Corre `disable` y luego `status` |
| El NLB da 503 y una réplica sigue en 200 | El POST pegó en un solo pod. Usa el disable del script, no un POST suelto al NLB |
| Grafana no abre | Muestra las tres capturas `98-grafana-experimento-a-*.png` |
| Tempo no busca | Abre los JSON de traza ya guardados |

## 8. Evidencias históricas si no hay infraestructura

| Qué pide el profesor | Archivo |
|---|---|
| Baseline 289, p95 312,02 ms | `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json` |
| R0, 320 fallidas | `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt` |
| R1 definitiva, 349 parciales | `evidencias/seguimiento-4-local/96-r1-retry-cobertura.txt` |
| Primera R1, descartada | `evidencias/seguimiento-4-local/95-r1-cobertura.txt` |
| Traza del parcial | `evidencias/seguimiento-4-local/96-tempo-68adbcf21b960acf374c54886c56d681.json` |
| Chaos Toolkit local | `evidencias/seguimiento-4-local/40-chaostoolkit-journal.json` |
| Patrones locales | `50-*` y `60-*` en la misma carpeta |
| Sports y Cine | `evidencias/seguimiento-4-intercloud/` y `evidencias/seguimiento-4-cine/` |

No mezcles las cifras. Hotel es 289, 320 y 349. Sports es 273, 113 y 273 parciales. Cine, en la serie de 75 s, es 264, 186 y 186. GKE v2 de Cine es otra serie, en RPS. El journal real de Cine activó el interruptor y lo revirtió. Al activar, `appliedCount=0`.
