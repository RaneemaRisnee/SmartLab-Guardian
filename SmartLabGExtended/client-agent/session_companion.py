"""Interactive-session companion for SmartLab Guardian usage monitoring.

Run this only from the existing authorized session-start flow, in the logged-in
student user's Windows session (never as a Session 0 service process):
    python session_companion.py --session-id <authorized-session-id>
The backend must acknowledge the session start before desktop sampling begins.
"""
from __future__ import annotations

import argparse
import json
import os
import signal
import sqlite3
import sys
import threading
import time
import uuid
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import requests

from usage_monitor import UsageMonitor, WindowsDesktopSampler

HERE = Path(__file__).resolve().parent


def load_config():
    path = HERE / "config.json"
    with path.open(encoding="utf-8") as handle:
        cfg = json.load(handle)
    if not cfg.get("pc_id") or not cfg.get("agent_key") or not cfg.get("api_url"):
        raise ValueError("config.json must define pc_id, agent_key and api_url")
    cfg.setdefault("inactivity_threshold_seconds", 300)
    cfg.setdefault("monitor_poll_seconds", 1)
    cfg.setdefault("usage_upload_interval_seconds", 60)
    return cfg


def monitoring_base_url(cfg):
    explicit = cfg.get("monitoring_api_url")
    if explicit:
        return explicit.rstrip("/")
    parts = urlsplit(cfg["api_url"])
    path = parts.path
    marker = "/api/alerts"
    if marker in path:
        path = path.split(marker, 1)[0] + "/api/monitoring"
    else:
        path = path.rstrip("/") + "/api/monitoring"
    return urlunsplit((parts.scheme, parts.netloc, path, "", "")).rstrip("/")


class DurableSpool:
    """SQLite outbox; server batch IDs make retrying an upload idempotent."""

    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path), timeout=10)
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("""CREATE TABLE IF NOT EXISTS pending_batches (
            batch_id TEXT PRIMARY KEY, endpoint TEXT NOT NULL,
            payload TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )""")
        self.db.commit()

    def enqueue(self, endpoint: str, payload: dict):
        self.db.execute("INSERT OR IGNORE INTO pending_batches(batch_id, endpoint, payload) VALUES (?, ?, ?)",
                        (payload["batch_id"], endpoint, json.dumps(payload, separators=(",", ":"))))
        self.db.commit()

    def oldest(self):
        return self.db.execute("SELECT batch_id, endpoint, payload FROM pending_batches ORDER BY created_at, rowid LIMIT 1").fetchone()

    def remove(self, batch_id: str):
        self.db.execute("DELETE FROM pending_batches WHERE batch_id = ?", (batch_id,))
        self.db.commit()

    def close(self):
        self.db.close()


def post_json(url, payload, key):
    return requests.post(url, json=payload, headers={"x-agent-key": key}, timeout=10)


def default_spool_path():
    root = Path(os.environ.get("LOCALAPPDATA") or (Path.home() / "AppData" / "Local"))
    return root / "SmartLabGuardian" / "monitoring-spool.sqlite3"


def run(session_id: str, cfg=None, stop_event=None, sampler=None, spool_path=None):
    cfg = cfg or load_config()
    stop_event = stop_event or threading.Event()
    base = monitoring_base_url(cfg)
    key = cfg["agent_key"]
    pc_id = cfg["pc_id"]
    session_id = session_id.strip()
    if not session_id:
        raise ValueError("an authorized session ID is required")
    if sampler is None and os.name != "nt":
        raise OSError("the session companion must run in an interactive Windows user session")

    # This API acknowledgement gates all session-specific collection.
    response = post_json(base + "/sessions/start", {"pc_id": pc_id, "session_id": session_id}, key)
    if response.status_code not in (200, 201):
        raise RuntimeError(f"session start rejected by API (HTTP {response.status_code})")

    sampler = sampler or WindowsDesktopSampler()
    monitor = UsageMonitor(
        inactivity_threshold_seconds=int(cfg["inactivity_threshold_seconds"]),
        app_sampler=sampler.foreground_application,
        mouse_sampler=sampler.mouse_activity,
    )
    spool = DurableSpool(Path(spool_path) if spool_path else default_spool_path())
    endpoint = base + "/sessions/" + session_id + "/batches"
    interval = max(0.25, float(cfg["monitor_poll_seconds"]))
    upload_interval = max(5.0, float(cfg["usage_upload_interval_seconds"]))
    last_flush = time.monotonic()

    def flush(final=False):
        payload = monitor.drain_batch(str(uuid.uuid4()), pc_id, session_id, final=final)
        spool.enqueue(endpoint, payload)
        monitor.acknowledge_batch()
        send_pending()

    def send_pending():
        while True:
            row = spool.oldest()
            if row is None:
                return
            batch_id, url, raw = row
            try:
                result = post_json(url, json.loads(raw), key)
            except requests.RequestException as exc:
                print(f"[WARN] Monitoring upload deferred: {type(exc).__name__}", file=sys.stderr)
                return
            if 200 <= result.status_code < 300:
                spool.remove(batch_id)
                continue
            # Keep rejected records in the outbox; operator can correct config or
            # authorization and the deterministic batch id prevents duplicate writes.
            print(f"[WARN] Monitoring upload deferred: HTTP {result.status_code}", file=sys.stderr)
            return

    print(f"[INFO] Usage monitoring active for authorized session {session_id} on {pc_id}")
    try:
        while not stop_event.is_set():
            monitor.tick()
            now = time.monotonic()
            if now - last_flush >= upload_interval:
                flush()
                last_flush = now
            stop_event.wait(interval)
    finally:
        try:
            flush(final=True)
        finally:
            spool.close()
        print("[INFO] Session usage monitoring stopped")


def main():
    parser = argparse.ArgumentParser(description="Monitor app identity and mouse activity during an authorized student session")
    parser.add_argument("--session-id", required=True, help="ID issued by the authorized session-start flow")
    args = parser.parse_args()
    stop = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stop.set())
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, lambda *_: stop.set())
    try:
        run(args.session_id, stop_event=stop)
    except Exception as exc:
        print(f"[ERROR] Monitoring companion stopped: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
