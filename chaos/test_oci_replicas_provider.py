"""Prueba aislada del provider. No llama al clúster ni a la inyección real."""

from __future__ import annotations

import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from chaoslib.exceptions import ActivityFailed

import oci_replicas_provider as provider


class FakeProc:
    def __init__(self, code: int, stdout: str = "", stderr: str = "boom"):
        self.returncode = code
        self.stdout = stdout
        self.stderr = stderr


class ActivityFailedPropagationTests(unittest.TestCase):
    def test_non_zero_exit_raises_for_all_actions(self) -> None:
        actions = {
            "status": provider.status,
            "enable": provider.enable,
            "verify_active": provider.verify_active,
            "disable": provider.disable,
        }
        for name, func in actions.items():
            with self.subTest(action=name):
                with mock.patch.object(
                    provider.subprocess,
                    "run",
                    return_value=FakeProc(7, stdout="no", stderr=f"fail-{name}"),
                ) as run_mock:
                    with self.assertRaises(ActivityFailed) as ctx:
                        func(timeout=5)
                    self.assertIn("exit=7", str(ctx.exception))
                    self.assertIn(f"fail-{name}", str(ctx.exception))
                    run_mock.assert_called_once()
                    args = run_mock.call_args.args[0]
                    self.assertEqual(args[0], "powershell")
                    self.assertIn("-File", args)
                    self.assertIn("-Action", args)

    def test_zero_exit_returns_true(self) -> None:
        with mock.patch.object(
            provider.subprocess,
            "run",
            return_value=FakeProc(0, stdout="ok action=status", stderr=""),
        ):
            self.assertIs(provider.status(timeout=5), True)

    def test_missing_script_raises(self) -> None:
        with mock.patch.object(
            provider,
            "_toolkit_script",
            return_value=r"Z:\missing\replicas-toolkit.ps1",
        ):
            with self.assertRaises(ActivityFailed) as ctx:
                provider.enable(timeout=5)
            self.assertIn("No está replicas-toolkit.ps1", str(ctx.exception))


if __name__ == "__main__":
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(
        ActivityFailedPropagationTests
    )
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    raise SystemExit(0 if result.wasSuccessful() else 1)
