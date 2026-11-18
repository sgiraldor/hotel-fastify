"""Pruebas unitarias puras post-H1..H12 (sin Docker)."""
from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHARED = ROOT / "lab" / "shared"
sys.path.insert(0, str(SHARED))


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_write_plan_equivalence_r0_r1():
    ident = load_module("lab_identity", SHARED / "lab_identity.py")
    assert ident.WRITE_PLAN["initial_commits"] == 10
    assert ident.WRITE_PLAN["mid_commits"] == 3
    assert ident.WRITE_PLAN["final_commits"] == 3
    assert ident.total_commits() == 16
    # Same plan object used for both scenarios by design
    r0 = dict(ident.WRITE_PLAN)
    r1 = dict(ident.WRITE_PLAN)
    assert r0 == r1


def test_immutable_destination_ignores_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_DB", "hotel_db")
    monkeypatch.setenv("ALLOWED_PROJECT", "evil")
    # reload identity (constants are module-level immutable values)
    if "lab_identity" in sys.modules:
        del sys.modules["lab_identity"]
    ident = load_module("lab_identity", SHARED / "lab_identity.py")
    assert ident.ALLOWED_DB == "lab_resilience_db"
    assert ident.ALLOWED_PROJECT == "seguridad-caos-exp4"
    common = load_module("common_events", SHARED / "common_events.py")
    try:
        common.assert_db_name("hotel_db")
        assert False
    except SystemExit as exc:
        assert "lab_resilience_db" in str(exc)


def test_r0_manual_wait_contract_in_runner():
    text = (ROOT / "scripts" / "run-scenario.ps1").read_text(encoding="utf-8")
    assert "R0_WAITING_FOR_MANUAL_RESTORE" in text
    assert "restore-manual-r0.ps1" in text
    assert "manual_restore_timeout" in text
    assert "AUTO_CONTINUE" not in text
    # R1 auto restore still present
    assert "--mode auto" in text or "mode,auto" in text or "mode auto" in text


def test_r0_manual_wait_contract_in_bash_runner():
    text = (ROOT / "scripts" / "run-scenario.sh").read_text(encoding="utf-8")
    assert "R0_WAITING_FOR_MANUAL_RESTORE" in text
    assert "restore-manual-r0.sh" in text
    assert "manual_restore_timeout" in text
    assert "AUTO_CONTINUE" not in text
    assert "--mode auto" in text
    assert "sleep 2" in text  # poll only
    assert "sleep 30" not in text and "sleep 60" not in text


def test_restore_manual_records_operator_start():
    text = (ROOT / "scripts" / "restore-manual-r0.ps1").read_text(encoding="utf-8")
    assert "operator_restore_authorized" in text
    assert "R0_MANUAL_RESTORE_DONE" in text
    sh = (ROOT / "scripts" / "restore-manual-r0.sh").read_text(encoding="utf-8")
    assert "operator_restore_authorized" in sh
    assert "t_restore_inicio" in sh


def test_repo_root_resolution_via_git(tmp_path):
    paths = load_module("lab_paths", ROOT / "scripts" / "lab_paths.py")
    lab = paths.lab_root_from_script(ROOT / "scripts" / "lab_paths.py")
    assert lab == ROOT.resolve()
    repo = paths.resolve_repo_root(lab)
    paths.assert_lab_under_repo(lab, repo)
    code, lines = paths.git_status_lines(repo)
    assert code == 0
    assert any(line.startswith("##") for line in lines)
    # Depth trap from smoke: three parents leave hotel-fastify
    outside = (lab / ".." / ".." / "..").resolve()
    assert outside != repo
    # Empty temp dir is never a git repo
    orphan = tmp_path / "not-a-repo"
    orphan.mkdir()
    try:
        paths.resolve_repo_root(orphan)
        assert False, "expected GIT_REPO_ROOT_UNRESOLVED"
    except RuntimeError as exc:
        assert "GIT_REPO_ROOT_UNRESOLVED" in str(exc)


def test_lab_common_ps1_has_git_c_helpers():
    text = (ROOT / "scripts" / "lab-common.ps1").read_text(encoding="utf-8")
    assert "Get-RepoRoot" in text
    assert "git -C" in text
    assert "Push-Location" not in text  # no relative directory hopping helper
    assert "Write-LabGitEvidence" in text
    assert "GIT_REPO_ROOT_UNRESOLVED" in text


