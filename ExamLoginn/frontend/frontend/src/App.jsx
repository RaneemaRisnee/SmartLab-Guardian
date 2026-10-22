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

function parseRows(rows) {
  rows = rows.filter((r) => r.some((c) => String(c).trim()));
  const head = (rows[0] || []).map((c) => String(c).toLowerCase());
  const find = (re, d) => { const i = head.findIndex((c) => re.test(c)); return i < 0 ? d : i; };
  let ix = { reg: 0, name: 1, user: 2, pass: 3 };
  if (head.some((c) => /reg|name|user|pass/.test(c))) {
    ix = { reg: find(/reg|index/, 0), name: find(/^(student\s*|full\s*)?name$/, 1), user: find(/user|login/, 2), pass: find(/pass/, 3) };
    rows = rows.slice(1);
  }
  const get = (r, i) => String(r[i] ?? "").trim();
  return rows
    .map((r) => ({ regNo: get(r, ix.reg), name: get(r, ix.name), username: get(r, ix.user), password: get(r, ix.pass) }))
    .filter((s) => s.regNo && s.name);
}

function ExamSetup({ user, logout }) {
  const [pcs, setPcs] = useState([]);
  const [sel, setSel] = useState(new Set());
  const [students, setStudents] = useState([]);
  const [asg, setAsg] = useState({});
  const [shuf, setShuf] = useState(false);
  const [paste, setPaste] = useState("");
  const [f, setF] = useState({ name: "", date: new Date().toISOString().slice(0, 10), start: "09:00", end: "11:00" });
  const [exams, setExams] = useState([]);
  const [vid, setVid] = useState(null);
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState("");

  const loadExams = () => api("/exams?lab=" + LAB).then(setExams).catch((e) => setMsg(e.message));
  const loadView = () => vid && api("/exams/" + vid).then(setView).catch((e) => setMsg(e.message));

  useEffect(() => { // live status while an exam is open
    loadView();
    const t = setInterval(loadView, 4000);
    return () => clearInterval(t);
  }, [vid]);

  const nums = pcs.map((p) => p.pcNumber);
 
  const pick = (q) => {
    setAsg({});
    setSel(new Set(nums.filter((n) => q === "all" || (q === "odd" && n % 2) || (q === "even" && !(n % 2)))));
  };

   const random = () => {
    setAsg({});
    setSel(new Set(shuffle(nums).slice(0, students.length || Math.ceil(nums.length / 2))));
  };
  const toggle = (n) => {
    const s = new Set(sel);
    if (s.has(n)) { s.delete(n); const a = { ...asg }; delete a[n]; setAsg(a); } else s.add(n);
    setSel(s);
  };

  const load = async (rows) => {
    const s = parseRows(rows);
    if (!s.length) return setMsg("0 students found. Use a header row like: Reg No | Name | Username | Password");
    try {
      const d = await api("/students/import", "POST", { students: s });
      setStudents(s.map(({ regNo, name }) => ({ regNo, name })));
      setAsg({});
      setMsg(`${d.imported} students loaded, ${d.withLogin} with login details.`);
    } catch (e) { setMsg(e.message); }
  };

  const onFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      await load(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" }));
    } catch (err) { setMsg("Could not read the file: " + err.message); }
    e.target.value = "";
  };

  
  const assign = () => {
    const p = [...sel].sort((a, b) => a - b);
    if (!students.length || !p.length) return setMsg("Load students and select PCs first.");
    if (students.length > p.length) return setMsg(`Select ${students.length - p.length} more PC(s).`);
    const list = shuf ? shuffle(students) : students;
    const a = {};
    list.forEach((s, i) => (a[p[i]] = s));
    setAsg(a);
    setMsg("Assigned. Review the list, then save the exam.");
  };


  const save = async () => {
    const assignments = Object.entries(asg).map(([pc, s]) => ({ pcNumber: +pc, regNo: s.regNo, name: s.name }));
    if (!f.name || !assignments.length) return setMsg("Enter an exam name and assign students first.");
    try {
      const d = await api("/exams", "POST", { name: f.name, lab: LAB, examDate: f.date, startTime: f.start, endTime: f.end, assignments });
      setMsg("Exam saved." + (d.missing.length ? ` No login details for: ${d.missing.join(", ")}` : ""));
      loadExams();
    } catch (e) { setMsg(e.message); }
  };


  const act = async (path, ok) => {
    try {
      const d = await api(path, "POST");
      setMsg(ok(d));
    } catch (e) { setMsg(e.message); }
    loadExams(); loadView();
  };


  const start = (id) => {
    if (!confirm("Start this exam? Lab PCs will RESTART and sign in their students.")) return;
    setVid(id);
    act(`/exams/${id}/start`, (d) => "Exam started. Lab PCs are signing in." + (d.missing.length ? ` No login details for: ${d.missing.join(", ")}` : ""));
  };


  const end = (id) => act(`/exams/${id}/end`, () => "Exam ended.");
  const remove = async (id) => {
    if (!confirm("Delete this exam and its assignments?")) return;
    await api("/exams/" + id, "DELETE");
    setVid(null); setView(null); loadExams();
  };


  const rows = Object.keys(asg).map(Number).sort((a, b) => a - b);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

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

}

export default function App() {
  return <ExamSetup user={{ username: "admin", role: "admin" }} logout={() => {}} />;
}

