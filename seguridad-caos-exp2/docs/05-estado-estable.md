# Estado estable

1. `policy/active.yaml` = R0.
2. Sin flag `runtime/events/STOP` salvo parada deliberada.
3. Cliente legítimo con path MySQL vía gateway cuando el lab esté arriba.
4. Servicios del proyecto `seguridad-caos-exp2` detenidos tras rollback (`compose stop`).
5. Evidencias preservadas en `evidencias/` y `runtime/`.

Fase 2: estado estable de **código**; runtime no levantado.
