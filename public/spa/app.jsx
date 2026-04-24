const { useEffect, useState } = React;

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
  const [total, setTotal] = useState(0);
  const [lookups, setLookups] = useState({ salespeople: [], products: [], statuses: [], stages: [] });
  const [filters, setFilters] = useState({ search: "", salesperson: 0, product: 0, status: 0, stage: 0, sort: "date", limit: 50, offset: 0 });
  const [report, setReport] = useState({ totals: {}, graphs: {} });
  const [showCreate, setShowCreate] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [showColumns, setShowColumns] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState({
    company: true,
    name: true,
    country: true,
    site: true,
    salesperson: true,
    product: true,
    progress: true,
    date_added: true,
    estimate: true,
    quote: true,
    last_event: true,
    status: true,
    industry: true,
    application: true,
    probability: false,
    expected: false,
    email: false,
    phone: false,
    sale: false,
    customer: false,
    source: false,
    cell_phone: false,
    web_site: false,
  });
  const [newProspect, setNewProspect] = useState({
    customer_company: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_salesperson: 0,
    customer_product: 0,
    customer_stage: 0,
    customer_status: 1,
    customer_estimate: "",
    initial_note: "",
  });

  const load = async () => {
    const q = new URLSearchParams(Object.entries(filters).reduce((acc, [k, v]) => {
      if (v !== null && v !== undefined && String(v) !== "" && String(v) !== "0") acc[k] = String(v);
      return acc;
    }, {})).toString();
    const [p, r] = await Promise.all([api(`/api/prospects?${q}`), api(`/api/prospects/report?${q}`)]);
    setRows(p.prospects || []);
    setTotal(Number(p.total || 0));
    setReport(r || { totals: {}, graphs: {} });
  };

  useEffect(() => {
    api("/api/lookups/prospect-filters").then(setLookups).catch(() => {});
  }, []);
  useEffect(() => { load(); }, []); // initial

  const t = report.totals || {};
  const columnDefs = [
    { key: "company", label: "Company", description: "Company name", color: "c-blue" },
    { key: "name", label: "Name", description: "Name of the prospect to contact", color: "c-blue" },
    { key: "country", label: "Country", description: "Country of origin for the prospect", color: "c-lime" },
    { key: "salesperson", label: "Salesperson", description: "Salesperson dealing with this prospect", color: "c-pink" },
    { key: "site", label: "Site", description: "Website the prospect came from", color: "c-yellow" },
    { key: "product", label: "Product", description: "Product the prospect is interested in", color: "c-orange" },
    { key: "progress", label: "Progress", description: "Progress stage the prospect is at", color: "c-green" },
    { key: "estimate", label: "Estimate", description: "Estimated value of prospect", color: "c-khaki" },
    { key: "quote", label: "Quote", description: "Value of last quote sent out", color: "c-sky" },
    { key: "date_added", label: "Date Added", description: "Date the prospect was contacted", color: "c-lemon" },
    { key: "last_event", label: "Last Event", description: "Date of the last event with the prospect", color: "c-purple" },
    { key: "industry", label: "Industry", description: "Industry the prospect is in", color: "c-teal" },
    { key: "application", label: "Application", description: "Application the prospect uses", color: "c-red" },
    { key: "probability", label: "Probability", description: "Probability of converting to a sale", color: "c-brown" },
    { key: "expected", label: "Expected", description: "Expected sale date", color: "c-purple" },
    { key: "email", label: "Email", description: "Prospect email address", color: "c-olive" },
    { key: "phone", label: "Phone", description: "Prospect phone number", color: "c-violet" },
    { key: "status", label: "Status", description: "Prospect status - win, lose or open", color: "c-green" },
    { key: "sale", label: "Sale", description: "Value of prospect sale", color: "c-maroon" },
    { key: "customer", label: "Customer", description: "Is the prospect a previous customer", color: "c-purple" },
    { key: "source", label: "Source", description: "Where did the prospect find you", color: "c-teal" },
    { key: "cell_phone", label: "Cell Phone", description: "Prospect cell phone number", color: "c-green" },
    { key: "web_site", label: "Web Site", description: "Prospect web site address", color: "c-maroon" },
  ];
  const activeCols = columnDefs.filter((c) => visibleColumns[c.key]);
  const toggleColumn = (key) => setVisibleColumns((s) => ({ ...s, [key]: !s[key] }));
  const cellFor = (r, key) => {
    if (key === "company") return <a href={href(`/prospects/${r.customer_id}`)} onClick={(e) => { e.preventDefault(); go(`/prospects/${r.customer_id}`); }}>{r.customer_company || "(no company)"}</a>;
    if (key === "name") return r.customer_name || "";
    if (key === "country") return r.countries_name || "";
    if (key === "site") return r.site_label || "";
    if (key === "salesperson") return r.salesperson_name || "";
    if (key === "product") return r.products_name || "";
    if (key === "progress") return <div className="progress"><div style={{ width: `${r.progress_percent || 0}%`, background: r.progress_color || "#e6d443" }} /></div>;
    if (key === "date_added") return <span className="time-chip">{r.date_added_time || relDate(r.customer_date)}</span>;
    if (key === "estimate") return r.customer_estimate_display || "";
    if (key === "quote") return r.customer_quote_display || "";
    if (key === "last_event") return <span className="event-chip">{r.last_event_time || ""}</span>;
    if (key === "status") return <span className="status-pill-lite">{r.status_label || "Open"}</span>;
    if (key === "industry") return r.industries_name || "";
    if (key === "application") return r.application_name || "";
    if (key === "probability") return r.probability_name || "";
    if (key === "expected") return r.customer_sale_date ? relDate(r.customer_sale_date) : "";
    if (key === "email") return r.customer_email || "";
    if (key === "phone") return r.customer_phone || "";
    if (key === "sale") return Number(r.customer_sale || 0) > 0 ? money(r.customer_sale) : "";
    if (key === "customer") return Number(r.customer_existing || 0) === 1 ? "Yes" : "No";
    if (key === "source") return r.referral_type || "";
    if (key === "cell_phone") return r.customer_cell || "";
    if (key === "web_site") return r.customer_web || "";
    return "";
  };

  const createProspect = async () => {
    setCreateBusy(true);
    setCreateError("");
    try {
      const payload = {
        ...newProspect,
        customer_salesperson: Number(newProspect.customer_salesperson || 0),
        customer_product: Number(newProspect.customer_product || 0),
        customer_stage: Number(newProspect.customer_stage || 0),
        customer_status: Number(newProspect.customer_status || 0),
        customer_estimate: newProspect.customer_estimate === "" ? 0 : Number(newProspect.customer_estimate),
      };
      const res = await api("/api/prospects", { method: "POST", body: payload });
      setShowCreate(false);
      setNewProspect({
        customer_company: "",
        customer_name: "",
        customer_email: "",
        customer_phone: "",
        customer_salesperson: 0,
        customer_product: 0,
        customer_stage: 0,
        customer_status: 1,
        customer_estimate: "",
        initial_note: "",
      });
      await load();
      if (res?.customer_id) go(`/prospects/${res.customer_id}`);
    } catch (err) {
      setCreateError(err.message || "Failed to create prospect");
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <>
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginBottom: 0 }}>Prospect Filters</h2>
          <button className="primary" type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? "Close New Prospect" : "+ Add Prospect"}
          </button>
        </div>
        <div style={{ height: 12 }} />
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
      {showCreate ? (
        <div className="card">
          <h2>Create Prospect</h2>
          {createError ? <div className="muted" style={{ color: "#ff8f8f" }}>{createError}</div> : null}
          <div className="filter-row">
            <div className="field"><label>Company</label><input value={newProspect.customer_company} onChange={(e) => setNewProspect({ ...newProspect, customer_company: e.target.value })} /></div>
            <div className="field"><label>Contact Name</label><input value={newProspect.customer_name} onChange={(e) => setNewProspect({ ...newProspect, customer_name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input value={newProspect.customer_email} onChange={(e) => setNewProspect({ ...newProspect, customer_email: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input value={newProspect.customer_phone} onChange={(e) => setNewProspect({ ...newProspect, customer_phone: e.target.value })} /></div>
            <SelectField label="Salesperson" list={lookups.salespeople} value={newProspect.customer_salesperson} onChange={(v) => setNewProspect({ ...newProspect, customer_salesperson: Number(v) })} />
            <SelectField label="Product" list={lookups.products} value={newProspect.customer_product} onChange={(v) => setNewProspect({ ...newProspect, customer_product: Number(v) })} />
          </div>
          <div className="filter-row" style={{ marginTop: 10 }}>
            <SelectField label="Stage" list={lookups.stages} value={newProspect.customer_stage} onChange={(v) => setNewProspect({ ...newProspect, customer_stage: Number(v) })} />
            <SelectField label="Status" list={lookups.statuses} value={newProspect.customer_status} onChange={(v) => setNewProspect({ ...newProspect, customer_status: Number(v) })} />
            <div className="field"><label>Estimate</label><input type="number" value={newProspect.customer_estimate} onChange={(e) => setNewProspect({ ...newProspect, customer_estimate: e.target.value })} /></div>
            <div className="field" style={{ gridColumn: "span 3" }}><label>Initial Note</label><input value={newProspect.initial_note} onChange={(e) => setNewProspect({ ...newProspect, initial_note: e.target.value })} /></div>
          </div>
          <button className="primary" style={{ marginTop: 12 }} type="button" disabled={createBusy} onClick={createProspect}>
            {createBusy ? "Creating..." : "Create Prospect"}
          </button>
        </div>
      ) : null}

      <div className="card ai-box">
        <h2>Prospects Report</h2>
        <div className="grid">
          <div><h3>Enquiries</h3><div className="big-number">{t.enquiries || 0}</div></div>
          <div><h3>Estimates</h3><div className="big-number">{money(t.estimates_sum || 0)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="list-head">
          <h2 style={{ marginBottom: 0 }}>Prospect List <span className="results-count">{total} Results</span></h2>
          <div className="list-actions">
            <button
              type="button"
              className="table-action"
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); setShowColumns(true); }}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowColumns(true); }}
            >
              Edit Columns
            </button>
            <button type="button" className="table-action">Filters</button>
            <button type="button" className="table-action">Reports</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              {activeCols.map((c) => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.customer_id}>
                {activeCols.map((c) => <td key={c.key}>{cellFor(r, c.key)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showColumns ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="columns-modal" style={{ boxShadow: "0 18px 48px rgba(10,35,80,.28)" }}>
            <div className="columns-head">
              <h3 style={{ margin: 0 }}>Click on columns to add or remove</h3>
              <button className="table-action" type="button" onClick={() => setShowColumns(false)}>Close</button>
            </div>
            <div className="columns-grid">
              {columnDefs.map((c) => (
                <div key={c.key} className="column-card">
                  <div className={`column-icon ${c.color}`}></div>
                  <div className="column-text">
                    <div className="column-title">{c.label}</div>
                    <div className="column-desc">{c.description}</div>
                    <button className="column-toggle" type="button" onClick={() => toggleColumn(c.key)}>
                      {visibleColumns[c.key] ? "Remove Column" : "+ Add Column"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
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
  const [lookups, setLookups] = useState({ salespeople: [], products: [], statuses: [], stages: [] });
  const [edit, setEdit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activity, setActivity] = useState({ timeline_type: 1, timeline_comment: "", timeline_subject: "", timeline_sale: "", timeline_date: "" });
  const [reminder, setReminder] = useState({ timeline_comment: "", timeline_date: "" });
  useEffect(() => {
    api(`/api/prospects/${id}`).then(setDetail).catch(() => setDetail({ customer: {}, timeline: [] }));
  }, [id]);
  useEffect(() => {
    api("/api/lookups/prospect-filters").then(setLookups).catch(() => {});
  }, []);
  useEffect(() => {
    const c = detail.customer || {};
    setEdit({
      customer_company: c.customer_company || "",
      customer_name: c.customer_name || "",
      customer_email: c.customer_email || "",
      customer_phone: c.customer_phone || "",
      customer_salesperson: Number(c.customer_salesperson || 0),
      customer_product: Number(c.customer_product || 0),
      customer_stage: Number(c.customer_stage || 0),
      customer_status: Number(c.customer_status || 0),
      customer_estimate: c.customer_estimate || "",
      customer_quote: c.customer_quote || "",
    });
  }, [detail.customer?.customer_id]);

  const reload = async () => {
    const d = await api(`/api/prospects/${id}`);
    setDetail(d);
  };

  const saveCustomer = async () => {
    if (!edit) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await api(`/api/prospects/${id}`, { method: "PATCH", body: edit });
      setSaveMsg("Saved");
      await reload();
    } catch (err) {
      setSaveMsg(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const addActivity = async () => {
    try {
      await api(`/api/prospects/${id}/timeline`, {
        method: "POST",
        body: {
          timeline_type: Number(activity.timeline_type || 1),
          timeline_comment: activity.timeline_comment,
          timeline_subject: activity.timeline_subject,
          timeline_sale: activity.timeline_sale === "" ? 0 : Number(activity.timeline_sale),
        }
      });
      setActivity({ timeline_type: 1, timeline_comment: "", timeline_subject: "", timeline_sale: "", timeline_date: "" });
      await reload();
    } catch (err) {
      alert(err.message || "Failed to add activity");
    }
  };

  const addReminder = async () => {
    try {
      await api(`/api/prospects/${id}/reminder`, { method: "POST", body: reminder });
      setReminder({ timeline_comment: "", timeline_date: "" });
      await reload();
    } catch (err) {
      alert(err.message || "Failed to add reminder");
    }
  };

  const c = detail.customer || {};
  return (
    <>
      <div className="muted"><a href={href("/prospects")} onClick={(e) => { e.preventDefault(); go("/prospects"); }}>← Back to prospects</a></div>
      <div className="card">
        <h2>{c.customer_company || "(no company)"}</h2>
        <div className="muted">{c.customer_name || ""} | {c.products_name || ""}</div>
      </div>
      {edit ? (
        <div className="card">
          <h3>Edit Prospect</h3>
          <div className="filter-row">
            <div className="field"><label>Company</label><input value={edit.customer_company} onChange={(e) => setEdit({ ...edit, customer_company: e.target.value })} /></div>
            <div className="field"><label>Name</label><input value={edit.customer_name} onChange={(e) => setEdit({ ...edit, customer_name: e.target.value })} /></div>
            <div className="field"><label>Email</label><input value={edit.customer_email} onChange={(e) => setEdit({ ...edit, customer_email: e.target.value })} /></div>
            <div className="field"><label>Phone</label><input value={edit.customer_phone} onChange={(e) => setEdit({ ...edit, customer_phone: e.target.value })} /></div>
            <SelectField label="Salesperson" list={lookups.salespeople} value={edit.customer_salesperson} onChange={(v) => setEdit({ ...edit, customer_salesperson: Number(v) })} />
            <SelectField label="Product" list={lookups.products} value={edit.customer_product} onChange={(v) => setEdit({ ...edit, customer_product: Number(v) })} />
          </div>
          <div className="filter-row" style={{ marginTop: 10 }}>
            <SelectField label="Stage" list={lookups.stages} value={edit.customer_stage} onChange={(v) => setEdit({ ...edit, customer_stage: Number(v) })} />
            <SelectField label="Status" list={lookups.statuses} value={edit.customer_status} onChange={(v) => setEdit({ ...edit, customer_status: Number(v) })} />
            <div className="field"><label>Estimate</label><input type="number" value={edit.customer_estimate} onChange={(e) => setEdit({ ...edit, customer_estimate: e.target.value })} /></div>
            <div className="field"><label>Quote</label><input type="number" value={edit.customer_quote} onChange={(e) => setEdit({ ...edit, customer_quote: e.target.value })} /></div>
          </div>
          <button className="primary" style={{ marginTop: 12 }} disabled={saving} onClick={saveCustomer}>{saving ? "Saving..." : "Save Changes"}</button>
          {saveMsg ? <div className="muted" style={{ marginTop: 10 }}>{saveMsg}</div> : null}
        </div>
      ) : null}
      <div className="card">
        <h3>Add Activity</h3>
        <div className="filter-row">
          <div className="field">
            <label>Type</label>
            <select value={activity.timeline_type} onChange={(e) => setActivity({ ...activity, timeline_type: Number(e.target.value) })}>
              <option value="1">Progress</option>
              <option value="4">Sale</option>
              <option value="8">Quote</option>
              <option value="2">Lost</option>
              <option value="10">Customer Enquiry</option>
            </select>
          </div>
          <div className="field"><label>Subject</label><input value={activity.timeline_subject} onChange={(e) => setActivity({ ...activity, timeline_subject: e.target.value })} /></div>
          <div className="field"><label>Amount</label><input type="number" value={activity.timeline_sale} onChange={(e) => setActivity({ ...activity, timeline_sale: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: "span 3" }}><label>Message</label><input value={activity.timeline_comment} onChange={(e) => setActivity({ ...activity, timeline_comment: e.target.value })} /></div>
        </div>
        <button className="primary" style={{ marginTop: 12 }} onClick={addActivity}>Post Activity</button>
      </div>
      <div className="card">
        <h3>Add Reminder</h3>
        <div className="filter-row">
          <div className="field"><label>Reminder Date</label><input type="datetime-local" value={reminder.timeline_date} onChange={(e) => setReminder({ ...reminder, timeline_date: e.target.value })} /></div>
          <div className="field" style={{ gridColumn: "span 3" }}><label>Reminder Note</label><input value={reminder.timeline_comment} onChange={(e) => setReminder({ ...reminder, timeline_comment: e.target.value })} /></div>
        </div>
        <button className="primary" style={{ marginTop: 12 }} onClick={addReminder}>Create Reminder</button>
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

