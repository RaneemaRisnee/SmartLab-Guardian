import datetime as dt
import unittest

from usage_monitor import Application, UsageMonitor


class FakeClock:
    def __init__(self):
        self.mono = 0.0
        self.wall = dt.datetime(2026, 1, 1, tzinfo=dt.timezone.utc)

    def advance(self, seconds):
        self.mono += seconds
        self.wall += dt.timedelta(seconds=seconds)

    def now(self):
        return self.wall

    def monotonic(self):
        return self.mono


class UsageMonitorTests(unittest.TestCase):
    def make_monitor(self, threshold=300):
        clock = FakeClock()
        signal = {"mouse": False, "app": Application("Editor", "code.exe")}
        monitor = UsageMonitor(
            inactivity_threshold_seconds=threshold,
            app_sampler=lambda: signal["app"],
            mouse_sampler=lambda: signal["mouse"],
            wall_clock=clock.now,
            monotonic_clock=clock.monotonic,
        )
        return clock, signal, monitor

    def test_mouse_activity_and_five_minute_inactivity_transition(self):
        clock, signal, monitor = self.make_monitor(threshold=300)
        monitor.tick()  # starts INACTIVE; no synthetic activity is generated
        self.assertEqual(monitor.status, "INACTIVE")
        clock.advance(10)
        signal["mouse"] = True
        monitor.tick()
        signal["mouse"] = False
        self.assertEqual(monitor.status, "ACTIVE")
        clock.advance(300)
        monitor.tick()
        self.assertEqual(monitor.status, "ACTIVE")  # at exactly threshold
        clock.advance(0.1)
        monitor.tick()
        self.assertEqual(monitor.status, "INACTIVE")
        batch = monitor.drain_batch("b1", "PC-1", "s1")
        statuses = [item["status"] for item in batch["activity_changes"]]
        self.assertEqual(statuses, ["INACTIVE", "ACTIVE", "INACTIVE"])
        self.assertAlmostEqual(batch["summary"]["inactive_seconds"], 10.0, places=3)
        self.assertAlmostEqual(batch["summary"]["active_seconds"], 300.1, places=1)

    def test_application_switches_emit_durations_without_window_titles(self):
        clock, signal, monitor = self.make_monitor()
        monitor.tick()
        clock.advance(25)
        signal["app"] = Application("Browser", "chrome.exe")
        monitor.tick()
        clock.advance(12)
        batch = monitor.drain_batch("b1", "PC-1", "s1")
        apps = batch["app_usage"]
        self.assertEqual([row["executable_name"] for row in apps], ["code.exe", "chrome.exe"])
        self.assertEqual([row["duration_seconds"] for row in apps], [25, 12])
        serialized = repr(batch).lower()
        for forbidden in ("window_title", "keystroke", "clipboard", "screenshot", "coordinates"):
            self.assertNotIn(forbidden, serialized)

    def test_final_batch_marks_session_ended_and_accumulates_duration(self):
        clock, signal, monitor = self.make_monitor()
        monitor.tick()
        clock.advance(8)
        final = monitor.drain_batch("b-final", "PC-1", "s1", final=True)
        self.assertEqual(monitor.status, "SESSION_ENDED")
        self.assertEqual(final["activity_changes"][-1]["status"], "SESSION_ENDED")
        self.assertAlmostEqual(final["summary"]["inactive_seconds"], 8.0)
        with self.assertRaises(RuntimeError):
            monitor.tick()

    def test_mouse_click_signal_activates_without_storing_input_details(self):
        clock, signal, monitor = self.make_monitor()
        signal["mouse"] = True
        monitor.tick()
        self.assertEqual(monitor.status, "ACTIVE")
        batch = monitor.drain_batch("b1", "PC-1", "s1")
        self.assertTrue(batch["activity_changes"][-1]["last_activity_at"].endswith("Z"))


if __name__ == "__main__":
    unittest.main()
