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

## Revertir

```bash
./chaos/revert-chaos.ps1
# o
curl -X POST "$HOTEL_BASE_URL/api/v2/chaos/dependency" \
  -H "x-chaos-token: $CHAOS_LAB_TOKEN" \
  -H "content-type: application/json" \
  -d "{\"action\":\"disable\"}"
```

## No ejecutar en OCI compartida sin autorización

Este experimento es seguro localmente. Contra OKE/producción académica solo con permiso del equipo.
