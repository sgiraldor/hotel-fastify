# Guía de sustentación

## Precondición de infraestructura

La VM/VCN Exp4 debe permanecer disponible **al menos 9 horas** (planificación típica 12 h) para R0/R1, verificación de evidencias y la sesión oral.

- Checklist operativo: [`17-ventana-oci-vs-ttl-sustentacion.md`](17-ventana-oci-vs-ttl-sustentacion.md)
- Costos 9 h / 12 h: [`13-costos-oci-exp4.md`](13-costos-oci-exp4.md)
- La VM **no** se elimina automáticamente a las 9 h.
- `terraform destroy` **prohibido** hasta autorización **post-sustentación**.

## Guion oral (borrador)

1. Contexto multinube y por qué el lab está aislado de Hotel OCI.
2. Demostrar Compose sin ports públicos y redes internal.
3. Explicar G1/G2 y variables fijas R0/R1.
4. Mostrar events/metrics: RTO obs, commits perdidos, integridad (cuando existan).
5. Separar TTL del experimento (STOP/watchdog) vs vida OCI ≥9 h.
6. Declarar limitaciones: n=1, lab ≠ producción Hotel, sin NetworkPolicy claim.
7. Mostrar STOP/watchdog y que DevOps `v1.2.0` permanece intacto.
8. Confirmar que backups/logs/evidencias se conservaron tras R0/R1.

**Estado actual:** documentación/config preparatoria actualizada a ≥9 h; experimentos **no** ejecutados; OCI **no** desplegado en esta fase.
