# Security Lists Exp4 — reglas exactas

## Principio

- Cada subnet Exp4 declara `security_list_ids = [sl_propia]`.
- **No** se usa la Default Security List.
- **No** se modifica ninguna Default SL de Hotel ni de VCN ajenas.
- OCI no soporta DENY en SL: ausencia de ALLOW = denegado.
- NSG + SL: el tráfico se permite si **alguna** de las dos lo autoriza; por eso la SL no puede ser permisiva.

## `seguridad-caos-exp4-sl-private`

| Dirección | Proto | Origen/Destino | Puertos | Motivo |
|---|---|---|---|---|
| Ingress | ICMP | 0.0.0.0/0 | type 3 code 4 | PMTUD |
| Ingress | TCP | `vcn_cidr` (10.31.0.0/16) | 22 | SSH vía Bastion/VCN |
| Egress | TCP | 0.0.0.0/0 | 443 | Docker/yum HTTPS |
| Egress | TCP | 0.0.0.0/0 | 80 | redirects HTTP |
| Egress | UDP | 0.0.0.0/0 | 53 | DNS |
| Egress | TCP | 0.0.0.0/0 | 53 | DNS |
| Egress | ICMP | 0.0.0.0/0 | type 3 code 4 | PMTUD |

Sin 3306. Sin SSH desde Internet.

## `seguridad-caos-exp4-sl-public`

| Dirección | Proto | Origen/Destino | Puertos | Motivo |
|---|---|---|---|---|
| Ingress | ICMP | 0.0.0.0/0 | type 3 code 4 | PMTUD |
| Ingress | TCP | `ssh_authorized_cidr` | 22 | **Solo** si `access_mode=restricted_public` |
| Egress | TCP/UDP | 0.0.0.0/0 | 80,443,53 | Paquetes/DNS |

En modo `bastion`, la subnet pública **no** abre SSH (la VM no vive ahí).
