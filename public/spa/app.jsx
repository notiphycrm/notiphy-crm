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

function ColumnIcon({ name }) {
  const common = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "user") return <svg {...common}><circle cx="12" cy="8" r="3.5" /><path d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" /></svg>;
  if (name === "globe") return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M3.5 12h17" /><path d="M12 3a15 15 0 0 1 0 18" /><path d="M12 3a15 15 0 0 0 0 18" /></svg>;
  if (name === "sales") return <svg {...common}><circle cx="8.5" cy="8" r="2.2" /><circle cx="15.5" cy="8" r="2.2" /><path d="M4.5 18c.8-2.2 2.4-3.5 4-3.5s3.2 1.3 4 3.5" /><path d="M11.5 18c.8-2.2 2.4-3.5 4-3.5s3.2 1.3 4 3.5" /></svg>;
  if (name === "site") return <svg {...common}><rect x="3.5" y="5" width="17" height="12" rx="2" /><path d="M3.5 9h17" /><path d="M7 19h10" /></svg>;
  if (name === "box") return <svg {...common}><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4" /><path d="M12 11v10" /></svg>;
  if (name === "progress") return <svg {...common}><path d="M4 20V9" /><path d="M10 20V5" /><path d="M16 20v-7" /><path d="M22 20H2" /></svg>;
  if (name === "money") return <svg {...common}><rect x="3.5" y="6" width="17" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 12h.01M17.5 12h.01" /></svg>;
  if (name === "file") return <svg {...common}><path d="M8 3.5h6l4 4V20a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" /><path d="M14 3.5V8h4" /></svg>;
  if (name === "calendar") return <svg {...common}><rect x="3.5" y="5.5" width="17" height="15" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3.5v4M16 3.5v4" /></svg>;
  if (name === "clock") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v5l3.5 2" /></svg>;
  if (name === "factory") return <svg {...common}><path d="M3.5 20V9.5l6 3v-3l6 3v-3l5 2.5V20Z" /><path d="M9 20v-4h3v4" /></svg>;
  if (name === "app") return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8.5 8.5h7v7h-7z" /></svg>;
  if (name === "percent") return <svg {...common}><path d="M6 18 18 6" /><circle cx="7" cy="7" r="2" /><circle cx="17" cy="17" r="2" /></svg>;
  if (name === "mail") return <svg {...common}><rect x="3.5" y="6" width="17" height="12" rx="2" /><path d="m4.5 8 7.5 5 7.5-5" /></svg>;
  if (name === "phone") return <svg {...common}><path d="M7 4h3l1 4-2 1a14 14 0 0 0 6 6l1-2 4 1v3c0 1-1 2-2 2A16 16 0 0 1 5 6c0-1 1-2 2-2Z" /></svg>;
  if (name === "target") return <svg {...common}><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.5" /></svg>;
  if (name === "star") return <svg {...common}><path d="m12 3.8 2.5 5.1 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z" /></svg>;
  if (name === "check") return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5" /></svg>;
}

