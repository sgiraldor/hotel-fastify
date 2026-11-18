# Origen de las copias

Repositorio: https://github.com/Danielg2004/cine_dvps
Release: https://github.com/Danielg2004/cine_dvps/releases/tag/v5.1.0
Chaos Gate: https://github.com/Danielg2004/cine_dvps/actions/runs/44207033513

El tag anotado `v5.1.0` (`32a2beb0bca50ae6cb3c91b191642685cdfffdfa`) apunta al commit `d9c41a3fbc68b77223495d3ecb602229a3345e03`, mensaje `feat: integrar ingeniería del caos, resiliencia y observabilidad multicloud en Cine`, fecha `2026-11-17T23:14:01Z`. Ese commit está en la historia de `main`. La rama `seguimiento-4-caos-daniel` está en `0078e5f9232960684b67910e5da9dcb7b07a8be0` y diverge de ese tag. `main` al consultar era `b79ef990ebcf2492f95f86d0f832a3448e017a3c`, tres commits después del tag, y es el commit del Chaos Gate.

Los JSON de sondas y de k6 GKE v2 tienen los mismos valores en el tag y en `main`. Aquí se guarda la copia UTF-8 de `main`, que es la que evaluó el gate. `multicloud-75s-series.json` y `CHAOS_GATE_CONTRATO.md` no están en el tag. El workflow del gate no se copió: contiene la contraseña de MySQL de prueba.

No se modificó el repositorio de Daniel.

- `CIERRE_EXPERIMENTO_CAOS.md` commit `d9c41a3fbc68b77223495d3ecb602229a3345e03` SHA-256 `bdde6508fb37cbab2ee4e5cf33cd856ea2d6720dfb66a2032f4e2944c4076c11`
- `PROTOCOLO_MULTICLOUD_SATURACION.md` commit `d9c41a3fbc68b77223495d3ecb602229a3345e03` SHA-256 `b0e72e82824eb49abbbcaec026b51c39f599b04f73c922803f9214cdc90ebbfe`
- `MULTICLOUD_75S_SERIES.md` commit `d9c41a3fbc68b77223495d3ecb602229a3345e03` SHA-256 `d0f40b9976bb670b574ecac2b43bf78a2e99bf8372e51357c0e9aba4b708f4d6`
- `experiment.yaml` del tag `d9c41a3` quedó reemplazado. SHA-256 anterior `29afe943b6e272fbb213f96a789125b73eb70da4a57a5472933f50bfd2d6c9f2`.
- `cine-resource-exhaustion.json` del tag `d9c41a3` quedó reemplazado. SHA-256 anterior `602d7ac58ee55e4e94474e3f8560118dc21941f7ea5bb80062bfacb8d507eea1`.

## Corrección declarativa posterior

PR https://github.com/Danielg2004/cine_dvps/pull/5. El último commit de contenido es `b8a93bc03c6edffcd069a6e72dd7523d9ccd5d04` (`2026-11-18T01:11:11Z`). No hay otro commit de contenido después. El squash en `main` es `9f8620e8043f523bcea867bb1d97700bc140218b` y publica los mismos blobs de estos archivos. `requirements.txt` no cambió en ese PR: es el mismo archivo que ya estaba en `b79ef990`.

- `experiment.yaml` SHA-256 `d04168bb9dab172773491e4bfd08a9ca7da379e2aa4d832afcd350f43077323d`
- `cine-resource-exhaustion.json` SHA-256 `67dc3275334f8fbd59fe2243102dfbf2a2b0bc48d5e26494a27576a1b25eff50`
- `requirements.txt` SHA-256 `9f10b71c1d04e3ef3e40c28c9cf8a412212ec4d3df07a5e1c7322c231ffe2fa2`
- `run-chaos-toolkit.ps1` SHA-256 `9f568bdd7bc5fe9a072285e2c5c5930f0dcca30a312af32cfcd8487abb155293`
- `CHAOS_TOOLKIT_VALIDACION.md` SHA-256 `a7ba3defebf8abaec811a2f196682ae38a9212f1788f91d04656d85e6104e3f7`
- `chaos-toolkit-dry-run-journal.json` SHA-256 `51e8e824f06e39d3775d1c8fa3dc53a88e977a9eb803e7d0101f414d7fbfce1e`

