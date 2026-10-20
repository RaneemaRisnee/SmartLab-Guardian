import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

const LAB = "CL1";
const pad = (n) => String(n).padStart(2, "0");
const STATUS = {
  pending: "Waiting for PC",
  dispatched: "PC is signing in…",
  signed_in: "Signed in",
  failed: "Login failed",
  no_login: "No login in Excel",
};


const shuffle = (a) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};


const api = async (url, method = "GET", body) => {
  const token = sessionStorage.getItem("token");
  const r = await fetch("/api" + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body && JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && token) { sessionStorage.clear(); location.reload(); }
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d;
};


return (
    <>
      <header className="top">
        <div>
          <h1>Exam login setup · Lab {LAB}</h1>
          <p>Pick PCs, load students, assign, save, then start.</p>
        </div>
        <div className="who">{user.name || user.username} ({user.role}) <button onClick={logout}>Log out</button></div>
      </header>
      <main>
        <section>
          <h2>Exam details</h2>
          <label>Exam name</label>
          <input value={f.name} onChange={set("name")} placeholder="IT3162 Semester Exam" />
          <label>Date</label>
          <input type="date" value={f.date} onChange={set("date")} />
          <div className="two">
            <div><label>Start</label><input type="time" value={f.start} onChange={set("start")} /></div>
            <div><label>End</label><input type="time" value={f.end} onChange={set("end")} /></div>
          </div>
          <h2 style={{ marginTop: 18 }}>Students</h2>
          <label>Excel / CSV with columns: Reg No | Name | Username | Password</label>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
          <label>Or paste one per line: regno, name, username, password</label>
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="2022/ICT/36, Thenuwara, ict36, pass123" />
          <div className="row"><button onClick={() => load(paste.split("\n").filter((l) => l.trim()).map((l) => l.split(/\t|,/)))}>Load pasted list</button></div>
          <label className="chk"><input type="checkbox" checked={shuf} onChange={(e) => setShuf(e.target.checked)} /> Shuffle students before assigning</label>
          {msg && <p className="msg">{msg}</p>}
        </section>

        <section>
          <h2>Lab {LAB} map</h2>
          <div className="row">
            <button onClick={() => pick("odd")}>Odd PCs</button>
            <button onClick={() => pick("even")}>Even PCs</button>
            <button onClick={() => pick("all")}>All PCs</button>
            <button onClick={random}>Random PCs</button>
            <button onClick={() => pick("none")}>Clear</button>
          </div>
          {!pcs.length && <p className="msg">No PCs found. Run <code>npm run seed</code> in the server folder.</p>}
          <div className="front">Front of lab</div>
          <div className="grid">
            {nums.map((n) => (
              <button key={n} className={"pc" + (asg[n] ? " asg" : sel.has(n) ? " sel" : "")} onClick={() => toggle(n)} title={asg[n]?.name || ""}>
                <b>PC {pad(n)}</b>
                <small>{asg[n] ? asg[n].regNo : sel.has(n) ? "selected" : "free"}</small>
              </button>
            ))}
          </div>
          <p className="stat">{sel.size} PCs selected, {students.length} students loaded.</p>
          <div className="row">
            <button className="pri" onClick={assign}>Assign students</button>
            <button onClick={() => setAsg({})}>Reset</button>
            <button className="pri" onClick={save} disabled={!rows.length}>Save exam</button>
          </div>
        </section>

        {rows.length > 0 && (
          <section className="wide">
            <h2>Preview</h2>
            <table>
              <thead><tr><th>PC</th><th>Reg no</th><th>Name</th></tr></thead>
              <tbody>{rows.map((p) => <tr key={p}><td>PC {pad(p)}</td><td>{asg[p].regNo}</td><td>{asg[p].name}</td></tr>)}</tbody>
            </table>
          </section>
        )}

        <section className="wide">
          <h2>Saved exams</h2>
          {!exams.length && <p className="stat">No exams saved yet.</p>}
          {exams.map((x) => (
            <div className="exam" key={x._id}>
              <span><b>{x.name}</b> · {x.examDate} · {x.startTime}–{x.endTime} <i className={"badge " + x.status}>{x.status}</i></span>
              <span className="row">
                <button onClick={() => setVid(x._id)}>View</button>
                {x.status === "active"
                  ? <button className="pri" onClick={() => end(x._id)}>End exam</button>
                  : <button className="pri" onClick={() => start(x._id)}>Start exam login</button>}
                <button onClick={() => remove(x._id)}>Delete</button>
              </span>
            </div>
          ))}
          {view && vid === view.exam._id && (
            <>
              <h2 style={{ marginTop: 16 }}>{view.exam.name}: live status</h2>
              <table>
                <thead><tr><th>PC</th><th>Reg no</th><th>Name</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {view.assignments.map((a) => (
                    <tr key={a._id}>
                      <td>PC {pad(a.pcNumber)}</td><td>{a.regNo}</td><td>{a.studentName}</td>
                      <td><i className={"badge " + a.status}>{STATUS[a.status]}</i></td>
                      <td>{["failed", "dispatched"].includes(a.status) && view.exam.status === "active" &&
                        <button onClick={() => act(`/exams/${vid}/resend/${a.pcNumber}`, () => `PC ${pad(a.pcNumber)} will try again.`)}>Try again</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      </main>
    </>
  );

export default function App() {
  return <ExamSetup user={{ username: "admin", role: "admin" }} logout={() => {}} />;
}