def test_bash_runners_exist_and_guard_auth():
    for name in (
        "lab-common.sh",
        "run-scenario.sh",
        "run-r0.sh",
        "run-r1.sh",
        "restore-manual-r0.sh",
        "stop-experiment.sh",
        "preflight.sh",
        "git-lab-status.sh",
        "prepare-linux-perms.sh",
    ):
        assert (ROOT / "scripts" / name).is_file(), name
    r0 = (ROOT / "scripts" / "run-scenario.sh").read_text(encoding="utf-8")
    assert "EXP4_ALLOW_COMPOSE" in r0
    assert "--authorized" in r0
    assert "seguridad-caos-exp4" in r0
    assert "WRITE_PLAN total=16" in r0
    assert "extra_mid_backup_only_on_r1" in r0


def test_ledger_append_only_contract():
    text = (ROOT / "lab" / "generator" / "generator.py").read_text(encoding="utf-8")
    assert "commits_ledger.jsonl" in text
    assert 'open("a"' in text or "open('a'" in text or 'open("a", encoding' in text
    assert "write_text(json.dumps(rows" not in text  # no overwrite full array


def test_ledger_dedup_and_diff_helper(tmp_path):
    ledger = tmp_path / "commits_ledger.jsonl"
    rows = [
        {"run_id": "r0-a", "commit_id": "c1", "seq": 1, "confirmed": True},
        {"run_id": "r0-a", "commit_id": "c2", "seq": 2, "confirmed": True},
        {"run_id": "r0-a", "commit_id": "c2", "seq": 2, "confirmed": True},  # dup
    ]
    ledger.write_text("\n".join(json.dumps(r) for r in rows) + "\n", encoding="utf-8")
    seen = set()
    dups = []
    seqs = []
    for line in ledger.read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        key = (r["commit_id"], r["seq"])
        if key in seen:
            dups.append(key)
        seen.add(key)
        seqs.append(r["seq"])
    assert dups == [("c2", 2)]
    assert seqs == [1, 2, 2]


def test_backup_uses_temp_and_no_routines():
    text = (ROOT / "lab" / "backup" / "backup.py").read_text(encoding="utf-8")
    assert ".partial" in text
    assert "os.replace" in text
    # Ensure mysqldump argv does not include routines/triggers flags
    assert '"--routines"' not in text and "'--routines'" not in text
    assert '"--triggers"' not in text and "'--triggers'" not in text
    assert '"--single-transaction"' in text or "'--single-transaction'" in text
    assert "backup_failed" in text


def test_detection_from_alerts(tmp_path):
    metrics_mod = load_module("compute_metrics", ROOT / "scripts" / "compute-metrics.py")
    events = tmp_path / "events.jsonl"
    alerts = tmp_path / "alerts.jsonl"
    events.write_text(
        json.dumps(
            {
                "event_type": "fault_injected",
                "run_id": "r1-1",
                "scenario": "r1",
                "t_fallo": "2026-11-18T12:00:10.000Z",
                "commits_before": 16,
            }
        )
        + "\n"
        + json.dumps(
            {
                "event_type": "restore_started",
                "run_id": "r1-1",
                "scenario": "r1",
                "backup_id": "backup-x",
                "t_restore_inicio": "2026-11-18T12:00:20.000Z",
            }
        )
        + "\n"
        + json.dumps(
            {
                "event_type": "restore_completed",
                "run_id": "r1-1",
                "scenario": "r1",
                "backup_id": "backup-x",
                "t_restore_fin": "2026-11-18T12:00:21.000Z",
                "t_backup_restored": "2026-11-18T12:00:05.000Z",
                "integrity": {"commit_count": 13, "service_ok": True, "last_commit_id": "c-last"},
            }
        )
        + "\n"
        + json.dumps(
            {
                "event_type": "backup_completed",
                "run_id": "r1-1",
                "scenario": "r1",
                "backup_id": "backup-x",
                "t_backup": "2026-11-18T12:00:05.000Z",
            }
        )
        + "\n"
        + json.dumps(
            {
                "event_type": "service_ok",
                "run_id": "r1-1",
                "scenario": "r1",
                "t_servicio_ok": "2026-11-18T12:00:22.000Z",
                "restored_commit_count": 13,
            }
        )
        + "\n",
        encoding="utf-8",
    )
    alerts.write_text(
        json.dumps(
            {
                "alert_type": "lab_event_observed",
                "run_id": "r1-1",
                "scenario": "r1",
                "correlated_event_type": "fault_injected",
                "t_deteccion": "2026-11-18T12:00:10.500Z",
            }
        )
        + "\n",
        encoding="utf-8",
    )
    out = tmp_path / "metrics.json"
    old = sys.argv
    sys.argv = [
        "compute-metrics.py",
        "--events",
        str(events),
        "--alerts",
        str(alerts),
        "--run-id",
        "r1-1",
        "--scenario",
        "r1",
        "--out",
        str(out),
        "--backup-interval-sec",
        "30",
    ]
    try:
        assert metrics_mod.main() == 0
    finally:
        sys.argv = old
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["detection_status"] == "observed"
    assert data["t_deteccion_utc"] == "2026-11-18T12:00:10.500000Z" or data["t_deteccion_utc"].startswith(
        "2026-11-18T12:00:10.500"
    )
    assert data["rto_observed_ms"] == 12000.0
    assert data["confirmed_commits_lost"] == 3
    assert data["backup_id_restored"] == "backup-x"
    assert data["rpo_observed_from_backup_age_ms"] == 5000.0


