import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import session_companion
from usage_monitor import Application


class FakeResponse:
    status_code = 201


class FakeSampler:
    def __init__(self, calls):
        self.calls = calls

    def foreground_application(self):
        self.calls.append("foreground")
        return Application("Editor", "editor.exe")

    def mouse_activity(self):
        self.calls.append("mouse")
        return False


class OneTickStop:
    def __init__(self):
        self.calls = 0

    def is_set(self):
        self.calls += 1
        return self.calls > 1

    def wait(self, _seconds):
        return None


class SessionCompanionTests(unittest.TestCase):
    def test_start_acknowledgement_gates_sampling_and_final_batch_is_sent(self):
        order = []
        requests_seen = []

        def fake_post(url, json, headers, timeout):
            requests_seen.append((url, json))
            if url.endswith("/sessions/start"):
                order.append("authorized-start")
            else:
                order.append("batch-upload")
            return FakeResponse()

        cfg = {
            "pc_id": "PC-1",
            "agent_key": "test-only",
            "api_url": "http://localhost:5000/api/alerts/log-alert",
            "monitoring_api_url": "http://localhost:5000/api/monitoring",
            "inactivity_threshold_seconds": 300,
            "monitor_poll_seconds": 0.25,
            "usage_upload_interval_seconds": 60,
        }
        with tempfile.TemporaryDirectory() as temp, patch.object(session_companion.requests, "post", side_effect=fake_post):
            session_companion.run(
                "authorized-123", cfg=cfg, stop_event=OneTickStop(),
                sampler=FakeSampler(order), spool_path=Path(temp) / "spool.sqlite3",
            )

        self.assertEqual(order[0], "authorized-start")
        self.assertGreater(order.index("foreground"), order.index("authorized-start"))
        self.assertGreater(order.index("mouse"), order.index("authorized-start"))
        self.assertEqual(order[-1], "batch-upload")
        final_payload = requests_seen[-1][1]
        self.assertTrue(final_payload["final"])
        self.assertEqual(final_payload["activity_changes"][-1]["status"], "SESSION_ENDED")
        self.assertEqual(final_payload["session_id"], "authorized-123")


if __name__ == "__main__":
    unittest.main()
