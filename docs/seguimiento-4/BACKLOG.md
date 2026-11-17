# Backlog pendiente (cloud / integración)

1. Obtener acceso a OKE de laboratorio **o** autorización para crear infraestructura (hoy el tenancy consultado aparece sin OKE/MySQL/OCIR/VCN).
2. Renovar kubeconfig (`oci ce cluster create-kubeconfig`) hasta que `kubectl get nodes` responda.
3. Push imagen a OCIR y `kubectl apply -f k8s/` (con autorización).
4. MySQL reachable desde OKE (reutilizar instancia existente; evitar MySQL managed nuevo si hay alternativa).
5. Collector OTLP + Grafana compartidos con evidencia real.
6. Sustituir perfil LOCAL por k6 común de Jarrison.
7. Ejecutar Baseline/R0/R1 en ambiente autorizado y archivar resultados.
8. Cablear Chaos Gate de Sports contra Hotel lab token.
9. Push remoto de la rama `feat/seguimiento-4-chaos` (manual).
