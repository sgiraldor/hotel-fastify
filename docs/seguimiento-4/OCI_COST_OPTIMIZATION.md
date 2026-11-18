# Optimización de costos OCI — Hotel API (Seguimiento #4)

**Estado:** estimación y plan. **No se ha aprovisionado nada.**  
**Región verificada:** `sa-bogota-1` (home).  
**Cuotas leídas (solo lectura):** Ampere A1 cores `available=250` / memory `available=1666`; E4 cores `available=100`. Shapes listadas: `VM.Standard.A1.Flex`, `VM.Standard.E4.Flex`, `VM.Standard.E5.Flex`.

Fuentes de precio (oficiales):

- [Oracle Cloud Price List](https://www.oracle.com/cloud/price-list/) — OKE Basic = Free; Flexible Network Load Balancer = Free; Ampere A1 free allowance 3 000 OCPU-h + 18 000 GB-h/mes; outbound SA first 10 TB/mes free.
- [Ampere A1 Compute](https://www.oracle.com/cloud/compute/arm/) — **US$0.01 / OCPU-h** y **US$0.0015 / GB-h** (todas las regiones).
- [OKE Pricing](https://www.oracle.com/cloud/cloud-native/kubernetes-engine/pricing/) — Enhanced control plane **US$0.10 / cluster-h**, tope **US$74.40 / mes**; Basic sin cargo de control plane.
- [Flexible LB blog Oracle](https://blogs.oracle.com/cloud-infrastructure/announcing-oracle-cloud-infrastructure-flexible-load-balancing) — Base **US$0.0113 / h** + bandwidth **US$0.0001 / Mbps-h**; cuentas pagadas: primer LB + primeros 10 Mbps sin cargo.
- Block Volume Performance Units: **US$0.017** por 10 VPUs/GB-mes (balanced) — Price List.
- Precio unitario de **Block Volume Storage (GB-mes)** y **Compute E4 OCPU/Memory**: celdas numéricas **no visibles** en el HTML estático del Price List (render JS). **No inventados aquí.**

Comparación Basic vs Enhanced: para rúbrica académica (Deployment 2 réplicas, caos, evidencia) **Basic es suficiente**. Enhanced aporta SLA financiero, workload identity, virtual nodes, add-ons gestionados — **no necesarios** para este laboratorio → **evitar Enhanced** (ahorra hasta US$0.10/h ≈ US$4.80/48h).

---

## Arquitectura recomendada (mínimo costo razonable)

| Pieza | Elección | Motivo costo / rúbrica |
|---|---|---|
| OKE | **Basic**, VCN-native | Control plane **US$0** |
| Workers | **1 nodo** `VM.Standard.A1.Flex` **2 OCPU / 12 GB** | Cabe en free Ampere (2×24h×2=96 OCPU-h; 12×48=576 GB-h ≪ 3k/18k) |
| DB | **MySQL en Pod + PVC** (no MySQL HeatWave/DB System) | Evita DB managed cara; reproducible en lab |
| Exposición | **Network Load Balancer (NLB)** vía Service | NLB **Free** en Price List; alcanzable desde Sports (AWS) por IP/DNS público |
| Observabilidad | OTLP → collector **compartido** del equipo | Sin Grafana/Prometheus duplicados en OCI |
| NAT Gateway | **No** (worker en subnet pública con NSG estricto) | Evita NAT recurrente |
| Discos extra | Solo boot (~50 GB) + PVC MySQL (~20 GB) | Dentro del cupo Always Free de block (hasta 200 GB) si aplica |
| OCIR | 1 repo `hotel-api` | Storage bajo; imagen ~cientos de MB |

### Capacidad del nodo único

Requests actuales del Deployment Hotel: **2× (100m CPU / 128Mi)** + MySQL (~250m/256Mi estimados) + kube-system.  
Con 2 OCPU / 12 GB hay margen holgado para k6 moderado y caos.

**Limitaciones de resiliencia (1 nodo):**

- Pérdida del nodo = downtime del control de pods (no hay anti-afinidad real multi-nodo).
- Las **2 réplicas** cumplen rúbrica de Deployment, pero **no** alta disponibilidad de infraestructura.
- Chaos Mesh/Litmus tipo `PodChaos` sigue siendo demostrable; `NodeChaos` tumbaría todo el lab.
- Aceptable académicamente si se documenta; opcional fase 2: segundo worker solo si el profesor exige HA de nodos (duplica compute).

### Alternativa más cara (solo si A1/OKE-Basic no sirve)

| Opción | Extra vs recomendada |
|---|---|
| OKE Enhanced | +US$0.10/h (tope US$74.40/mes) |
| Worker E4.Flex 1 OCPU/8 GB | Precio E4 **no confirmado numéricamente** en Price List estático |
| Flexible LB (HTTP) en vez de NLB | Base US$0.0113/h (+ bandwidth); a menudo primer LB gratis en cuentas pagadas |
| MySQL Database Service | **Alto** — no recomendado |
| 2 workers | ~2× compute |

---

## Comparación de exposición a Sports (AWS)

| Método | Costo | Compatibilidad Sports | Notas |
|---|---|---|---|
| **NLB (Service `LoadBalancer` + annotation NLB)** | **US$0** | Alta (TCP 80→3000) | **Recomendado** |
| Flexible LB | US$0.0113/h + Mbps (1.er LB/10 Mbps a menudo free) | Alta (L7) | Solo si se necesita HTTP routing avanzado |
| NodePort + IP pública del nodo | US$0 adicional | Media | Expone nodo; NSG crítico; IP puede cambiar al recrear nodo |
| ClusterIP + túnel | US$0 | Baja para E2E real | Solo demo local |

Recomendación: **NLB gratuito**. Cambiar Service a NLB (manifiesto actualizado en repo).

---

## Presupuesto estimado USD (escenario recomendado)

Supuestos: OKE Basic; 1× A1.Flex 2 OCPU/12 GB; NLB; MySQL en PVC; sin NAT; outbound ≪ 10 TB; observabilidad externa.

### Tarifas usadas

| Componente | Tarifa | Confirmación |
|---|---|---|
| OKE Basic | US$0 / cluster-h | Confirmado Price List |
| Ampere A1 OCPU | US$0.01 / OCPU-h | Confirmado oracle.com/cloud/compute/arm |
| Ampere A1 Memory | US$0.0015 / GB-h | Confirmado misma fuente |
| Ampere free allowance | 3 000 OCPU-h + 18 000 GB-h / mes | Confirmado Price List |
| NLB | US$0 | Confirmado Price List |
| OKE Enhanced (referencia) | US$0.10 / cluster-h | Confirmado OKE pricing page |
| Flexible LB base (referencia) | US$0.0113 / h | Confirmado blog Oracle |
| Block Volume GB-mes (capacidad) | **No confirmado** (celda vacía) | Declarado desconocido |
| E4 OCPU/Memory | **No confirmado** (celda vacía) | Declarado desconocido |

### Costos variables (compute list price sin aplicar free tier)

`2×0.01 + 12×0.0015 =` **US$0.038 / h**

### Costos fijos / cuasi-fijos en la ventana

| Ítem | /h | /día (24h) | /48h |
|---|---:|---:|---:|
| OKE Basic | 0 | 0 | 0 |
| NLB | 0 | 0 | 0 |
| A1 compute (si **agotado** free) | 0.038 | 0.912 | 1.824 |
| A1 compute (dentro free Ampere) | **0** | **0** | **0** |
| Block boot+PVC | ? | ? | ? (probable Always Free ≤200 GB; si no, precio GB-mes no confirmado) |
| OCIR storage | ≈0 | ≈0 | ≈0 (no cuantificado; típicamente despreciable) |
| Outbound SA | 0 | 0 | 0 (≪ 10 TB) |

### Totales estimados — plan recomendado

| Escenario | /hora | /día | /48 h |
|---|---:|---:|---:|
| **A — Free Ampere vigente** (preferido) | **≈ US$0.00** | **≈ US$0.00** | **≈ US$0.00** |
| **B — Free Ampere agotado** (list price A1) | **US$0.038** | **US$0.91** | **US$1.82** |
| **C — B + Enhanced OKE** (no recomendado) | US$0.138 | US$3.31 | US$6.62 |
| **D — B + Flexible LB** (si no hay free LB) | US$0.0493 | US$1.18 | US$2.37 |

**Separación fijo vs variable:**

- **Fijo de plataforma (recomendado):** OKE Basic US$0 + NLB US$0.
- **Variable:** compute A1 (0 dentro free; 0.038/h fuera) + storage no confirmado + tráfico (0 bajo 10 TB).

Incertidumbre principal: si el tenancy aún tiene **crédito Always Free / Ampere free** utilizable para el worker OKE, y el cobro exacto de block volumes fuera de Always Free.

---

## Requests/limits medidos (margen k6)

Mantener Deployment Hotel:

- requests `100m` / `128Mi`
- limits `500m` / `512Mi`
- 2 réplicas → picos ~1 CPU / 1 GiB

MySQL lab: requests `250m`/`256Mi`, limits `500m`/`512Mi`.  
Total pico ≈ 1.5 CPU / 1.5–2 GiB ≪ 2 OCPU / 12 GB.

---

## Apagado / eliminación reproducible (sin ejecutar ahora)

Script documentado: `scripts/oci/teardown-lab.md` + `scripts/oci/teardown-lab.ps1` (modo dry-run por defecto).

Orden seguro al finalizar la demo:

1. Guardar evidencias (`kubectl logs`, `/metrics`, resultados caos) **antes** de borrar.
2. `kubectl delete -f k8s/` (libera LB/NLB y pods).
3. Borrar PVC MySQL solo si no se necesita más datos.
4. Escalar node pool a **0** o eliminar node pool.
5. Eliminar cluster OKE Basic.
6. Eliminar VCN/NSG/subnet **solo** si se crearon exclusivos para el lab.
7. Opcional: borrar imagen OCIR antigua (conservar digest en evidencias).

Conservar: código Git, `evidencias/`, reportes, tag `v1.1.0`.

---

## Autorizaciones requeridas antes de gastar

1. Crear VCN + OKE **Basic** + 1 worker A1 (si no hay lab compartido).
2. Crear repo OCIR + push imagen.
3. Crear NLB vía Service.
4. (Opcional) Segundo nodo / Enhanced / Flexible LB / MySQL managed — **no** en plan base.

**No ejecutar `terraform apply`, `kubectl apply` cloud, ni push OCIR hasta autorización explícita del usuario.**
