# Informe despliegue Hotel en OCI (escenario A/B) — 2026-11-17

## Recursos cloud creados

| Recurso | Detalle |
|--------|---------|
| VCN | `hotel-vcn` (10.20.0.0/16) |
| IGW + route table + security list | mínimos del lab |
| Subnet public/svclb | `10.20.1.0/24` (API endpoint + NLB) |
| Subnet workers | `10.20.2.0/24` (node pool; requerida por OKE) |
| OKE | `hotel-oke` **BASIC_CLUSTER** k8s `v1.36.1` |
| Node pool | `hotel-np-a1` — **1× VM.Standard.A1.Flex 2 OCPU / 12 GB** |
| Boot volume nodo | 50 GiB |
| Block volume PVC | `hotel-mysql-pvc` 20 GiB (`oci-bv`) |
| OCIR | `bog.ocir.io/axtqtuusylqm/hotel-api:1.1.0` (repo público) |
| Network Load Balancer | `default/hotel-api/...` **ACTIVE**, público (anotación `nlb`) |
| Flexible LB | **0** (no creado) |
| MySQL managed | **no** |

## Estado nodos y pods

- Nodo `10.20.2.52`: Ready, arm64, External-IP `157.137.233.183`
- `hotel-api`: 2/2 Ready (réplicas autorizadas)
- `hotel-mysql`: 1/1 Ready
- Probes Hotel: `/live` y `/ready` OK
- Recursos Hotel: req `100m/128Mi`, lim `500m/512Mi`

## URL pública

`http://149.130.165.30`

Sports (AWS) puede acceder por HTTP a esa IP en puerto 80.

## Resultados HTTP reales

| Endpoint | Status | Evidencia |
|----------|--------|-----------|
| `GET /live` | 200 | `28-http-live.txt` |
| `GET /ready` | 200 | `29-http-ready.txt` |
| `GET /api/v2/habitacion/1` | 200 + body sintético habitación 101 | `30-http-habitacion-1.txt` |
| `x-trace-id` | `e71c4d33-81e7-424b-b749-4dd51df3e93a` | header en respuesta |

## Costos previstos (facturables)

| Concepto | Modalidad | Estimación lab |
|----------|-----------|----------------|
| OKE Basic | Free | $0 |
| Worker A1.Flex 2 OCPU / 12 GB | Always Free hasta cupo; luego ~$0.01/OCPU-h + $0.0015/GB-h | Bajo / potencialmente $0 bajo cupo |
| Boot 50 GiB + PVC 20 GiB | Block Volume | Según price list regional |
| NLB | **Free** | $0 |
| Flexible LB | No usado | $0 |
| OCIR storage | Bajo (1 imagen) | Despreciable |
| MySQL managed / Enhanced / NAT / nodos extra | No | $0 |

## Caos

- `CHAOS_DEPENDENCY_DOWN=false` (ConfigMap)
- `CHAOS_LAB_TOKEN` en Secret (interruptor protegido)
- **Sin experimentos destructivos en OCI** en esta ventana

## Desmontaje

Ver `scripts/oci/teardown-lab.md` y `scripts/oci/teardown-lab.ps1` (dry-run por defecto). **No ejecutado.**
