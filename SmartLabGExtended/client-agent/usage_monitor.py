"""Session-scoped foreground-application and mouse activity monitoring.

This module never reads window titles, keyboard input, coordinates for storage,
keystrokes, screenshots, clipboard data, or page contents. It is safe to import
on non-Windows systems; the Windows sampler is instantiated only by the
interactive-session companion process.
"""
from __future__ import annotations

import ctypes
import ctypes.wintypes as wintypes
import datetime as dt
import os
import time
from dataclasses import dataclass
from pathlib import PureWindowsPath
from typing import Callable, Optional


@dataclass(frozen=True)
class Application:
    app_name: str
    executable_name: str


class WindowsDesktopSampler:
    """Low-overhead best-effort foreground app and mouse-only sampler."""

    PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
    VK_MOUSE_BUTTONS = (0x01, 0x02, 0x04, 0x05, 0x06)

    def __init__(self):
        if os.name != "nt":
            raise OSError("WindowsDesktopSampler requires an interactive Windows session")
        self.user32 = ctypes.WinDLL("user32", use_last_error=True)
        self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        self.user32.GetForegroundWindow.restype = wintypes.HWND
        self.user32.GetWindowThreadProcessId.argtypes = [wintypes.HWND, ctypes.POINTER(wintypes.DWORD)]
        self.user32.GetWindowThreadProcessId.restype = wintypes.DWORD
        self.user32.GetAsyncKeyState.argtypes = [ctypes.c_int]
        self.user32.GetAsyncKeyState.restype = ctypes.c_short
        self.user32.GetCursorPos.argtypes = [ctypes.POINTER(wintypes.POINT)]
        self.user32.GetCursorPos.restype = wintypes.BOOL
        self.kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        self.kernel32.OpenProcess.restype = wintypes.HANDLE
        self.kernel32.QueryFullProcessImageNameW.argtypes = [wintypes.HANDLE, wintypes.DWORD, wintypes.LPWSTR, ctypes.POINTER(wintypes.DWORD)]
        self.kernel32.QueryFullProcessImageNameW.restype = wintypes.BOOL
        self.kernel32.CloseHandle.argtypes = [wintypes.HANDLE]
        self.kernel32.CloseHandle.restype = wintypes.BOOL
        self._cursor = self._get_cursor()
        self._buttons = {key: bool(self.user32.GetAsyncKeyState(key) & 0x8000) for key in self.VK_MOUSE_BUTTONS}

    def foreground_application(self) -> Optional[Application]:
        hwnd = self.user32.GetForegroundWindow()
        if not hwnd:
            return None
        pid = ctypes.c_ulong()
        self.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if not pid.value:
            return None
        handle = self.kernel32.OpenProcess(self.PROCESS_QUERY_LIMITED_INFORMATION, False, pid.value)
        if not handle:
            return None
        try:
            capacity = ctypes.c_ulong(32768)
            image = ctypes.create_unicode_buffer(capacity.value)
            if not self.kernel32.QueryFullProcessImageNameW(handle, 0, image, ctypes.byref(capacity)):
                return None
            executable = PureWindowsPath(image.value).name
            if not executable:
                return None
            return Application(app_name=PureWindowsPath(executable).stem or executable,
                               executable_name=executable)
        finally:
            self.kernel32.CloseHandle(handle)

    def _get_cursor(self):
        point = wintypes.POINT()
        if not self.user32.GetCursorPos(ctypes.byref(point)):
            return None
        return (point.x, point.y)

    def mouse_activity(self) -> bool:
        """Return only a boolean signal; sampled coordinates are never returned."""
        cursor = self._get_cursor()
        moved = cursor is not None and self._cursor is not None and cursor != self._cursor
        if cursor is not None:
            self._cursor = cursor
        pressed = False
        for key in self.VK_MOUSE_BUTTONS:
            state = self.user32.GetAsyncKeyState(key)
            down = bool(state & 0x8000)
            # The low-order bit is a best-effort indication of a press since the
            # previous query; the high-order bit catches buttons held at a sample.
            pressed = pressed or down or bool(state & 0x0001)
            self._buttons[key] = down
        return bool(moved or pressed)


