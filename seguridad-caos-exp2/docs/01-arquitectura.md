# Arquitectura del laboratorio — seguridad-caos-exp2

## Alcance

Laboratorio **Docker Compose local** para el experimento 2 (exposición / segmentación en sentido de lab).  
**No** forma parte de Hotel OCI, Sports AWS, Cine GCP ni de la observabilidad compartida.

> Este laboratorio **no** implementa NetworkPolicy en OKE y **no** significa que el clúster OKE real haya sido endurecido.  
> El hallazgo de Flannel Overlay sin enforcement efectivo en OKE permanece vigente.

## Qué demuestra (precisión H9)

1. **Aislamiento mediante redes Docker** (`internal: true`, tres bridges).
2. **Control de acceso mediante proxy TCP L4** (gateway con política versionada).
3. **Detección mediante eventos del gateway** (detector independiente de la sonda).

## Diagrama lógico

```
[client-legitimate 172.30.30.30] --lab_clients--> [gateway :3306]
                                                    | policy YAML
                                                    | lab_data only
                                                    v
                                                 [mysql 172.30.10.10]
                                                    ^
[client-unauthorized 172.30.20.40] --lab_attacker--> [gateway]
                                                    |
                                                 events/STOP bind: ./runtime/events
                                                    |
                                                 [detector]
```

MySQL **solo** está en `lab_data` con el gateway. Los clientes **no** comparten red con MySQL → no hay bypass L3 hacia datos.

## H1 — Handshake vs acceso MySQL

El gateway hace `accept()` **antes** de evaluar la política. Por tanto:

| Señal | Significado |
|---|---|
| `tcp_connected` | Handshake TCP con el **gateway/proxy** |
| `mysql_greeting_received` | Reenvío efectivo; greeting MySQL visible |
| `access_blocked` | TCP al proxy sin greeting / sin path MySQL |
| `connection_denied` (evento) | Confirmación auditable del deny de reenvío |

**No** se afirma drop de paquetes pre-handshake ni NetworkPolicy.

## Redes

| Red | internal | Miembros |
|---|---|---|
| `lab_data` | true | mysql, gateway |
| `lab_clients` | true | gateway, client-legitimate, detector |
| `lab_attacker` | true | gateway, client-unauthorized |

Egreso a Internet/host bloqueado por `internal: true` en runtime. Las **imágenes deben construirse/pre-pullarse antes** del experimento.
