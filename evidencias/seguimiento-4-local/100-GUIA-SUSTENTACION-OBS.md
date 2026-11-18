# Guía rápida — Sustentación Seguimiento #4 (Observabilidad Hotel OCI)

**No ejecutar caos ni k6 durante la defensa.** Todo lo siguiente es evidencia ya capturada.

## Limitaciones (decirlas al profesor si pregunta)

1. **Prometheus retiene 24 h** (`--storage.tsdb.retention.time=24h`) y usa `emptyDir`. Las series de Baseline/R0/R1 k6 (17-nov ~00:40–01:20 Colombia = `05:40–06:20Z`) **ya fueron purgadas**.
2. El panel **Bulkhead / fail-fast** del multinube muestra *No data* porque la **imagen desplegada de Hotel no exporta** `hotel_db_*` en `/metrics/prometheus` (el código local sí las define).
3. La ventana Grafana **`2026-11-18T02:40–03:00Z`** es el **experimento declarativo** `oci-replicas` (~21:48 Colombia del 17-nov). **No es Baseline/R0/R1.**

## Dashboards vivos

| UID | Título | URL local (port-forward Grafana `:3001`) |
|---|---|---|
| `seguimiento-4-multicloud` | Seguimiento #4 — Multicloud Observability | `http://127.0.0.1:3001/d/seguimiento-4-multicloud` |
| `experimento-a-503` | Experimento A — HTTP 503 Hotel | `http://127.0.0.1:3001/d/experimento-a-503` |

Datasource: Prometheus `uid=prometheus` → `http://prometheus:9090` (OKE).

## Qué es histórico k6 vs qué es declarativo

| Evidencia | Tipo | Usar para |
|---|---|---|
| Tabla markdown del dashboard + `94`/`96` + JSON k6 + capturas `97`/`98` | **Histórico Baseline/R0/R1 k6** (17-nov madrugada CO) | Resultado del experimento de carga |
| Ventana Prom `02:40–03:00Z` + capturas/JSON `100-*-declarativo-*` + journal `oci-replicas-*-214843*` | **Declarativo posterior** (~21:48 CO / `02:48Z`) | Demostrar scrape/interruptor aún vivos |
| Multicloud `now-30m` + `100-grafana-multicloud-now30m.png` | **Estado actual** | Salud del scrape, no el experimento |

**No mezclar** la ventana declarativa con Baseline/R0/R1.

## Orden recomendado frente al profesor (~5–7 min)

### Paso 1 — Resultado de negocio k6 (tabla histórica)

1. Abrir `experimento-a-503` (default o cualquier rango).
2. Mostrar panel **Comparación archivada de k6** (Baseline 289 / R0 320 / R1 349).
3. Mostrar panel **Ventanas de inyección y trazas**.
4. Si pide el archivo: captura  
   `evidencias/seguimiento-4-local/100-grafana-experimento-a-declarativo-k6-table.png`  
   o la original  
   `evidencias/seguimiento-4-local/98-grafana-experimento-a-k6.png`.

### Paso 2 — Gráficas originales R0/R1 (ya guardadas; Prom las perdió)

Abrir en el explorador / visor de imágenes:

- `evidencias/seguimiento-4-local/98-grafana-experimento-a-series.png` — chaos active histórico
- `evidencias/seguimiento-4-local/98-grafana-experimento-a-contador.png` — contador 503 histórico
- `evidencias/seguimiento-4-local/97-grafana-chaos-503.png`
- `evidencias/seguimiento-4-local/97-grafana-5xx.png`

Decir: “estas capturas se tomaron cuando las series aún estaban en el TSDB; hoy la retención de 24 h las eliminó”.

### Paso 3 — Números k6 y cobertura por réplica

- Baseline JSON: `evidencias/seguimiento-4-local/baseline-hotel503-baseline-20261117-003033.json`
- Summaries:  
  `k6-baseline-summary.json`, `k6-r0-summary.json`, `k6-r1-summary.json`
- Cobertura R0: `evidencias/seguimiento-4-local/94-r0-retry-cobertura.txt`
- Cobertura R1 definitiva: `evidencias/seguimiento-4-local/96-r1-retry-cobertura.txt`
- Journal Chaos Toolkit (lab/local): `evidencias/seguimiento-4-local/40-chaostoolkit-journal.json`

### Paso 4 — Trazas

- Resumen: `evidencias/seguimiento-4-local/92-trace-summary.txt`
- Traza final: `evidencias/seguimiento-4-local/92-tempo-trace-final.json`
- Traza sana citada en dashboard: `evidencias/seguimiento-4-local/93-summary-4f8140a18fbaa1f98caaa8990d14341c.txt`
- Traza parcial (Sports 200 / Hotel 503 / Cine 200): ID `68adbcf21b960acf374c54886c56d681` referida en el panel de ventanas y en `96-r1-retry-cobertura.txt` / `93-e2e-verdict.txt`

### Paso 5 — Scrape vivo (salud actual, no el experimento k6)

1. Abrir `seguimiento-4-multicloud` con **Last 30 minutes**.
2. Mostrar **Throughput** y **Latencia p95** (series vivas).
3. Captura de respaldo: `evidencias/seguimiento-4-local/100-grafana-multicloud-now30m.png`.
4. Si preguntan por 5xx/chaos: en vivo `rate(5xx)≈0` y `chaos_active=0`; contadores acumulados siguen en 422/204.
5. Bulkhead: explicar limitación de imagen (paso limitaciones).

### Paso 6 — Solo si preguntan “¿queda algo en Prometheus?”

Ventana **declarativa** (no k6):

- Grafana:  
  `http://127.0.0.1:3001/d/experimento-a-503?from=2026-11-18T02:40:00.000Z&to=2026-11-18T03:00:00.000Z&timezone=utc`
- PromQL crudo: **ambas** réplicas tienen `hotel_chaos_active=1` en **`2026-11-18T02:49:00Z`** (un scrape de 15 s). En la PNG las barras se solapan.
- Escalón `hotel_chaos_503_total`: **420→422** (`glg2z`) y **202→204** (`tmqlg`).
- Capturas:  
  `100-grafana-declarativo-chaos-active.png`  
  `100-grafana-declarativo-chaos-503-total.png`
- JSON crudo PromQL:  
  `100-prom-declarativo-20261118T0240-0300Z.json`  
  `100-prom-declarativo-20261118T0240-0300Z-SUMMARY.txt`
- Journal: `oci-replicas-journal-20261117-214843.json`  
- Run log: `oci-replicas-run-20261117-214843.txt`  
- Verificación: `oci-replicas-run-20261117-214843-VERIFICACION.md`

**Frase clave:** “Esto demuestra que el interruptor y el scrape siguen vivos; no sustituye las rondas k6 Baseline/R0/R1.”

## Checklist pre-defensa (2 min)

- [ ] `kubectl` context OKE + port-forward Grafana `3001:3000` (y Prometheus `19090:9090` si hace falta).
- [ ] Abrir ambos dashboards una vez.
- [ ] Tener carpeta `evidencias/seguimiento-4-local/` a mano (capturas `97`/`98` + `100`).
- [ ] No cambiar el time picker del 503 a 00:40–01:20 CO esperando series Prometheus: saldrá *No data* por retención.
