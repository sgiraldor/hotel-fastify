# Limitaciones de representatividad frente al OKE real

## Declaración explícita

**La segmentación/aislamiento de este laboratorio no significa que el clúster OKE real haya sido endurecido.**  
**No se implementó NetworkPolicy en OCI.**  
El hallazgo previo de **Flannel Overlay sin enforcement efectivo de NetworkPolicy** permanece documentado y vigente.

## Qué demuestra el lab

- Aislamiento de bridges Docker (`internal: true`)
- Control de acceso por **proxy TCP L4** con política versionada
- Detección sobre eventos del gateway

## Qué no demuestra

- NetworkPolicy/Calico/Cilium en OKE
- Drop de paquetes pre-handshake en el CNI
- Endurecimiento de security lists / NSG de producción
- Cambios en Sports AWS, Hotel OCI, Cine GCP u observabilidad compartida
