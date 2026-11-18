# Instrumentación alternativa (pre-implementación)

## Evaluación

El punto de control (`gateway`) **sí puede** generar evidencia real de intentos rechazados:

- cierra el socket sin abrir upstream;
- emite `connection_denied` a `events.jsonl` con `event_id`, `src_ip`, `policy_id` y timestamp UTC.

Por tanto **no fue necesario** sustituir el diseño antes de implementarlo.

## Alternativa reservada (si el proxy no pudiera auditar denegaciones)

Si en un entorno futuro el control de red (p. ej. iptables/nftables sin LOG, o CNI sin audit) no emitiera eventos de drop:

1. Habilitar logging de paquetes DROP en el plano de red del lab (`LOG`/`NFLOG` → consumidor).
2. O un sidecar `tcpdump` filtrado solo en la interfaz del gateway, parseado a JSONL.
3. Correlacionar por `src_ip` + ventana temporal con la inyección de la sonda — **sin** usar el exit code de la sonda como única prueba de detección.

Esta alternativa permanece documentada; la implementación activa usa eventos nativos del gateway.
