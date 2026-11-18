Jarrison, el Experimento 4 ya está en GitHub:

https://github.com/sgiraldor/hotel-fastify/tree/feat/defensa-profundidad-oci/entrega-grupal/experimento-4-resiliencia-datos

Rama: `feat/defensa-profundidad-oci`.

R0 y R1 usaron los mismos 16 commits sintéticos y el mismo borrado lógico en `lab_resilience_db`. R0 restauró a mano el backup de los primeros 10: perdió 6 commits, recuperó 10, RPO 3,629 s, RTO 13,056 s. R1, con el backup extra después de los commits 11–13 (G1) y el restore automático con verificación (G2), recuperó 13, perdió 3, RPO 2,209 s y RTO 1,792 s. La pérdida bajó de 6 a 3 commits. Integridad PASS en los dos.

El resumen para el informe grupal está en `docs/RESUMEN-PARA-JARRISON.md`. Es una sola pareja de ejecuciones, no una garantía estadística.

Hotel no se tocó. No hay commit en `main` ni en `v1.2.0`.
