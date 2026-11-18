# OCI — Exp4 (IaC completa, despliegue NO autorizado aún)

## Estado Fase 9

Terraform bajo `terraform/` declara VCN, subnets, IGW, NAT (modo bastion), route tables, NSG, Compute, Bastion, boot volume size, tags, outputs OCID.

Default: **`enable_exp4_oci=false`**.

## Inventario que se crearía (si enable=true)

Ver `terraform output inventory_ocids` tras un apply futuro. Recursos nominados `seguridad-caos-exp4-*` + tag `experimento=seguridad-caos-exp4`.

## Ventana de vida vs TTL

- Infra OCI: **≥9 h** disponibles para corridas + sustentación (`oci_min_availability_hours`).
- TTL experimento: STOP/watchdog por corrida — **no** apaga la VM.
- Cleanup / `terraform destroy`: solo **post-sustentación** con autorización.
- Ver [17-ventana](../docs/17-ventana-oci-vs-ttl-sustentacion.md).

## Docs

- [13-costos](../docs/13-costos-oci-exp4.md)
- [14-cleanup](../docs/14-runbook-cleanup-oci.md)
- [15-prep-vm](../docs/15-preparacion-vm-exp4.md)
- [08-plan](../docs/08-plan-oci-vm.md)
- [17-ventana](../docs/17-ventana-oci-vs-ttl-sustentacion.md)
