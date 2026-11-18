# Hipótesis del experimento

## Hipótesis principal (H1)

Si se aplica una política restrictiva versionada en el punto de control de red (R1), entonces:

- el cliente no autorizado **no** establece conectividad TCP hacia MySQL a través del gateway;
- se genera un evento auditable `connection_denied`;
- la regla de detección produce una alerta correlacionada;
- el cliente legítimo **conserva** conectividad TCP.

## Hipótesis baseline (H0 / R0)

Con política permisiva, el mismo intento no autorizado **sí** establece TCP (salvo fallos ajenos), y la detección/contención existentes pueden ser insuficientes o nulas — medible sin inventar tiempos.

## Mejoras bajo prueba

- **G1**: segmentación efectiva y verificable (deny real del origen `172.30.20.40`).
- **G2**: detección automatizada basada en eventos del gateway, no en el exit code de la sonda.

## Falsabilidad

H1 se falsea si en R1 el no autorizado obtiene `tcp_connected=true`, o si no hay evento/alerta de denegación, o si el legítimo pierde conectividad.
