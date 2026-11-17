# Certificado público lab OTLP (TLS)

- `otel-lab.crt` / `otel-lab-ca.crt`: certificado **público** autofirmado (IP SAN del worker OKE).
- La **clave privada** vive solo en el Secret K8s `otel-tls-lab` (no en Git).

## Por qué autofirmado

Let's Encrypt (y cualquier CA pública) exige un **nombre de dominio** controlado.  
Este laboratorio expone OTLP por IP (`157.137.233.183`) sin dominio → CA pública bloqueada.

Sports/Cine deben confiar este cert al exportar OTLP por HTTPS.