function App() {
  const [path, setPath] = useState(() => {
    const r = appRouteFromLocation();
    return r === "/" ? "/dashboard" : r;
  });
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const onPop = () => {
      const r = appRouteFromLocation();
      setPath(r === "/" ? "/dashboard" : r);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    let cancelled = false;
    api("/api/auth/me")
      .then((out) => {
        if (!cancelled) setMe(out.user || null);
      })
      .catch(() => {
        if (!cancelled) setMe(null);
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
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

  if (!authChecked) {
    return (
      <div className="container">
        <div className="card login-wrap">
          <h1>Loading...</h1>
          <div className="muted">Checking your session</div>
        </div>
      </div>
    );
  }

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
  const [tableSort, setTableSort] = useState({ key: "date_added", dir: "desc" });
  const [columnWidths, setColumnWidths] = useState({
    company: 170,
    name: 170,
    country: 120,
    site: 120,
    salesperson: 130,
    product: 120,
    progress: 120,
    date_added: 95,
    estimate: 110,
    quote: 100,
    last_event: 95,
    status: 110,
    industry: 120,
    application: 120,
    probability: 110,
    expected: 110,
    email: 180,
    phone: 130,
    sale: 100,
    customer: 110,
    source: 120,
    cell_phone: 130,
    web_site: 170,
  });
  const [resizing, setResizing] = useState(null);
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
    { key: "company", label: "Company", description: "Company name", color: "c-blue", icon: "factory" },
    { key: "name", label: "Name", description: "Name of the prospect to contact", color: "c-blue", icon: "user" },
    { key: "country", label: "Country", description: "Country of origin for the prospect", color: "c-lime", icon: "globe" },
    { key: "salesperson", label: "Salesperson", description: "Salesperson dealing with this prospect", color: "c-pink", icon: "sales" },
    { key: "site", label: "Site", description: "Website the prospect came from", color: "c-yellow", icon: "site" },
    { key: "product", label: "Product", description: "Product the prospect is interested in", color: "c-orange", icon: "box" },
    { key: "progress", label: "Progress", description: "Progress stage the prospect is at", color: "c-green", icon: "progress" },
    { key: "estimate", label: "Estimate", description: "Estimated value of prospect", color: "c-khaki", icon: "money" },
    { key: "quote", label: "Quote", description: "Value of last quote sent out", color: "c-sky", icon: "file" },
    { key: "date_added", label: "Date Added", description: "Date the prospect was contacted", color: "c-lemon", icon: "calendar" },
    { key: "last_event", label: "Last Event", description: "Date of the last event with the prospect", color: "c-purple", icon: "clock" },
    { key: "industry", label: "Industry", description: "Industry the prospect is in", color: "c-teal", icon: "factory" },
    { key: "application", label: "Application", description: "Application the prospect uses", color: "c-red", icon: "app" },
    { key: "probability", label: "Probability", description: "Probability of converting to a sale", color: "c-brown", icon: "percent" },
    { key: "expected", label: "Expected", description: "Expected sale date", color: "c-purple", icon: "target" },
    { key: "email", label: "Email", description: "Prospect email address", color: "c-olive", icon: "mail" },
    { key: "phone", label: "Phone", description: "Prospect phone number", color: "c-violet", icon: "phone" },
    { key: "status", label: "Status", description: "Prospect status - win, lose or open", color: "c-green", icon: "check" },
    { key: "sale", label: "Sale", description: "Value of prospect sale", color: "c-maroon", icon: "money" },
    { key: "customer", label: "Customer", description: "Is the prospect a previous customer", color: "c-purple", icon: "user" },
    { key: "source", label: "Source", description: "Where did the prospect find you", color: "c-teal", icon: "star" },
    { key: "cell_phone", label: "Cell Phone", description: "Prospect cell phone number", color: "c-green", icon: "phone" },
    { key: "web_site", label: "Web Site", description: "Prospect web site address", color: "c-maroon", icon: "site" },
  ];
  const activeCols = columnDefs.filter((c) => visibleColumns[c.key]);
  const toggleColumn = (key) => setVisibleColumns((s) => ({ ...s, [key]: !s[key] }));
  const toggleColumnsModal = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowColumns((v) => !v);
  };
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
  const sortableValueFor = (r, key) => {
    if (key === "company") return String(r.customer_company || "").toLowerCase();
    if (key === "name") return String(r.customer_name || "").toLowerCase();
    if (key === "country") return String(r.countries_name || "").toLowerCase();
    if (key === "site") return String(r.site_label || "").toLowerCase();
    if (key === "salesperson") return String(r.salesperson_name || "").toLowerCase();
    if (key === "product") return String(r.products_name || "").toLowerCase();
    if (key === "progress") return Number(r.progress_percent || 0);
    if (key === "estimate") return Number(r.customer_estimate || 0);
    if (key === "quote") return Number(r.customer_quote || 0);
    if (key === "sale") return Number(r.customer_sale || 0);
    if (key === "date_added") return new Date(r.customer_date || 0).getTime() || 0;
    if (key === "last_event") return new Date(r.last_timeline_date || 0).getTime() || 0;
    if (key === "expected") return new Date(r.customer_sale_date || 0).getTime() || 0;
    if (key === "industry") return String(r.industries_name || "").toLowerCase();
    if (key === "application") return String(r.application_name || "").toLowerCase();
    if (key === "probability") return String(r.probability_name || "").toLowerCase();
    if (key === "email") return String(r.customer_email || "").toLowerCase();
    if (key === "phone") return String(r.customer_phone || "").toLowerCase();
    if (key === "status") return String(r.status_label || "").toLowerCase();
    if (key === "customer") return Number(r.customer_existing || 0);
    if (key === "source") return String(r.referral_type || "").toLowerCase();
    if (key === "cell_phone") return String(r.customer_cell || "").toLowerCase();
    if (key === "web_site") return String(r.customer_web || "").toLowerCase();
    return "";
  };
  const sortedRows = [...rows].sort((a, b) => {
    const av = sortableValueFor(a, tableSort.key);
    const bv = sortableValueFor(b, tableSort.key);
    if (av === bv) return 0;
    const cmp = av > bv ? 1 : -1;
    return tableSort.dir === "asc" ? cmp : -cmp;
  });
  const onSortHeader = (key) => {
    setTableSort((s) => {
      if (s.key === key) return { key, dir: s.dir === "asc" ? "desc" : "asc" };
      return { key, dir: "desc" };
    });
  };
  const sortMark = (key) => {
    if (tableSort.key !== key) return "";
    return tableSort.dir === "asc" ? " ▲" : " ▼";
  };
  const startResize = (key, e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      key,
      startX: e.clientX,
      startWidth: Number(columnWidths[key] || 120),
    });
  };
  useEffect(() => {
    if (!resizing) return;
    const onMove = (e) => {
      const delta = e.clientX - resizing.startX;
      const next = Math.max(80, resizing.startWidth + delta);
      setColumnWidths((s) => ({ ...s, [resizing.key]: next }));
    };
    const onUp = () => setResizing(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);
  const tableMinWidth = activeCols.reduce((sum, c) => sum + Number(columnWidths[c.key] || 120), 0);

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
            <button type="button" className="table-action" onClick={toggleColumnsModal}>
              {showColumns ? "Close Columns" : "Edit Columns"}
            </button>
            <button type="button" className="table-action">Filters</button>
            <button type="button" className="table-action">Reports</button>
          </div>
        </div>
        <div className="table-scroll">
        <table style={{ minWidth: `${tableMinWidth}px` }}>
          <thead>
            <tr>
              {activeCols.map((c) => (
                <th
                  key={c.key}
                  onClick={() => onSortHeader(c.key)}
                  style={{
                    cursor: "pointer",
                    userSelect: "none",
                    width: `${columnWidths[c.key] || 120}px`,
                    minWidth: `${columnWidths[c.key] || 120}px`,
                    maxWidth: `${columnWidths[c.key] || 120}px`,
                  }}
                >
                  <span className="th-content">{c.label}{sortMark(c.key)}</span>
                  <span className="col-resizer" onMouseDown={(e) => startResize(c.key, e)} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((r) => (
              <tr key={r.customer_id}>
                {activeCols.map((c) => (
                  <td
                    key={c.key}
                    style={{
                      width: `${columnWidths[c.key] || 120}px`,
                      minWidth: `${columnWidths[c.key] || 120}px`,
                      maxWidth: `${columnWidths[c.key] || 120}px`,
                    }}
                  >
                    {cellFor(r, c.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setShowColumns(false)}
        style={{
          display: showColumns ? "flex" : "none",
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          background: "rgba(8, 16, 32, 0.28)",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "36px 20px",
          overflow: "auto",
        }}
      >
        <div
          className="columns-modal"
          onClick={(e) => e.stopPropagation()}
          style={{ boxShadow: "0 18px 48px rgba(10,35,80,.28)", width: "min(1080px, 100%)" }}
        >
          <div className="columns-head">
            <h3 style={{ margin: 0 }}>Click on columns to add or remove</h3>
            <button className="table-action" type="button" onClick={() => setShowColumns(false)}>Close</button>
          </div>
          <div className="columns-grid">
            {columnDefs.map((c) => (
                <div key={c.key} className="column-card">
                  <div className={`column-icon ${c.color}`}><ColumnIcon name={c.icon} /></div>
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

