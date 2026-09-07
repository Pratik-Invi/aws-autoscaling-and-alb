import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const levels = ["low", "medium", "high", "extreme"];

function App() {
  const [level, setLevel] = useState("medium");
  const [running, setRunning] = useState(false);
  const [info, setInfo] = useState(null);
  const [events, setEvents] = useState([]);
  const [rate, setRate] = useState(10);

  async function refresh() {
    try {
      const r = await fetch("/api/info");
      const data = await r.json();
      setInfo(data);
      setRunning(data.loadRunning);
    } catch (_) {}
  }

  async function start() {
    await fetch("/api/load/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level })
    });
    setRunning(true);
    refresh();
  }

  async function stop() {
    await fetch("/api/load/stop", { method: "POST" });
    setRunning(false);
    refresh();
  }

  async function generateRequest() {
    try {
      const r = await fetch("/api/load");
      const data = await r.json();
      setEvents(e => [{ time: new Date().toLocaleTimeString(), ...data }, ...e].slice(0, 30));
      setInfo(data);
    } catch (_) {}
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!running) return;
    const interval = Math.max(20, 1000 / rate);
    const timer = setInterval(generateRequest, interval);
    return () => clearInterval(timer);
  }, [running, rate, level]);

  return (
    <div className="page">
      <header>
        <h1>AWS Auto Scaling Lab</h1>
        <p>ALB traffic distribution + EC2 Auto Scaling demonstration</p>
      </header>

      <section className="grid">
        <div className="card">
          <h2>Traffic Control</h2>
          <label>Load level</label>
          <div className="levels">
            {levels.map(l => (
              <button className={level === l ? "active" : ""} onClick={() => setLevel(l)} key={l}>{l}</button>
            ))}
          </div>

          <label>Approx. requests / second: <b>{rate}</b></label>
          <input type="range" min="1" max="50" value={rate} onChange={e => setRate(Number(e.target.value))} />

          <div className="actions">
            <button className="start" onClick={start}>Start Load</button>
            <button className="stop" onClick={stop}>Stop Load</button>
          </div>
          <p className={running ? "status on" : "status"}>{running ? "● Load running" : "● Load stopped"}</p>
        </div>

        <div className="card">
          <h2>Current Request Target</h2>
          {info ? (
            <div className="details">
              <Row k="Instance ID" v={info.instanceId}/>
              <Row k="Hostname" v={info.hostname}/>
              <Row k="Private IP" v={info.privateIp}/>
              <Row k="Availability Zone" v={info.availabilityZone}/>
              <Row k="Container ID" v={info.containerId}/>
            </div>
          ) : <p>Waiting for backend...</p>}
        </div>
      </section>

      <section className="card">
        <h2>Recent ALB Requests</h2>
        <p className="hint">Each row shows the EC2 instance that processed a request through the ALB.</p>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Time</th><th>Instance</th><th>Private IP</th><th>AZ</th><th>Work</th></tr></thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td>{e.time}</td><td>{e.instanceId}</td><td>{e.privateIp}</td><td>{e.availabilityZone}</td><td>{e.workMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>How to read this dashboard</h2>
        <ol>
          <li>Start with one EC2 instance in the Auto Scaling Group.</li>
          <li>Start a high/extreme load and watch CPU in CloudWatch.</li>
          <li>When the scaling policy triggers, a new EC2 instance is launched.</li>
          <li>After its <code>/health</code> check becomes healthy, the ALB sends traffic to it.</li>
          <li>Watch the request table to see traffic distributed between instances.</li>
          <li>Stop the load and wait for the scale-in policy to remove an instance.</li>
        </ol>
      </section>
    </div>
  );
}

function Row({ k, v }) {
  return <div className="row"><span>{k}</span><strong>{v || "-"}</strong></div>;
}

createRoot(document.getElementById("root")).render(<App />);
