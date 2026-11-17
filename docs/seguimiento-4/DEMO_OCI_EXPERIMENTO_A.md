# Demo controlada — Experimento A sobre OCI (NO ejecutar aún)

La corrida con Sports está en [`RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md`](./RUNBOOK_EXPERIMENTO_A_OCI_SPORTS.md).  
No altera MySQL, réplicas ni NLB.

Un POST al NLB (`http://149.130.165.30/api/v2/chaos/dependency`) cambia la memoria de **un** proceso. No sirve para las dos réplicas. Activación, verificación y reversión: `chaos/chaos-replicas.ps1`.

`./chaos/revert-chaos.ps1` queda para un Hotel local de un solo proceso. Contra el NLB de OCI se detiene.
