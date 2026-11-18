# Evidencias publicas (sanitizadas)

Paquete minimo publicable del experimento individual de Defensa en profundidad.

## Importante

- Los **originales** permanecen en `../evidencias/` (locales; excluidos por `.gitignore`).
- Las copias aqui pueden diferir **solo** en rutas absolutas de host Windows, sustituidas por `<REPO_ROOT>` o rutas relativas del paquete.
- **No** se alteraron timestamps UTC, metricas numericas, IDs de correlacion ni resultados experimentales.
- Inventario y SHA256: [SANITIZATION-MANIFEST.json](SANITIZATION-MANIFEST.json).

## Packs

| Pack | Ruta |
|---|---|
| R0 oficial | [r0/r0-20261118T051339Z/](r0/r0-20261118T051339Z/) |
| R1 oficial | [r1/r1-20261118T051805Z/](r1/r1-20261118T051805Z/) |
| R1 parcial | [r1/r1-20261118T051705Z-PARTIAL-ABORT/](r1/r1-20261118T051705Z-PARTIAL-ABORT/) |

## Metricas R1 (n=1)

| Campo | Valor | Interpretacion |
|---|---|---|
| MTTD | 20 ms | t1 - t0 |
| Bloqueo preventivo | 5 ms | t2 - t0 (campo JSON `mttc_ms` = preventivo) |
| MTTC reactivo | no aplica | `containment_reactive=false` |
| Cobertura R0 | 0/1 | sin deny/alerta de ataque |
| Cobertura R1 | 1/1 | deny y alerta correlacionada |

## Auditoria final

Ver [../docs/15-auditoria-final-r0-r1.md](../docs/15-auditoria-final-r0-r1.md).