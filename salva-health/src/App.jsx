import { useState, useCallback } from "react";

// ─── CSS INJECTION ────────────────────────────────────────────────────────────
const styleTag = document.createElement("style");
styleTag.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --black:       #080808;
    --dark:        #0f0f0f;
    --dark-mid:    #161616;
    --dark-card:   #131313;
    --gold:        #c9a84c;
    --gold-light:  #e8d5a3;
    --gold-dim:    #7a6228;
    --gold-glow:   rgba(201,168,76,0.18);
    --white:       #f5f5f0;
    --white-dim:   rgba(245,245,240,0.6);
    --white-faint: rgba(245,245,240,0.08);
  }
  body { background: var(--dark); color: var(--white); font-family: 'DM Sans', sans-serif; }
  input, select, textarea, button { font-family: 'DM Sans', sans-serif; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: var(--dark); }
  ::-webkit-scrollbar-thumb { background: var(--gold-dim); border-radius: 3px; }
  .row-hover:hover { background: var(--white-faint) !important; }
  .agent-card:hover { border-color: var(--gold-dim) !important; box-shadow: 0 0 0 1px var(--gold-dim), 0 8px 32px rgba(0,0,0,0.4) !important; }
  input:focus, select:focus { border-color: var(--gold-dim) !important; outline: none; box-shadow: 0 0 0 2px rgba(201,168,76,0.12); }
  @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes toastIn { from { opacity:0; transform:translateX(16px); } to { opacity:1; transform:translateX(0); } }
  .fade-in { animation: fadeIn 0.3s ease forwards; }
  .toast-anim { animation: toastIn 0.3s ease forwards; }
  .modal-bg { position:fixed;inset:0;background:rgba(0,0,0,0.78);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px); }