## Corrida real posterior

PR https://github.com/Danielg2004/cine_dvps/pull/6. Merge commit `e30fee7e5fe0696441a5eba0a970ed92a9511174` (`2026-11-18T01:39:49Z`), un solo padre `9f8620e`. Los journals traen `x-chaos-token` como `***REDACTED***`. Los JSON de k6 no se tocaron. `cine-resource-exhaustion.json`, `run-chaos-toolkit.ps1` y `CHAOS_TOOLKIT_VALIDACION.md` reemplazan las copias del PR #5.

- `CHAOS_TOOLKIT_REAL_RUN.md` SHA-256 `a2716643b57aae4efc0ac989ffdb6b3ca2d2f072b0ee4ba9cf733c920274be52`
- `chaos-toolkit-journal.json` SHA-256 `a0fbf6567a4243bd3037389b1491a1e4fba1eaabdd10123853d08d97b0621f4f`
- `chaos-toolkit-journal-run1-empty-body.json` SHA-256 `1939af9eb7e5e87dbaec460473b06fa6277deaa06770ca60210fb950d99005c4`
- `chaos-toolkit-preflight-state.json` SHA-256 `44b62f24e8ab17ee8e3bc160440949ff7e6ad315077645acfbd84b98a8c94bc1`
- `chaos-toolkit-recovery-state.json` SHA-256 `249770acaa709267f7fef4a01084391e19a8f5afaa4cfd6a54606e213d4f1a31`
- `cine-resource-exhaustion.json` SHA-256 `47e88c9c7bbbd19cfc7dc47544d43840ea9ec9e77ba85480f391180121770a7d`
- `run-chaos-toolkit.ps1` SHA-256 `5fc9f169a60588e435539105f9f333ff974d85215f54e3263162f78d13d5bab7`
- `CHAOS_TOOLKIT_VALIDACION.md` SHA-256 `c89a53f4ce8f2a7c3eec6f955b2e8cf9212d8548390ed650d1e8ffd434ca7426`
- `multicloud-75s-series.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `25821d63b32ad820b5563a610e85bf6df36b422702e235fdc07774b79c1d38f4`
- `gke-v2-reject-probe.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `7281ff58f8bfad7f3487d4add13a6b926a468f31355bf20913827b4d82b1a798`
- `gke-admission-reject-probe.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `11295f50d703adb5fe4e58f7c26c487ec8a8bb98a9f7ffac534b4ccc38ebb401`
- `gke-admission-probe-recovery.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `a66afa76aaefcff69ab5c622a279742565eeb65f3035c33146ca32f68089e6a8`
- `comparison-k6-gke-v2.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `d89e6ce6f737aed3d4789f882afbfdce3c8cbd8db832db50531eed5f31fa7fc9`
- `baseline-k6-gke-v2.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `88062390739cbc93b9155adbe436c41c015af177c44e716f7b7c7599c11f202e`
- `r0-k6-gke-v2.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `b8d48c15665095d89c15ec140dd44cebe0cf268b0ee4ef3f9ab5636e7fb43378`
- `r1-k6-gke-v2.json` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `51513e3894bc7082234e44d0caf164ed98e6ccc5e979f7bb7c148778468f2b44`
- `CHAOS_GATE_CONTRATO.md` commit `b79ef990ebcf2492f95f86d0f832a3448e017a3c` SHA-256 `809d3a5d864d3e58f8457fc2036a8b6ae45162d3afb12d09e098f917db6949a1`
- `gke-v2-final-state.txt` commit `d9c41a3fbc68b77223495d3ecb602229a3345e03` SHA-256 `6815ec8d0795c67f5df4e4c440b485820d9373f06c205657b05ae9d30faa9a47`
