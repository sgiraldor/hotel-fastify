# Experimento declarativo — Indisponibilidad de Hotel

Herramienta elegida: **Chaos Toolkit** (simple, reproducible, sin instalar operadores en el cluster).

Complementa el **interruptor propio** (`CHAOS_DEPENDENCY_DOWN` / API `/api/v2/chaos/dependency`).

## Hipótesis (falsable)

> Mientras el caos está activo, `GET /api/v2/habitacion/:id` responde **503**, `/live` sigue en **200**, y al desactivar el interruptor el endpoint de habitación **recupera 200**.

| Campo | Valor |
|---|---|
| Métrica objetivo | Tasa de 503 en contrato V2 / disponibilidad `/live` |
| Umbral steady-state | HTTP 200 en habitación y live |
| Instrumento | Chaos Toolkit HTTP probes + `/metrics` |
| Ventana observación | 30 s (configurable) |
| Intensidad | 100% de requests al path V2 durante la ventana |
| Blast radius | Solo Hotel API (lab token requerido) |
| Abort/rollback | `rollbacks` desactiva caos; script `revert` |

## Prerrequisitos

```bash
# Entorno aislado (recomendado)
python -m venv .venv-chaos
.\.venv-chaos\Scripts\python -m pip install chaostoolkit chaostoolkit-lib

# Hotel corriendo en HOTEL_BASE_URL
$env:HOTEL_BASE_URL="http://127.0.0.1:3000"
$env:CHAOS_LAB_TOKEN="tu-token-laboratorio"
$env:HOTEL_HABITACION_ID="1"
```

Notas Chaos Toolkit:
- El body JSON del POST va en `provider.arguments` con header `Content-Type: application/json`.
- Las tolerancias HTTP solo se evalúan en *steady-state*; las aserciones 503 del *method* usan probe `process`.

## Ejecutar

```bash
# Windows PowerShell (usa .venv-chaos y guarda journal)
./chaos/run-experiment.ps1

# o manual
.\.venv-chaos\Scripts\chaos.exe run --journal-path evidencias/seguimiento-4-local/40-chaostoolkit-journal.json chaos/experiment-hotel-dependency.json
```

## Revertir (un solo proceso local)

```bash
./chaos/revert-chaos.ps1
# o
curl -X POST "$HOTEL_BASE_URL/api/v2/chaos/dependency" \
  -H "x-chaos-token: $CHAOS_LAB_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"action\":\"disable\"}"
```

## Dos réplicas en OCI (declarativo)

El temporizador es por proceso. El NLB no alcanza los dos pods. Chaos Toolkit orquesta el mismo mecanismo por pod, sin duplicar la inyección:

`experiment-hotel-oci-replicas.json` → `oci_replicas_provider.py` → `replicas-toolkit.ps1` → `chaos-replicas.ps1` → `pod-switch.js` dentro de cada réplica.

El provider Python lanza `ActivityFailed` si el script sale distinto de 0. El provider `process` de chaostoolkit-lib 1.45.1 solo avisa ante exit ≠ 0 y no basta para fallar el method.

| Paso | Qué hace |
|---|---|
| Steady-state | `status` en las dos: habitación 200 y `/live` 200. Tolerancia `true` (el provider devuelve `True` o lanza) |
| Method enable | Exige `CHAOS_OCI_CONFIRM=YES`, TTL 1–300 s |
| verify-active | GET en cada pod: 503 + `/live` 200 |
| disable + recovery | Apaga las dos y vuelve a exigir 200 |
| rollbacks | Vuelve a llamar `disable` en ambas. El wrapper también hace `disable` en `finally` |

```powershell
# Solo lectura / dry-run. NO activa el 503. No demuestra ejecución real en OCI.
powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1

# Ejecución real (solo con autorización). NO correr hasta que se autorice.
# powershell -NoProfile -File .\chaos\run-oci-replicas-experiment.ps1 -RealRun -ConfirmExperiment -DurationSeconds 60

# Parada de emergencia
powershell -NoProfile -File .\chaos\chaos-replicas.ps1 -Action disable
```

El experimento local `experiment-hotel-dependency.json` sigue siendo de un solo proceso (`127.0.0.1` o NLB). No lo uses para afirmar cobertura de las dos réplicas.

Procedimiento histórico de Baseline/R0/R1: [`docs/seguimiento-4/RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](../docs/seguimiento-4/RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).

## Chaos gate en GitHub Actions

El workflow `.github/workflows/chaos-hotel-manual.yml` levanta Hotel y MySQL solo dentro del runner y ejecuta Chaos Toolkit contra `http://127.0.0.1:3000`. La inyección dura como máximo 15 s. El evaluador exige tres cosas: todas las sondas de habitación en 503, `/live` en 200 y la habitación de vuelta a 200 en 5 s o menos. Si una falla, el log lleva `CAUSA:` y el job termina en 1. El `disable` y `docker compose down` corren aunque el job falle. El token temporal no se guarda.

`chaos/GATE_MODE` elige la corrida al hacer push de ese archivo: `negative` no inyecta el 503 y debe quedar roja; `positive` inyecta y debe quedar verde.

| Corrida | URL | Resultado | 503 | /live | Recuperación |
|---|---|---|---|---|---|
| Negativa | https://github.com/sgiraldor/hotel-fastify/actions/runs/44189190442 | roja | 0 (3/3 en 200) | 1 | 0,063 s |
| Positiva | https://github.com/sgiraldor/hotel-fastify/actions/runs/44189597682 | verde | 1 (3/3 en 503) | 1 | 0,067 s |

En las dos, el `disable` respondió 200, la habitación y `/live` quedaron en 200 y `compose_down=0`. Los artefactos revisados están en `evidencias/chaos-gate/44189190442` y `evidencias/chaos-gate/44189597682`. La causa de la corrida roja fue `CAUSA: habitacion_503_rate=0 umbral=1`. El registro está en `evidencias/chaos-gate/acciones.txt`.

## No ejecutar en OCI compartida sin autorización

Este experimento es seguro localmente y en el runner. Contra OKE solo con permiso del equipo, y el gate no lo hace.
