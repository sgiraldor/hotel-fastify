# Comparacion R0 vs R1 (datos reales)

| Metrica | R0 | R1 |
|---|---|---|
| unauthorized_tcp_connected | True | True |
| unauthorized_mysql_greeting_received | True | False |
| unauthorized_access_blocked | False | True |
| unauthorized_denied_event | False | True |
| detection_coverage | False | True |
| false_positives_legitimate_alerted | False | False |
| mttd_ms |  | 20.0 |
| mttc_ms_preventive_block_from_t0 |  | 5.0 |
| containment_class | not_observed | preventive |
| containment_reactive | False | False |
| legitimate_mysql_greeting_received | True | True |
| t0 | 2026-11-18T05:13:54.802Z | 2026-11-18T05:18:21.270Z |
| t1 |  | 2026-11-18T05:18:21.290Z |
| t2 |  | 2026-11-18T05:18:21.275Z |

- t2 antes de t1 en R1: contencion preventiva.
- detector_started no cuenta como deteccion de ataque.
