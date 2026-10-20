# Session usage monitoring

This adds a small interactive-session companion without changing the existing hardware-removal polling path. The supplied project did not include a Windows Service implementation, a student login/session manager, a computer registry, or an existing student-session API. `hardware_monitor.py` is a standalone WMI polling loop; the `nssm.exe` utility is present, but no service wrapper/installer or session callbacks are included. The companion is therefore an integration point for the real session-start owner, not an invented automatic login detector.

## Privacy and collection boundary

Monitoring starts only after `POST /api/monitoring/sessions/start` accepts an authorized session ID and the configured computer ID. Run `session_companion.py` in the logged-in Windows student's interactive session, not from Session 0. It records executable/application identity, application interval start/end and duration, mouse activity timestamps, activity state transitions, and aggregate durations. It does not read window titles, typed text, keys, screenshots, clipboard data, web page contents, or persist cursor coordinates. Mouse coordinates are compared transiently in memory only. Activity state starts as `INACTIVE` until mouse activity is observed; after the configured threshold (300 seconds by default) without mouse input it becomes `INACTIVE`.

## Backend setup

In `Backend/.env`, keep the existing `MONGO_URI` and `AGENT_KEY` settings and add a comma-separated computer allowlist:

```dotenv
AGENT_PC_IDS=LAB-01-PC-12,LAB-01-PC-13
```

The new endpoints fail closed for computer IDs not in `AGENT_PC_IDS`. Start the backend from PowerShell or Command Prompt:

```powershell
cd C:\SmartLabGuardian\Backend
npm ci
npm start
```

The backend adds authenticated endpoints under `/api/monitoring` and two MongoDB collections: `MonitoringSession` and `MonitoringBatch`. MongoDB must be running and the existing `AGENT_KEY` must match the client-agent key. For production, use TLS for non-loopback API URLs and a distinct agent key per computer if the existing authentication system is upgraded to support it.

## Agent setup and run

On each Windows lab PC, from `client-agent`:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item config.example.json config.json
```

Edit `config.json` to set the actual `pc_id`, backend `api_url`, and shared `agent_key`; make sure `pc_id` appears in backend `AGENT_PC_IDS`. The example also includes `inactivity_threshold_seconds` (default 300), `monitor_poll_seconds` (default 1), `usage_upload_interval_seconds` (default 60), and `monitoring_api_url`. If `monitoring_api_url` is omitted, it is derived from the existing `api_url`.

The original hardware-removal agent remains independently runnable as before:

```powershell
python hardware_monitor.py
```

To start session usage monitoring, the already-authorized session owner must launch this command as the interactive student user, supplying the ID of the successfully authorized student session:

```powershell
python session_companion.py --session-id <authorized-session-id>
```

Do not start the companion at machine boot, before session authorization, or as a Session 0 service. On session cancellation/end, the owner must stop the companion (Ctrl+C or SIGTERM); it flushes a final summary and posts `SESSION_ENDED`. Keep and terminate the companion process handle per session. Pending batches are stored in a SQLite outbox below `%LOCALAPPDATA%\\SmartLabGuardian` (or the user's local AppData directory as fallback) and retried with stable batch IDs.

## Session-owner integration boundary

The existing project has no event or API where an authorized student session begins or ends. The actual login/session owner must:

1. After authorizing and successfully creating a student session, launch `session_companion.py --session-id <existing-session-id>` in that interactive user session. Pass the ID from the authorized flow; do not invent one.
2. Keep the child process associated with that session and stop it when the session is cancelled/ended.
3. Configure a valid, distinct `pc_id` per computer and add it to `AGENT_PC_IDS`.

This automatic start/stop cannot be wired into the supplied implementation because that session-owner code is absent. A Windows Session 0 service cannot directly access the interactive desktop; the owner must use its existing user-session launcher or a per-user logon task gated on session authorization. The API currently has a global shared agent key and no student-session authority. The allowlist prevents arbitrary computer IDs, but only the real session manager can supply a genuine authorized session ID. Per-computer keys and authenticated student-session validation require the missing identity/session system.

## Tests and limitations

Run the available tests from `client-agent`:

```powershell
python -m unittest discover -s tests -v
```

They exercise app switching, duration accounting, inactivity-threshold transitions, shutdown/data-minimization invariants, and companion ordering using injected clocks/samples and a fake API response. Python and backend JavaScript syntax checks pass. A live MongoDB/API integration test and Windows desktop API test were not possible in the supplied sandbox because it has no MongoDB server, backend dependencies installed, or Windows interactive desktop. Verify those on a Windows lab PC with the backend configured before deployment.