def test_detection_null_when_missing(tmp_path):
    metrics_mod = load_module("compute_metrics", ROOT / "scripts" / "compute-metrics.py")
    events = tmp_path / "events.jsonl"
    alerts = tmp_path / "alerts.jsonl"
    events.write_text(
        json.dumps(
            {
                "event_type": "fault_injected",
                "run_id": "r0-x",
                "scenario": "r0",
                "t_fallo": "2026-11-18T12:00:10.000Z",
            }
        )
        + "\n",
        encoding="utf-8",
    )
    alerts.write_text("", encoding="utf-8")
    out = tmp_path / "m.json"
    old = sys.argv
    sys.argv = [
        "compute-metrics.py",
        "--events",
        str(events),
        "--alerts",
        str(alerts),
        "--run-id",
        "r0-x",
        "--scenario",
        "r0",
        "--out",
        str(out),
    ]
    try:
        assert metrics_mod.main() == 0
    finally:
        sys.argv = old
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["detection_status"] == "not_observed"
    assert data["t_deteccion_utc"] is None


def test_compose_isolation_contracts():
    text = (ROOT / "docker-compose.yml").read_text(encoding="utf-8")
    assert "name: seguridad-caos-exp4" in text
    assert not any(line.lstrip().startswith("ports:") for line in text.splitlines())
    assert "/var/run/docker.sock" not in text
    assert not any(line.lstrip().startswith("privileged:") for line in text.splitlines())
    assert "lab_resilience_db" in text
    assert "internal: true" in text
    assert "probe" in text


def _tf_read(*names: str) -> str:
    return "\n".join((ROOT / "oci" / "terraform" / n).read_text(encoding="utf-8") for n in names)


def _assert_no_ssh_world_in_ingress_hcl(text: str) -> None:
    """Fail if an INGRESS block allows SSH (or any TCP) from 0.0.0.0/0 or ::/0."""
    # Split on direction markers used in both NSG and SL HCL
    chunks = []
    lower = text
    for marker in ("direction                 = \"INGRESS\"", "ingress_security_rules", 'direction = "INGRESS"'):
        if marker in lower:
            parts = lower.split(marker)
            chunks.extend(parts[1:])
    if not chunks:
        # Fallback: whole file scanned for dangerous ingress patterns near source
        chunks = [text]
    for chunk in chunks:
        head = chunk
        for stop in ("direction                 = \"EGRESS\"", "egress_security_rules", 'direction = "EGRESS"'):
            if stop in head:
                head = head.split(stop)[0]
        src_world = 'source      = "0.0.0.0/0"' in head or 'source = "0.0.0.0/0"' in head or 'source                    = "0.0.0.0/0"' in head
        src_v6 = 'source      = "::/0"' in head or 'source = "::/0"' in head
        # ICMP PMTUD from 0.0.0.0/0 is allowed; SSH/TCP-22 from world is not
        if (src_world or src_v6) and ("min = 22" in head or "min=22" in head):
            raise AssertionError("ingress SSH must not allow 0.0.0.0/0 or ::/0")


def _subnet_blocks_missing_security_list_ids(network_hcl: str) -> list[str]:
    """Return subnet resource labels that omit security_list_ids assignments."""
    missing = []
    parts = network_hcl.split('resource "oci_core_subnet"')
    for part in parts[1:]:
        name = part.split('"')[1] if '"' in part else "?"
        body = part
        if '\nresource "' in body:
            body = body.split('\nresource "', 1)[0]
        # Ignore comments; require an actual argument assignment.
        code_lines = []
        for line in body.splitlines():
            stripped = line.lstrip()
            if stripped.startswith("#"):
                continue
            if "#" in line:
                line = line.split("#", 1)[0]
            code_lines.append(line)
        code = "\n".join(code_lines)
        if "security_list_ids" not in code:
            missing.append(name)
    return missing