`;
if (!document.head.querySelector("[data-salva]")) {
  styleTag.setAttribute("data-salva", "1");
  document.head.appendChild(styleTag);
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ADMIN = { id: "admin", username: "admin", password: "admin123", role: "admin", name: "Admin" };
const uid = () => Math.random().toString(36).slice(2, 9);
const fmtDT = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
};

const STATUS = {
  pending:                   { label: "Pending",          bg: "rgba(245,245,240,0.06)", color: "rgba(245,245,240,0.5)",  bd: "rgba(245,245,240,0.1)" },
  delivered_pending_confirm: { label: "Awaiting Confirm", bg: "rgba(201,168,76,0.1)",   color: "#c9a84c",                bd: "rgba(201,168,76,0.28)" },
  confirmed:                 { label: "Confirmed ✓",      bg: "rgba(80,190,100,0.1)",   color: "#6ec97a",                bd: "rgba(80,190,100,0.22)" },
  rejected:                  { label: "Rejected",         bg: "rgba(220,80,80,0.1)",    color: "#e07070",                bd: "rgba(220,80,80,0.22)" },
};

// ─── SHARED STYLES ────────────────────────────────────────────────────────────
const S = {
  card:    { background: "var(--dark-card)", border: "1px solid rgba(245,245,240,0.07)", borderRadius: 6 },
  input:   { width: "100%", background: "var(--dark-mid)", border: "1px solid rgba(245,245,240,0.1)", borderRadius: 4, padding: "10px 14px", color: "var(--white)", fontSize: 13, transition: "border 0.2s, box-shadow 0.2s" },
  select:  { width: "100%", background: "var(--dark-mid)", border: "1px solid rgba(245,245,240,0.1)", borderRadius: 4, padding: "10px 14px", color: "var(--white)", fontSize: 13, cursor: "pointer" },
  label:   { fontSize: 10, fontWeight: 700, color: "var(--white-dim)", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 6 },
  btnGold: { background: "var(--gold)", color: "var(--black)", border: "none", borderRadius: 4, padding: "10px 22px", fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.3, transition: "background 0.2s" },
  btnGhost:{ background: "transparent", color: "var(--white-dim)", border: "1px solid rgba(245,245,240,0.14)", borderRadius: 4, padding: "9px 20px", fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "border 0.2s, color 0.2s" },
  btnDel:  { background: "transparent", color: "#e07070", border: "1px solid rgba(220,80,80,0.28)", borderRadius: 4, padding: "6px 14px", fontWeight: 600, fontSize: 12, cursor: "pointer" },
  secHd:   { padding: "15px 22px", borderBottom: "1px solid rgba(245,245,240,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" },
  secTtl:  { fontSize: 13, fontWeight: 700, letterSpacing: 0.1 },
  th:      { padding: "10px 16px", fontSize: 10, fontWeight: 700, color: "var(--gold-dim)", letterSpacing: 1, textTransform: "uppercase", borderBottom: "1px solid rgba(245,245,240,0.06)", textAlign: "left", background: "rgba(0,0,0,0.15)" },
  td:      { padding: "13px 16px", borderBottom: "1px solid rgba(245,245,240,0.04)", fontSize: 13, verticalAlign: "middle" },
  goldBar: { width: 26, height: 2, background: "var(--gold)", borderRadius: 2, marginBottom: 10 },
  pill:    (col = "var(--gold)") => ({ fontSize: 11, background: `rgba(201,168,76,0.1)`, color: col, border: `1px solid rgba(201,168,76,0.22)`, padding: "3px 10px", borderRadius: 10, fontWeight: 600 }),
};

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
function Badge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.bd}`, padding: "3px 11px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>{s.label}</span>;
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const err = type === "error";
  return (
    <div className="toast-anim" style={{ position: "fixed", bottom: 26, right: 26, background: "var(--dark-card)", color: err ? "#e07070" : "var(--gold-light)", border: `1px solid ${err ? "rgba(220,80,80,0.3)" : "var(--gold-dim)"}`, padding: "13px 22px", borderRadius: 5, fontSize: 13, fontWeight: 600, zIndex: 999, boxShadow: "0 10px 40px rgba(0,0,0,0.5)", maxWidth: 320 }}>
      {msg}
    </div>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="fade-in" onClick={e => e.stopPropagation()}
        style={{ background: "var(--dark-card)", border: "1px solid rgba(201,168,76,0.18)", borderRadius: 8, padding: "32px", width: "100%", maxWidth: wide ? 560 : 460, boxShadow: "0 40px 100px rgba(0,0,0,0.7)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <div style={S.goldBar} />
            <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", letterSpacing: -0.3 }}>{title}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--white-dim)", fontSize: 20, cursor: "pointer", lineHeight: 1, marginTop: -4 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div style={{ ...S.card, padding: "20px 22px" }}>
      <div style={{ ...S.goldBar, background: accent || "var(--gold)" }} />
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, marginBottom: 6, color: "var(--white)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--white-dim)", letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginPage({ agents, onLogin }) {
  const [u, setU] = useState(""); const [p, setP] = useState(""); const [err, setErr] = useState("");
  const go = () => {
    const found = [ADMIN, ...agents].find(x => x.username === u.trim() && x.password === p);
    found ? (setErr(""), onLogin(found)) : setErr("Invalid username or password.");
  };
  return (
    <div style={{ minHeight: "100vh", background: "var(--black)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(201,168,76,0.08) 0%, transparent 65%)", pointerEvents: "none" }} />
      <div className="fade-in" style={{ ...S.card, border: "1px solid rgba(201,168,76,0.14)", padding: "50px 46px", width: 400, boxShadow: "0 40px 100px rgba(0,0,0,0.65)" }}>
        <div style={{ textAlign: "center", marginBottom: 38 }}>
          <div style={{ width: 50, height: 50, background: "var(--gold-glow)", border: "1px solid rgba(201,168,76,0.3)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <svg width="24" height="24" viewBox="0 0 22 22"><path d="M11 2L19 6.5V15.5L11 20L3 15.5V6.5L11 2Z" fill="var(--gold)" /></svg>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", letterSpacing: -0.3, color: "var(--white)" }}>Salva Health</div>
          <div style={{ fontSize: 11, color: "var(--white-dim)", marginTop: 5, letterSpacing: 1 }}>DELIVERY MANAGEMENT PORTAL</div>
        </div>
        <div style={{ marginBottom: 14 }}><label style={S.label}>Username</label><input style={S.input} value={u} onChange={e => setU(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="Enter username" autoFocus /></div>
        <div style={{ marginBottom: 6 }}><label style={S.label}>Password</label><input style={S.input} type="password" value={p} onChange={e => setP(e.target.value)} onKeyDown={e => e.key === "Enter" && go()} placeholder="••••••••" /></div>
        {err && <div style={{ color: "#e07070", fontSize: 12, marginTop: 8 }}>{err}</div>}
        <button style={{ ...S.btnGold, width: "100%", padding: 13, marginTop: 24 }} onClick={go}>Sign In →</button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "rgba(245,245,240,0.22)" }}>
          Admin: <code style={{ color: "var(--gold-dim)" }}>admin</code> / <code style={{ color: "var(--gold-dim)" }}>admin123</code>
        </div>
      </div>
    </div>
  );
}

// ─── NAVBAR ───────────────────────────────────────────────────────────────────
function Navbar({ user, onLogout }) {
  return (
    <div style={{ background: "var(--black)", borderBottom: "1px solid rgba(201,168,76,0.11)", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <svg width="18" height="18" viewBox="0 0 22 22"><path d="M11 2L19 6.5V15.5L11 20L3 15.5V6.5L11 2Z" fill="var(--gold)" /></svg>
        <span style={{ fontSize: 17, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", color: "var(--white)" }}>Salva Health</span>
        <span style={{ fontSize: 10, background: "var(--gold-glow)", color: "var(--gold)", border: "1px solid rgba(201,168,76,0.2)", padding: "3px 10px", borderRadius: 3, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
          {user.role === "admin" ? "Admin" : user.state}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: "var(--white-dim)" }}>{user.name}</span>
        <button style={S.btnGhost} onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}

// ─── STOCK WIDGET ─────────────────────────────────────────────────────────────
function StockWidget({ agentId, stock, products }) {
  const s = stock[agentId] || {};
  const init = stock[`${agentId}_init`] || {};
  if (!products.length) return <div style={{ ...S.card, marginBottom: 20, padding: 30, textAlign: "center", color: "var(--white-dim)", fontSize: 13 }}>No products in catalogue yet.</div>;
  return (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={S.secHd}><span style={S.secTtl}>Current Stock</span></div>
      <div style={{ padding: "6px 22px 18px" }}>
        {products.map(p => {
          const qty = s[p.id] ?? 0;
          const maxQ = init[p.id] || qty || 1;
          const pct = Math.min(100, (qty / maxQ) * 100);
          const low = qty > 0 && pct < 25;
          return (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid rgba(245,245,240,0.04)" }}>
              <div style={{ flex: 1, paddingRight: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 7 }}>{p.name}</div>
                <div style={{ width: "100%", maxWidth: 180, height: 3, background: "rgba(245,245,240,0.07)", borderRadius: 2 }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: low ? "#e07070" : "var(--gold)", borderRadius: 2, transition: "width 0.7s cubic-bezier(.4,0,.2,1)" }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, color: low ? "#e07070" : "var(--white)" }}>{qty}</span>
                <span style={{ fontSize: 11, color: "var(--white-dim)", marginLeft: 4 }}>{p.unit}</span>
                {qty === 0 && <div style={{ fontSize: 10, color: "rgba(220,80,80,0.65)", marginTop: 2 }}>Out of stock</div>}
                {low && qty > 0 && <div style={{ fontSize: 10, color: "#e07070", marginTop: 2 }}>Low stock</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ORDERS TABLE ─────────────────────────────────────────────────────────────
function OrdersTable({ orders, products, agents, isAdmin, onConfirm, onReject, showAgent }) {
  const pMap = Object.fromEntries(products.map(p => [p.id, p]));
  const aMap = Object.fromEntries(agents.map(a => [a.id, a]));
  if (!orders.length) return <div style={{ padding: "38px", textAlign: "center", color: "var(--white-dim)", fontSize: 13 }}>No orders yet.</div>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>
          {showAgent && <th style={S.th}>Agent / State</th>}
          <th style={S.th}>Customer</th>
          <th style={S.th}>Product</th>
          <th style={S.th}>Qty</th>
          <th style={S.th}>Status</th>
          <th style={S.th}>Date & Time</th>
          {isAdmin && <th style={S.th}>Action</th>}
        </tr></thead>
        <tbody>
          {orders.map(o => {
            const pr = pMap[o.productId]; const ag = aMap[o.agentId];
            return (
              <tr key={o.id} className="row-hover">
                {showAgent && <td style={S.td}><div style={{ fontWeight: 600 }}>{ag?.name || "—"}</div><div style={{ fontSize: 11, color: "var(--white-dim)" }}>{ag?.state}</div></td>}
                <td style={{ ...S.td, fontWeight: 600 }}>{o.customerName}</td>
                <td style={{ ...S.td, color: "var(--white-dim)" }}>{pr?.name || "—"}</td>
                <td style={S.td}><span style={{ fontWeight: 700, color: "var(--gold-light)" }}>{o.qty}</span> <span style={{ fontSize: 11, color: "var(--white-dim)" }}>{pr?.unit}</span></td>
                <td style={S.td}><Badge status={o.status} /></td>
                <td style={{ ...S.td, color: "var(--white-dim)", fontSize: 12 }}>{fmtDT(o.timestamp)}</td>
                {isAdmin && (
                  <td style={S.td}>
                    {o.status === "delivered_pending_confirm"
                      ? <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ ...S.btnGold, padding: "6px 14px", fontSize: 12 }} onClick={() => onConfirm(o)}>Confirm</button>
                          <button style={S.btnDel} onClick={() => onReject(o)}>Reject</button>
                        </div>
                      : <span style={{ color: "rgba(245,245,240,0.14)", fontSize: 12 }}>—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── ADD ORDER FORM ───────────────────────────────────────────────────────────
function AddOrderForm({ agentId, products, stock, onAdd }) {
  const [pid, setPid] = useState(products[0]?.id || "");
  const [cust, setCust] = useState("");
  const [qty, setQty] = useState(1);
  if (!products.length) return null;
  const avail = stock[agentId]?.[pid] ?? 0;
  const submit = () => {
    if (!cust.trim() || !pid || parseInt(qty) < 1 || parseInt(qty) > avail) return;
    onAdd({ agentId, productId: pid, customerName: cust.trim(), qty: parseInt(qty) });
    setCust(""); setQty(1);
  };
  return (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={S.secHd}><span style={S.secTtl}>Report New Order</span></div>
      <div style={{ padding: "18px 22px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
          <div><label style={S.label}>Customer Name</label><input style={S.input} value={cust} onChange={e => setCust(e.target.value)} placeholder="Full name" /></div>
          <div><label style={S.label}>Product</label><select style={S.select} value={pid} onChange={e => setPid(e.target.value)}>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
          <div style={{ width: 140 }}>
            <label style={S.label}>Quantity <span style={{ color: "var(--gold-dim)" }}>({avail} available)</span></label>
            <input style={{ ...S.input, borderColor: parseInt(qty) > avail ? "rgba(220,80,80,0.4)" : undefined }} type="number" min={1} max={avail} value={qty} onChange={e => setQty(e.target.value)} />
          </div>
          <button style={S.btnGold} onClick={submit}>Add Order</button>
        </div>
      </div>
    </div>
  );
}

// ─── MARK DELIVERED ───────────────────────────────────────────────────────────
function MarkDeliveredPanel({ agentId, orders, products, onMark }) {
  const pend = orders.filter(o => o.agentId === agentId && o.status === "pending");
  const pMap = Object.fromEntries(products.map(p => [p.id, p]));
  if (!pend.length) return null;
  return (
    <div style={{ ...S.card, marginBottom: 20 }}>
      <div style={S.secHd}>
        <span style={S.secTtl}>Mark as Delivered</span>
        <span style={S.pill()}>{pend.length} pending</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr><th style={S.th}>Customer</th><th style={S.th}>Product</th><th style={S.th}>Qty</th><th style={S.th}>Action</th></tr></thead>
          <tbody>
            {pend.map(o => {
              const pr = pMap[o.productId];
              return (
                <tr key={o.id} className="row-hover">
                  <td style={{ ...S.td, fontWeight: 600 }}>{o.customerName}</td>
                  <td style={{ ...S.td, color: "var(--white-dim)" }}>{pr?.name}</td>
                  <td style={S.td}><span style={{ fontWeight: 700, color: "var(--gold-light)" }}>{o.qty}</span> <span style={{ fontSize: 11, color: "var(--white-dim)" }}>{pr?.unit}</span></td>
                  <td style={S.td}><button style={{ ...S.btnGold, padding: "6px 16px", fontSize: 12 }} onClick={() => onMark(o)}>Mark Delivered</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────
function AddAgentModal({ products, onAdd, onClose }) {
  const [f, setF] = useState({ name: "", state: "", username: "", password: "" });
  const [initStock, setIS] = useState(() => Object.fromEntries(products.map(p => [p.id, 0])));
  const set = k => e => setF(prev => ({ ...prev, [k]: e.target.value }));
  const valid = f.name && f.state && f.username && f.password;
  return (
    <Modal title="Add New Agent" onClose={onClose} wide>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <div><label style={S.label}>Full Name</label><input style={S.input} value={f.name} onChange={set("name")} placeholder="Agent full name" /></div>
        <div><label style={S.label}>State</label><input style={S.input} value={f.state} onChange={set("state")} placeholder="e.g. Lagos" /></div>
        <div><label style={S.label}>Username</label><input style={S.input} value={f.username} onChange={set("username")} placeholder="e.g. agent.lagos" /></div>
        <div><label style={S.label}>Password</label><input style={S.input} type="password" value={f.password} onChange={set("password")} placeholder="Set a password" /></div>
      </div>
      {products.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <label style={{ ...S.label, marginBottom: 10 }}>Initial Stock Allocation</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {products.map(p => (
              <div key={p.id}>
                <label style={{ ...S.label, fontSize: 9 }}>{p.name} ({p.unit})</label>
                <input style={S.input} type="number" min={0} value={initStock[p.id] || 0}
                  onChange={e => setIS(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={{ ...S.btnGold, opacity: valid ? 1 : 0.5 }} onClick={() => { if (valid) { onAdd({ ...f, initStock }); onClose(); } }}>Create Agent</button>
      </div>
    </Modal>
  );
}

function AddProductModal({ onAdd, onClose }) {
  const [name, setName] = useState(""); const [unit, setUnit] = useState("bottles");
  return (
    <Modal title="Add New Product" onClose={onClose}>
      <div style={{ marginBottom: 14 }}><label style={S.label}>Product Name</label><input style={S.input} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SalvaHerb Immunity Booster" autoFocus /></div>
      <div style={{ marginBottom: 26 }}>
        <label style={S.label}>Unit</label>
        <select style={S.select} value={unit} onChange={e => setUnit(e.target.value)}>
          {["bottles", "packs", "jars", "sachets", "boxes", "pieces", "tubes", "vials", "strips"].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={{ ...S.btnGold, opacity: name.trim() ? 1 : 0.5 }} onClick={() => { if (name.trim()) { onAdd(name.trim(), unit); onClose(); } }}>Add Product</button>
      </div>
    </Modal>
  );
}

function RestockModal({ agent, products, onRestock, onClose }) {
  const [qtys, setQtys] = useState(() => Object.fromEntries(products.map(p => [p.id, 0])));
  return (
    <Modal title={`Restock — ${agent.name}`} onClose={onClose} wide>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: "var(--white-dim)", marginBottom: 14 }}>Enter the quantity to <strong style={{ color: "var(--gold-light)" }}>add</strong> to existing stock.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {products.map(p => (
            <div key={p.id}>
              <label style={{ ...S.label, fontSize: 9 }}>{p.name} ({p.unit})</label>
              <input style={S.input} type="number" min={0} value={qtys[p.id] || 0}
                onChange={e => setQtys(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        <button style={S.btnGold} onClick={() => { onRestock(agent.id, qtys); onClose(); }}>Confirm Restock</button>
      </div>
    </Modal>
  );
}

// ─── AGENT DASHBOARD ──────────────────────────────────────────────────────────
function AgentDashboard({ user, orders, stock, products, onAddOrder, onMarkDelivered }) {
  const mine = orders.filter(o => o.agentId === user.id);
  const s = stock[user.id] || {};
  const totalStock = Object.values(s).reduce((a, b) => a + b, 0);
  return (
    <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={S.goldBar} />
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", letterSpacing: -0.5 }}>My Dashboard</div>
        <div style={{ fontSize: 13, color: "var(--white-dim)", marginTop: 5 }}>{user.name} · {user.state} State</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Stock Units" value={totalStock} />
        <StatCard label="Pending Orders" value={mine.filter(o => o.status === "pending").length} accent="rgba(245,245,240,0.4)" />
        <StatCard label="Awaiting Admin Confirm" value={mine.filter(o => o.status === "delivered_pending_confirm").length} accent="var(--gold)" />
        <StatCard label="Confirmed Delivered" value={mine.filter(o => o.status === "confirmed").length} accent="#6ec97a" />
      </div>
      <StockWidget agentId={user.id} stock={stock} products={products} />
      <MarkDeliveredPanel agentId={user.id} orders={orders} products={products} onMark={onMarkDelivered} />
      <AddOrderForm agentId={user.id} products={products} stock={stock} onAdd={onAddOrder} />
      <div style={S.card}>
        <div style={S.secHd}><span style={S.secTtl}>All My Orders</span><span style={{ fontSize: 11, color: "var(--white-dim)" }}>{mine.length} total</span></div>
        <OrdersTable orders={[...mine].sort((a, b) => b.timestamp - a.timestamp)} products={products} agents={[user]} isAdmin={false} showAgent={false} />
      </div>
    </div>
  );
}

// ─── ADMIN AGENT DETAIL ───────────────────────────────────────────────────────
function AdminAgentDetail({ agent, orders, stock, products, onConfirm, onReject, onBack, onRestock }) {
  const [showRestock, setShowRestock] = useState(false);
  const mine = orders.filter(o => o.agentId === agent.id);
  const waiting = mine.filter(o => o.status === "delivered_pending_confirm").length;
  return (
    <div style={{ padding: "32px", maxWidth: 1100, margin: "0 auto" }}>
      <button style={{ background: "none", border: "none", color: "var(--white-dim)", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, marginBottom: 22, padding: 0 }} onClick={onBack}>← Back to Agents</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 }}>
        <div>
          <div style={S.goldBar} />
          <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>{agent.name}</div>
          <div style={{ fontSize: 13, color: "var(--white-dim)", marginTop: 4 }}>{agent.state} State · <code style={{ color: "var(--gold-dim)", fontSize: 12 }}>{agent.username}</code></div>
        </div>
        <button style={S.btnGhost} onClick={() => setShowRestock(true)}>+ Restock Agent</button>
      </div>
      <StockWidget agentId={agent.id} stock={stock} products={products} />
      <div style={S.card}>
        <div style={S.secHd}>
          <span style={S.secTtl}>Orders</span>
          {waiting > 0 && <span style={S.pill()}>{waiting} awaiting confirm</span>}
        </div>
        <OrdersTable orders={[...mine].sort((a, b) => b.timestamp - a.timestamp)} products={products} agents={[agent]} isAdmin onConfirm={onConfirm} onReject={onReject} showAgent={false} />
      </div>
      {showRestock && <RestockModal agent={agent} products={products} onRestock={onRestock} onClose={() => setShowRestock(false)} />}
    </div>
  );
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ agents, orders, stock, products, onConfirm, onReject, onAddAgent, onAddProduct, onDeleteProduct, onRestock }) {
  const [tab, setTab] = useState("overview");
  const [selAgent, setSelAgent] = useState(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [showAddProd, setShowAddProd] = useState(false);

  const totalStock = agents.reduce((s, a) => s + Object.values(stock[a.id] || {}).reduce((x, y) => x + y, 0), 0);
  const waitCount = orders.filter(o => o.status === "delivered_pending_confirm").length;
  const confirmedCount = orders.filter(o => o.status === "confirmed").length;

  if (selAgent) {
    const ag = agents.find(a => a.id === selAgent);
    if (ag) return <AdminAgentDetail agent={ag} orders={orders} stock={stock} products={products} onConfirm={onConfirm} onReject={onReject} onBack={() => setSelAgent(null)} onRestock={onRestock} />;
  }

  const TABS = [["overview", "Overview"], ["agents", "Agents"], ["products", "Products"], ["all-orders", "All Orders"]];

  return (
    <div style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={S.goldBar} />
        <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Cormorant Garamond',serif", letterSpacing: -0.5 }}>Admin Dashboard</div>
        <div style={{ fontSize: 13, color: "var(--white-dim)", marginTop: 5 }}>Salva Health · Nationwide Delivery Overview</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Stock (All Agents)" value={totalStock} />
        <StatCard label="Active Agents" value={agents.length} accent="rgba(245,245,240,0.4)" />
        <StatCard label="Awaiting Confirmation" value={waitCount} accent={waitCount > 0 ? "var(--gold)" : "rgba(245,245,240,0.3)"} />
        <StatCard label="Confirmed Delivered" value={confirmedCount} accent="#6ec97a" />
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 26, borderBottom: "1px solid rgba(245,245,240,0.06)" }}>
        {TABS.map(([t, lbl]) => (
          <button key={t} onClick={() => setTab(t)} style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 22px", fontSize: 13, fontWeight: 600, color: tab === t ? "var(--gold)" : "var(--white-dim)", borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent", marginBottom: -1, transition: "color 0.2s", letterSpacing: 0.2 }}>{lbl}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && <div className="fade-in">
        {waitCount > 0 && (
          <div style={{ ...S.card, marginBottom: 20, border: "1px solid rgba(201,168,76,0.2)" }}>
            <div style={S.secHd}>
              <span style={{ ...S.secTtl, color: "var(--gold)" }}>⚡ Awaiting Your Confirmation</span>
              <span style={S.pill()}>{waitCount} orders</span>
            </div>
            <OrdersTable orders={orders.filter(o => o.status === "delivered_pending_confirm")} products={products} agents={agents} isAdmin onConfirm={onConfirm} onReject={onReject} showAgent />
          </div>
        )}
        {!agents.length
          ? <div style={{ ...S.card, padding: "50px", textAlign: "center" }}>
              <div style={{ color: "var(--white-dim)", fontSize: 14, marginBottom: 18 }}>No agents yet. Start by adding products and agents.</div>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button style={S.btnGhost} onClick={() => setTab("products")}>+ Add Product First</button>
                <button style={S.btnGold} onClick={() => setShowAddAgent(true)}>+ Add Agent</button>
              </div>
            </div>
          : <div style={S.card}>
              <div style={S.secHd}><span style={S.secTtl}>Stock Summary by Agent</span></div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr>
                    <th style={S.th}>Agent</th><th style={S.th}>State</th>
                    {products.map(p => <th key={p.id} style={S.th}>{p.name.split(" ")[0]}</th>)}
                    <th style={S.th}>Total</th>
                  </tr></thead>
                  <tbody>
                    {agents.map(a => {
                      const s = stock[a.id] || {};
                      const tot = Object.values(s).reduce((x, y) => x + y, 0);
                      return (
                        <tr key={a.id} className="row-hover" style={{ cursor: "pointer" }} onClick={() => setSelAgent(a.id)}>
                          <td style={{ ...S.td, fontWeight: 600 }}>{a.name}</td>
                          <td style={{ ...S.td, color: "var(--white-dim)" }}>{a.state}</td>
                          {products.map(p => { const q = s[p.id] ?? 0; return <td key={p.id} style={{ ...S.td, fontWeight: q < 5 ? 700 : 400, color: q === 0 ? "rgba(220,80,80,0.6)" : q < 10 ? "#e07070" : "var(--white)" }}>{q}</td>; })}
                          <td style={{ ...S.td, fontWeight: 700, color: "var(--gold-light)" }}>{tot}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
        }
      </div>}

      {/* AGENTS */}
      {tab === "agents" && <div className="fade-in">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <button style={S.btnGold} onClick={() => setShowAddAgent(true)}>+ Add Agent</button>
        </div>
        {!agents.length
          ? <div style={{ ...S.card, padding: "50px", textAlign: "center", color: "var(--white-dim)", fontSize: 13 }}>No agents yet. Click "Add Agent" to create one.</div>
          : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px,1fr))", gap: 14 }}>
              {agents.map(a => {
                const aOrd = orders.filter(o => o.agentId === a.id);
                const wait = aOrd.filter(o => o.status === "delivered_pending_confirm").length;
                const tot = Object.values(stock[a.id] || {}).reduce((x, y) => x + y, 0);
                return (
                  <div key={a.id} className="agent-card" style={{ ...S.card, padding: "20px 22px", cursor: "pointer", transition: "border 0.2s, box-shadow 0.2s" }} onClick={() => setSelAgent(a.id)}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{a.name}</div>
                        <div style={{ fontSize: 12, color: "var(--white-dim)", marginTop: 2 }}>{a.state}</div>
                        <div style={{ fontSize: 11, color: "var(--gold-dim)", marginTop: 2 }}>{a.username}</div>
                      </div>
                      {wait > 0 && <span style={S.pill()}>{wait} pending</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(245,245,240,0.05)", paddingTop: 12 }}>
                      <div><div style={{ fontSize: 22, fontWeight: 800, letterSpacing: -1, color: "var(--gold-light)" }}>{tot}</div><div style={{ fontSize: 10, color: "var(--white-dim)" }}>units in stock</div></div>
                      <div style={{ textAlign: "right" }}><div style={{ fontSize: 18, fontWeight: 700 }}>{aOrd.length}</div><div style={{ fontSize: 10, color: "var(--white-dim)" }}>orders</div></div>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>}

      {/* PRODUCTS */}
      {tab === "products" && <div className="fade-in">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
          <button style={S.btnGold} onClick={() => setShowAddProd(true)}>+ Add Product</button>
        </div>
        {!products.length
          ? <div style={{ ...S.card, padding: "50px", textAlign: "center", color: "var(--white-dim)", fontSize: 13 }}>No products yet. Click "Add Product" to start your catalogue.</div>
          : <div style={S.card}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr><th style={S.th}>#</th><th style={S.th}>Product Name</th><th style={S.th}>Unit</th><th style={S.th}>Total in Field</th><th style={S.th}>Remove</th></tr></thead>
                <tbody>
                  {products.map((p, i) => {
                    const tot = agents.reduce((s, a) => s + (stock[a.id]?.[p.id] ?? 0), 0);
                    return (
                      <tr key={p.id} className="row-hover">
                        <td style={{ ...S.td, color: "var(--white-dim)" }}>{i + 1}</td>
                        <td style={{ ...S.td, fontWeight: 600 }}>{p.name}</td>
                        <td style={{ ...S.td, color: "var(--white-dim)" }}>{p.unit}</td>
                        <td style={{ ...S.td, fontWeight: 700, color: "var(--gold-light)" }}>{tot}</td>
                        <td style={S.td}><button style={S.btnDel} onClick={() => onDeleteProduct(p.id)}>Delete</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
        }
      </div>}

      {/* ALL ORDERS */}
      {tab === "all-orders" && <div className="fade-in">
        <div style={S.card}>
          <div style={S.secHd}><span style={S.secTtl}>All Orders</span><span style={{ fontSize: 11, color: "var(--white-dim)" }}>{orders.length} total</span></div>
          <OrdersTable orders={[...orders].sort((a, b) => b.timestamp - a.timestamp)} products={products} agents={agents} isAdmin onConfirm={onConfirm} onReject={onReject} showAgent />
        </div>
      </div>}

      {showAddAgent && <AddAgentModal products={products} onAdd={onAddAgent} onClose={() => setShowAddAgent(false)} />}
      {showAddProd && <AddProductModal onAdd={onAddProduct} onClose={() => setShowAddProd(false)} />}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState({});
  const [toast, setToast] = useState({ msg: "", type: "success" });

  const showToast = useCallback((msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "success" }), 3500);
  }, []);

  const handleAddAgent = useCallback(({ name, state, username, password, initStock }) => {
    const id = "agent_" + uid();
    setAgents(prev => [...prev, { id, username, password, role: "agent", name, state }]);
    setStock(prev => ({ ...prev, [id]: { ...initStock }, [`${id}_init`]: { ...initStock } }));
    showToast(`Agent "${name}" created successfully.`);
  }, [showToast]);

  const handleAddProduct = useCallback((name, unit) => {
    const id = "p_" + uid();
    setProducts(prev => [...prev, { id, name, unit }]);
    setStock(prev => {
      const next = { ...prev };
      agents.forEach(a => { next[a.id] = { ...next[a.id], [id]: 0 }; });
      return next;
    });
    showToast(`"${name}" added to catalogue.`);
  }, [agents, showToast]);

  const handleDeleteProduct = useCallback((pid) => {
    setProducts(prev => prev.filter(p => p.id !== pid));
    setStock(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { if (next[k] && typeof next[k] === "object") { const s = { ...next[k] }; delete s[pid]; next[k] = s; } });
      return next;
    });
    showToast("Product removed.");
  }, [showToast]);

  const handleAddOrder = useCallback((order) => {
    setOrders(prev => [...prev, { id: "o_" + uid(), ...order, status: "pending", timestamp: Date.now() }]);
    showToast("Order recorded successfully.");
  }, [showToast]);

  const handleMarkDelivered = useCallback((order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "delivered_pending_confirm", timestamp: Date.now() } : o));
    showToast("Marked as delivered. Awaiting admin confirmation.");
  }, [showToast]);

  const handleConfirm = useCallback((order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "confirmed" } : o));
    setStock(prev => {
      const s = { ...(prev[order.agentId] || {}) };
      s[order.productId] = Math.max(0, (s[order.productId] || 0) - order.qty);
      return { ...prev, [order.agentId]: s };
    });
    showToast("✓ Delivery confirmed. Stock updated.");
  }, [showToast]);

  const handleReject = useCallback((order) => {
    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: "pending" } : o));
    showToast("Order returned to pending.", "error");
  }, [showToast]);

  const handleRestock = useCallback((agentId, qtys) => {
    setStock(prev => {
      const s = { ...(prev[agentId] || {}) };
      Object.entries(qtys).forEach(([pid, q]) => { if (q > 0) s[pid] = (s[pid] || 0) + q; });
      return { ...prev, [agentId]: s };
    });
    showToast("Stock updated successfully.");
  }, [showToast]);

  if (!user) return <LoginPage agents={agents} onLogin={setUser} />;

  return (
    <div style={{ background: "var(--dark)", minHeight: "100vh" }}>
      <Navbar user={user} onLogout={() => setUser(null)} />
      {user.role === "admin"
        ? <AdminDashboard agents={agents} orders={orders} stock={stock} products={products}
            onConfirm={handleConfirm} onReject={handleReject} onAddAgent={handleAddAgent}
            onAddProduct={handleAddProduct} onDeleteProduct={handleDeleteProduct}
            onDeleteAgent={id => setAgents(prev => prev.filter(a => a.id !== id))}
            onRestock={handleRestock} />
        : <AgentDashboard user={user} orders={orders} stock={stock} products={products}
            onAddOrder={handleAddOrder} onMarkDelivered={handleMarkDelivered} />
      }
      <Toast msg={toast.msg} type={toast.type} />
    </div>
  );
}