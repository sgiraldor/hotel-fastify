# Costos y límites documentales — Exp4 OCI

**Terraform NO controla el presupuesto.** El watchdog del lab **NO** termina VMs OCI ni garantiza tope de facturación. **No hay auto-destroy** al cumplirse 9h ni 12h.

## Dos relojes (no confundir)

| Reloj | Qué limita | Valor típico | ¿Destruye la VM? |
|---|---|---|---|
| **TTL del experimento** | R0/R1, fault, restore, caos (`MaxMinutes` / `experiment_deadline.json` → STOP/watchdog) | p.ej. 30 min por corrida | **No** |
| **Vida de la infraestructura OCI** | Disponibilidad VM/VCN/Bastion/NAT para corridas + evidencias + sustentación | **mín. 9 h** (planificación **12 h**) | **No** automáticamente |

Cleanup / `terraform destroy` solo con **autorización expresa posterior a la sustentación** (`docs/12-cleanup-oci.md`, `docs/14-runbook-cleanup-oci.md`).

## Always Free vs cuota de servicio

| Concepto | Valor relevante Exp4 |
|---|---|
| Home region (tenancy) | `sa-bogota-1` (lectura OCI; sin publicar OCID) |
| Always Free Block/Boot | **200 GB** combinados en home region |
| Consumo block leído | **used 100 GB** / cuota servicio disponible alta |
| Boot Exp4 propuesto | **50 GB** → cabe en headroom Always Free *si* elegible |
| Cuota ≠ Always Free | La cuota de servicio **no** implica gratuidad |

Hotel ya usa ~2 OCPU A1: el cupo Always Free Ampere puede estar **agotado**. Un A1 Exp4 puede facturarse a list price aunque el boot quede en Always Free.

## Tarifas de referencia (list / docs Oracle)

| Recurso | Precio de referencia |
|---|---|
| VM A1.Flex 1 OCPU / 6 GB | US$0.01/OCPU-h + US$0.0015/GB-h ≈ **US$0.019/h** si Ampere free agotado |
| Boot 50 GB | Always Free si ≤200 GB home; si pago ≈ US$0.0425/GB-mes (storage+VPU balanced) → pro-rata |
| Bastion | **Free** |
| NAT Gateway | **Sin cargo horario**; tráfico = egreso internet |
| IGW / VCN / NSG / SL | Sin cargo típico de infra VCN |
| IP pública (solo `restricted_public`) | Posible cargo; preferir modo bastion |
| Egreso internet | Primeros **10 TB/mes** free |

## Estimación para 9 h y 12 h (modo bastion, A1 1/6)

Escenario **pesimista de compute** (Ampere Always Free agotado). Boot: línea Always Free (US$0) y línea pago pro-rata.

Fórmulas usadas:

- Compute: `0.019 USD/h × horas`
- Boot pago: `50 × 0.0425 × (horas / 730)` USD (730 h ≈ mes)
- Bastion + NAT horario: US$0
- Transferencias lab (pull imágenes, apt): se asumen **≪ 10 TB** → US$0 de egreso en esta estimación

| Concepto | 9 horas | 12 horas |
|---|---|---|
| Compute A1 (list) | **≈ US$0.171** | **≈ US$0.228** |
| Boot Always Free (si elegible) | ≈ US$0 | ≈ US$0 |
| Boot pago (si no elegible) | ≈ US$0.026 | ≈ US$0.035 |
| Bastion | US$0 | US$0 |
| NAT (horario) | US$0 | US$0 |
| Egreso (asumido dentro de 10 TB) | US$0 | US$0 |
| **Total estimado (boot free)** | **≈ US$0.17** | **≈ US$0.23** |
| **Total estimado (boot pago)** | **≈ US$0.20** | **≈ US$0.26** |

Modo `restricted_public`: sumar IP pública (no cuantificada aquí) y mantener el mismo compute.

## Presupuesto documental

- El valor histórico **USD 5** **no** se declara suficiente automáticamente.
- Con las tarifas list anteriores, 9–12 h de Exp4 (bastion) parecen **caber** bajo US$5 **solo** si: A1/boot/egress se comportan como arriba, no hay recursos huérfanos, y no se extiende la vida OCI sin control.
- `budget_note_usd` default = **0** (no certificado). Certificar el día D tras leer Always Free real y capacidad A1.
- Terraform / watchdog **no** cortan gasto.

## Cancelar o no desplegar si

- A1 sin capacidad y E4 no autorizado.
- SSH quedaría abierto a Internet.
- Always Free de block agotado y el costo boot+compute del día D supera lo autorizado por el grupo.
- No hay plan de cleanup post-sustentación con autorización explícita.