def utc_iso(timestamp: Optional[dt.datetime] = None) -> str:
    value = timestamp or dt.datetime.now(dt.timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


class UsageMonitor:
    """Pure monitoring state machine; sampler and clocks are injectable in tests."""

    def __init__(self, inactivity_threshold_seconds: int = 300,
                 app_sampler: Optional[Callable[[], Optional[Application]]] = None,
                 mouse_sampler: Optional[Callable[[], bool]] = None,
                 wall_clock: Callable[[], dt.datetime] = lambda: dt.datetime.now(dt.timezone.utc),
                 monotonic_clock: Callable[[], float] = time.monotonic):
        if inactivity_threshold_seconds < 1:
            raise ValueError("inactivity_threshold_seconds must be at least 1")
        self.threshold = int(inactivity_threshold_seconds)
        self.app_sampler = app_sampler or (lambda: None)
        self.mouse_sampler = mouse_sampler or (lambda: False)
        self.wall_clock = wall_clock
        self.monotonic_clock = monotonic_clock
        self.started_at = utc_iso(self.wall_clock())
        self._started_mono = self.monotonic_clock()
        self._state = "INACTIVE"  # no mouse input has yet been observed
        self._state_since = self._started_mono
        self._last_activity_mono: Optional[float] = None
        self._last_activity_at: Optional[str] = None
        self._active_seconds = 0.0
        self._inactive_seconds = 0.0
        self._transitions = 0
        self._current_app: Optional[Application] = None
        self._app_segment_start_mono: Optional[float] = None
        self._app_segment_start_at: Optional[str] = None
        self._app_records = []
        self._activity_changes = [{
            "status": "INACTIVE", "timestamp": self.started_at,
            "last_activity_at": None,
        }]
        self._ended = False

    @property
    def status(self) -> str:
        return "SESSION_ENDED" if self._ended else self._state

    def _summary(self, now_mono: float) -> dict:
        active = self._active_seconds
        inactive = self._inactive_seconds
        if not self._ended:
            elapsed = max(0.0, now_mono - self._state_since)
            if self._state == "ACTIVE":
                active += elapsed
            else:
                inactive += elapsed
        return {
            "current_status": self.status,
            "last_activity_at": self._last_activity_at,
            "active_seconds": round(active, 3),
            "inactive_seconds": round(inactive, 3),
            "transition_count": self._transitions,
        }

    def _close_app_segment(self, now_mono: float, end_at: str) -> None:
        if self._current_app is None or self._app_segment_start_mono is None:
            return
        duration = max(0.0, now_mono - self._app_segment_start_mono)
        self._app_records.append({
            "app_name": self._current_app.app_name[:128],
            "executable_name": self._current_app.executable_name[:260],
            "started_at": self._app_segment_start_at,
            "ended_at": end_at,
            "duration_seconds": round(duration, 3),
        })
        self._app_segment_start_mono = now_mono
        self._app_segment_start_at = end_at

    def tick(self, now: Optional[dt.datetime] = None, now_mono: Optional[float] = None) -> None:
        if self._ended:
            raise RuntimeError("cannot poll a session after it has ended")
        wall = now or self.wall_clock()
        mono = self.monotonic_clock() if now_mono is None else now_mono
        timestamp = utc_iso(wall)

        if self.mouse_sampler():
            self._last_activity_mono = mono
            self._last_activity_at = timestamp
        desired = ("ACTIVE" if self._last_activity_mono is not None
                   and mono - self._last_activity_mono <= self.threshold else "INACTIVE")
        if desired != self._state:
            elapsed = max(0.0, mono - self._state_since)
            if self._state == "ACTIVE":
                self._active_seconds += elapsed
            else:
                self._inactive_seconds += elapsed
            self._state = desired
            self._state_since = mono
            self._transitions += 1
            self._activity_changes.append({
                "status": desired, "timestamp": timestamp,
                "last_activity_at": self._last_activity_at,
            })

        app = self.app_sampler()
        same = (app is None and self._current_app is None) or (
            app is not None and self._current_app is not None
            and app.executable_name.casefold() == self._current_app.executable_name.casefold()
        )
        if not same:
            self._close_app_segment(mono, timestamp)
            self._current_app = app
            if app is not None:
                self._app_segment_start_mono = mono
                self._app_segment_start_at = timestamp
        elif app is not None and self._current_app is not None:
            # Refresh display casing/name only; do not read or retain a window title.
            self._current_app = app

    def drain_batch(self, batch_id: str, pc_id: str, session_id: str,
                    final: bool = False) -> dict:
        if self._ended:
            raise RuntimeError("session already ended")
        mono = self.monotonic_clock()
        timestamp = utc_iso(self.wall_clock())
        if self._current_app is not None:
            self._close_app_segment(mono, timestamp)
        if final:
            elapsed = max(0.0, mono - self._state_since)
            if self._state == "ACTIVE":
                self._active_seconds += elapsed
            else:
                self._inactive_seconds += elapsed
            self._state_since = mono
            self._ended = True
            self._activity_changes.append({
                "status": "SESSION_ENDED", "timestamp": timestamp,
                "last_activity_at": self._last_activity_at,
            })
        summary = self._summary(mono)
        return {
            "batch_id": batch_id,
            "pc_id": pc_id,
            "session_id": session_id,
            "app_usage": self._app_records,
            "activity_changes": self._activity_changes,
            "summary": summary,
            "final": bool(final),
            "ended_at": timestamp if final else None,
        }

    def acknowledge_batch(self) -> None:
        self._app_records = []
        self._activity_changes = []


__all__ = ["Application", "UsageMonitor", "WindowsDesktopSampler", "utc_iso"]
