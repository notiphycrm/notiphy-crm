const { useEffect, useMemo, useState } = React;

function getCrmBase() {
  if (typeof window === "undefined") return "";
  const b = window.__CRM_BASE__;
  if (b === undefined || b === null) return "";
  return String(b).replace(/\/$/, "");
}

function appRouteFromLocation() {
  let p = window.location.pathname || "/";
  const base = getCrmBase();
  if (base && p.startsWith(base)) {
    p = p.slice(base.length) || "/";
  }
  if (!p.startsWith("/")) p = "/" + p;
  return p;
}

function href(route) {
  const base = getCrmBase();
  const r = route.startsWith("/") ? route : "/" + route;
  return (base + r) || r;
}

async function api(path, opts = {}) {
  const url = path.startsWith("http") ? path : href(path.startsWith("/") ? path : "/" + path);
  const res = await fetch(url, {
    method: opts.method || "GET",
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: "Invalid server response" };
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function money(n) {
  const v = Number(n || 0);
  return `£${v.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

function relDate(input) {
  if (!input) return "";
  const ts = new Date(input).getTime();
  if (Number.isNaN(ts)) return "";
  const diffHours = Math.floor((Date.now() - ts) / (1000 * 60 * 60));
  if (diffHours < 24) return `${Math.max(1, diffHours)} hrs ago`;
  return `${Math.floor(diffHours / 24)} days ago`;
}

function App() {
  const [path, setPath] = useState(() => {
    const r = appRouteFromLocation();
    return r === "/" ? "/dashboard" : r;
  });
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const onPop = () => {
      const r = appRouteFromLocation();
      setPath(r === "/" ? "/dashboard" : r);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = (to) => {
    const route = to === "/" ? "/dashboard" : to;
    window.history.pushState({}, "", href(route));
    setPath(route);
  };

  const onLogin = (user) => {
    setMe(user || {});
    setError("");
    go("/dashboard");
  };

  const logout = async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    setMe(null);
    go("/dashboard");
  };

  if (!me) {
    return <LoginPage onLogin={onLogin} error={error} setError={setError} />;
  }

  return (
    <>
      <header className="topbar">
        <div className="brand">Notiphy CRM</div>
        <nav className="topnav">
          <a href={href("/dashboard")} className="topnav-link" onClick={(e) => { e.preventDefault(); go("/dashboard"); }}>Dashboard</a>
          <a href={href("/prospects")} className="topnav-link" onClick={(e) => { e.preventDefault(); go("/prospects"); }}>Prospects</a>
          <a href={href("/notifications")} className="topnav-link" onClick={(e) => { e.preventDefault(); go("/notifications"); }}>Notifications</a>
          <button className="topnav-link btn-link" onClick={logout} type="button">Logout</button>
        </nav>
      </header>
      <main className="container">
        {path === "/dashboard" || path === "/" ? <DashboardPage /> : null}
        {path === "/prospects" ? <ProspectsPage go={go} /> : null}
        {path.startsWith("/prospects/") ? <ProspectDetailPage id={Number(path.split("/")[2] || 0)} go={go} /> : null}
        {path === "/notifications" ? <NotificationsPage /> : null}
      </main>
    </>
  );
}

function LoginPage({ onLogin, error, setError }) {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const out = await api("/api/auth/login", { method: "POST", body: { user, password } });
      onLogin(out.user || {});
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container">
      <div className="card login-wrap">
        <h1>Login</h1>
        {error ? <div className="muted">{error}</div> : null}
        <form onSubmit={submit}>
          <div className="field">
            <label>Username</label>
            <input value={user} onChange={(e) => setUser(e.target.value)} />
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="primary" style={{ marginTop: 14 }} disabled={loading} type="submit">
            {loading ? "Signing in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardPage() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api("/api/dashboard").then(setData).catch(() => setData({ cards: {}, trend: {} }));
  }, []);
  useEffect(() => {
    if (!data?.trend?.labels || typeof Chart === "undefined") return;
    const ctx = document.getElementById("dashTrend")?.getContext?.("2d");
    if (!ctx) return;
    if (window.__dash) window.__dash.destroy();
    window.__dash = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.trend.labels,
        datasets: [
          { label: "Enquiries", data: data.trend.enquiries || [], borderColor: "#2d66cf", fill: false, tension: 0.2 },
          { label: "Quotes", data: data.trend.quotes || [], borderColor: "#f3d06a", fill: false, tension: 0.2 },
          { label: "Sales", data: data.trend.sales || [], borderColor: "#29bb52", fill: false, tension: 0.2 },
        ],
      },
    });
  }, [data]);
  const c = data?.cards || {};
  return (
    <>
      <div className="grid dashboard-grid">
        <div className="card dashboard-card"><h3>New Enquiries</h3><div className="big-number">{c.new_enquiries || 0}</div></div>
        <div className="card dashboard-card"><h3>No. Quotes</h3><div className="big-number">{c.quotes_count || 0}</div><div className="muted">Total: {money(c.quotes_total || 0)}</div></div>
        <div className="card dashboard-card"><h3>No. Orders</h3><div className="big-number" style={{ color: "#29bb52" }}>{c.orders_count || 0}</div><div className="muted">Total: {money(c.orders_total || 0)}</div></div>
      </div>
      <div className="card">
        <h2>Enquiries Report</h2>
        <canvas id="dashTrend" height="120"></canvas>
      </div>
    </>
  );
}

function ProspectsPage({ go }) {
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({ salespeople: [], products: [], statuses: [], stages: [] });
  const [filters, setFilters] = useState({ search: "", salesperson: 0, product: 0, status: 0, stage: 0, sort: "date", limit: 50, offset: 0 });
  const [report, setReport] = useState({ totals: {}, graphs: {} });

  const load = async () => {
    const q = new URLSearchParams(Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== null && v !== undefined && String(v) !== "" && String(v) !== "0") acc[k] = String(v);
      return acc;
    }, {})).toString();
    const [p, r] = await Promise.all([api(`/api/prospects?${q}`), api(`/api/prospects/report?${q}`)]);
    setRows(p.prospects || []);
    setReport(r || { totals: {}, graphs: {} });
  };

  useEffect(() => {
    api("/api/lookups/prospect-filters").then(setLookups).catch(() => {});
  }, []);
  useEffect(() => { load(); }, []); // initial

  const t = report.totals || {};
  return (
    <>
      <div className="card">
        <h2>Prospect Filters</h2>
        <div className="filter-row">
          <div className="field"><label>Search</label><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></div>
          <SelectField label="Salesperson" list={lookups.salespeople} value={filters.salesperson} onChange={(v) => setFilters({ ...filters, salesperson: Number(v) })} />
          <SelectField label="Product" list={lookups.products} value={filters.product} onChange={(v) => setFilters({ ...filters, product: Number(v) })} />
          <SelectField label="Stage" list={lookups.stages} value={filters.stage} onChange={(v) => setFilters({ ...filters, stage: Number(v) })} />
          <SelectField label="Status" list={lookups.statuses} value={filters.status} onChange={(v) => setFilters({ ...filters, status: Number(v) })} />
          <div className="field"><label>Sort</label><select value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="date">Date Added</option><option value="latest">Latest Activity</option><option value="estimate">Estimate</option><option value="quote">Quote</option></select></div>
        </div>
        <button className="primary" style={{ marginTop: 12 }} onClick={load}>Apply Filters</button>
      </div>

      <div className="card ai-box">
        <h2>Prospects Report</h2>
        <div className="grid">
          <div><h3>Enquiries</h3><div className="big-number">{t.enquiries || 0}</div></div>
          <div><h3>Estimates</h3><div className="big-number">{money(t.estimates_sum || 0)}</div></div>
        </div>
      </div>

      <div className="card">
        <h2>Prospect List</h2>
        <table>
          <thead>
            <tr>
              <th>Company</th><th>Name</th><th>Salesperson</th><th>Product</th><th>Date Added</th><th>Estimate</th><th>Quote</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id}>
                <td><a href={href(`/prospects/${r.customer_id}`)} onClick={(e) => { e.preventDefault(); go(`/prospects/${r.customer_id}`); }}>{r.customer_company || "(no company)"}</a></td>
                <td>{r.customer_name || ""}</td>
                <td>{r.salesperson_name || ""}</td>
                <td>{r.products_name || ""}</td>
                <td>{r.date_added_time || relDate(r.customer_date)}</td>
                <td>{r.customer_estimate_display || ""}</td>
                <td>{r.customer_quote_display || ""}</td>
                <td><span className="pill status-pill">{r.status_label || "Open"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SelectField({ label, list, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <select value={String(value || 0)} onChange={(e) => onChange(e.target.value)}>
        <option value="0">All</option>
        {(list || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </select>
    </div>
  );
}

function ProspectDetailPage({ id, go }) {
  const [detail, setDetail] = useState({ customer: {}, timeline: [] });
  useEffect(() => {
    api(`/api/prospects/${id}`).then(setDetail).catch(() => setDetail({ customer: {}, timeline: [] }));
  }, [id]);
  const c = detail.customer || {};
  return (
    <>
      <div className="muted"><a href={href("/prospects")} onClick={(e) => { e.preventDefault(); go("/prospects"); }}>← Back to prospects</a></div>
      <div className="card">
        <h2>{c.customer_company || "(no company)"}</h2>
        <div className="muted">{c.customer_name || ""} | {c.products_name || ""}</div>
      </div>
      <div className="card">
        <h3>Timeline</h3>
        {(detail.timeline || []).map((t) => (
          <div key={t.timeline_id} className="timeline-item">
            <div className="top"><div className="type">{t.label || "Activity"}</div><div className="when">{t.timeline_date_display || ""}</div></div>
            <div className="msg">{t.timeline_comment || t.timeline_subject || ""}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [data, setData] = useState({ tabs: {}, notifications: [], user: {} });
  useEffect(() => { api(`/api/notifications?tab=${encodeURIComponent(tab)}`).then(setData).catch(() => {}); }, [tab]);
  const tabs = data.tabs || {};
  return (
    <div className="card">
      <h2>Notifications for {data.user?.name || "Salesperson"}</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {["all", "unseen", "overdue", "enquiries", "tracking", "interests"].map((k) => (
          <button key={k} type="button" className="topnav-link" style={{ borderColor: tab === k ? "rgba(79,125,255,.55)" : "rgba(255,255,255,.1)" }} onClick={() => setTab(k)}>
            {k.toUpperCase()} {typeof tabs[k] === "number" ? tabs[k] : ""}
          </button>
        ))}
      </div>
      {(data.notifications || []).map((n) => (
        <div key={n.notification_id} className="timeline-item">
          <div className="top"><div className="type">{n.title || "Notification"}</div><div className="when">{n.notification_date_display || ""}</div></div>
          <div className="msg">{n.message || ""}</div>
        </div>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);