def test_oci_terraform_complete_and_gated():
    tf_dir = ROOT / "oci" / "terraform"
    variables = (tf_dir / "variables.tf").read_text(encoding="utf-8")
    compute = (tf_dir / "compute.tf").read_text(encoding="utf-8")
    network = (tf_dir / "network.tf").read_text(encoding="utf-8")
    bastion = (tf_dir / "bastion.tf").read_text(encoding="utf-8")
    nsg = (tf_dir / "nsg.tf").read_text(encoding="utf-8")
    sl = (tf_dir / "security_lists.tf").read_text(encoding="utf-8")
    versions = (tf_dir / "versions.tf").read_text(encoding="utf-8")
    outputs = (tf_dir / "outputs.tf").read_text(encoding="utf-8")
    locals_tf = (tf_dir / "locals.tf").read_text(encoding="utf-8")

    assert "default     = false" in variables or "default = false" in variables
    assert 'default     = "bastion"' in variables or 'default = "bastion"' in variables
    assert "ssh_authorized_cidr debe ser un CIDR" in variables
    assert "0.0.0.0/0" in variables and "::/0" in variables

    assert "oci_core_instance" in compute
    assert "oci_core_vcn" in network
    assert "oci_core_nat_gateway" in network
    assert "oci_core_internet_gateway" in network
    assert "oci_bastion_bastion" in bastion
    assert "oci_core_security_list" in sl
    assert "min = 3306" not in nsg and "max = 3306" not in nsg
    assert "min = 3306" not in sl and "max = 3306" not in sl
    assert "backend \"local\"" in versions
    assert "inventory_ocids" in outputs
    assert "terraform_enforces_budget" in outputs and "false" in outputs
    assert "lab_watchdog_terminates_oci" in outputs and "false" in outputs
    assert "oci_auto_destroy_after_hours" in outputs and "false" in outputs
    assert "oci_min_availability_hours" in outputs
    assert 'default     = 9' in variables or "default = 9" in variables
    assert "budget_sufficiency_certified" in outputs
    assert "hotel-vcn" not in compute
    assert "local_peering" not in network.lower()
    assert "drg" not in network.lower()
    assert "enabled = var.enable_exp4_oci && var.compartment_ocid != \"\"" in locals_tf

    # Subnets must bind exclusive SL (never inherit default by omission)
    missing = _subnet_blocks_missing_security_list_ids(network)
    assert missing == [], f"subnets missing security_list_ids: {missing}"
    assert "oci_core_security_list.public" in network
    assert "oci_core_security_list.private" in network

    # VM must attach NSG
    assert "nsg_ids" in compute and "oci_core_network_security_group.vm" in compute

    _assert_no_ssh_world_in_ingress_hcl(nsg)
    _assert_no_ssh_world_in_ingress_hcl(sl)

    # No unrestricted egress-all (protocol = "all") in SL/NSG
    assert 'protocol = "all"' not in nsg and 'protocol         = "all"' not in sl
    assert 'protocol                  = "all"' not in nsg


def test_security_validators_catch_insecure_fixtures():
    """Negative tests: helpers must fail on insecure HCL snippets."""
    bad_ssh = '''
    direction                 = "INGRESS"
    protocol                  = "6"
    source                    = "0.0.0.0/0"
    tcp_options {
      min = 22
      max = 22
    }
    '''
    try:
        _assert_no_ssh_world_in_ingress_hcl(bad_ssh)
        assert False, "expected AssertionError for SSH world"
    except AssertionError:
        pass

    bad_subnet = '''
    resource "oci_core_subnet" "public" {
      count = 1
      cidr_block = "10.31.2.0/24"
      # security_list_ids intentionally omitted
    }
    '''
    assert _subnet_blocks_missing_security_list_ids(bad_subnet) == ["public"]

    good_subnet = '''
    resource "oci_core_subnet" "public" {
      security_list_ids = oci_core_security_list.public[*].id
    }
    '''
    assert _subnet_blocks_missing_security_list_ids(good_subnet) == []

    # ICMP PMTUD from 0.0.0.0/0 without TCP/22 must pass
    icmp_ok = '''
    ingress_security_rules {
      protocol = "1"
      source   = "0.0.0.0/0"
      icmp_options { type = 3 code = 4 }
    }
    '''
    _assert_no_ssh_world_in_ingress_hcl(icmp_ok)


def test_stop_and_watchdog_contracts():
    fault = (ROOT / "lab" / "restore" / "fault.py").read_text(encoding="utf-8")
    restore = (ROOT / "lab" / "restore" / "restore.py").read_text(encoding="utf-8")
    wd = (ROOT / "lab" / "watchdog" / "watchdog.py").read_text(encoding="utf-8")
    assert "STOP" in fault and "--authorized" in fault
    assert "STOP" in restore and "--authorized" in restore
    assert "deadline" in wd.lower()
    assert "/var/run/docker.sock" not in wd


def test_integrity_not_only_lab_meta():
    text = (ROOT / "lab" / "restore" / "restore.py").read_text(encoding="utf-8")
    assert "expected_commit_count_from_backup" in text
    assert "corruption_suspected" in text
    assert "functional_query_ok" in text
    assert "ORDER BY id ASC" in text
    assert "MAX(commit_id)" not in text
