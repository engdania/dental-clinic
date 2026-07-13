
async function api(path, options) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
const apiRegister = (body) =>
  api("/api/register", { method: "POST", body: JSON.stringify(body) });
const apiLogin = (body) =>
  api("/api/login", { method: "POST", body: JSON.stringify(body) });
const apiGetSettings = () => api("/api/settings");
const apiUpdateSettings = (settings) =>
  api("/api/settings", { method: "PUT", body: JSON.stringify(settings) });
const apiGetPatients = () => api("/api/patients");
const apiGetAppointments = (patientId) =>
  api(
    "/api/appointments" +
      (patientId ? `?patientId=${encodeURIComponent(patientId)}` : ""),
  );
const apiCreateAppointment = (body) =>
  api("/api/appointments", { method: "POST", body: JSON.stringify(body) });
const apiUpdateAppointment = (id, body) =>
  api(`/api/appointments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
const apiGetSlots = (date) =>
  api(`/api/slots?date=${encodeURIComponent(date)}`);


function saveSession(user) {
  localStorage.setItem("clinicUser", JSON.stringify(user));
}
function loadSession() {
  try {
    return JSON.parse(localStorage.getItem("clinicUser"));
  } catch {
    return null;
  }
}
function clearSession() {
  localStorage.removeItem("clinicUser");
}


const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const DAY_LABELS = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

let state = {
  view: "home",
  currentUser: null,
  settings: null,
  myAppointments: [],
  allAppointments: [],
  patients: [],
  loaded: false,
  quoteIndex: 0,
  authError: "",
  authLoading: false,
  bookingDate: "",
  bookingSlots: [],
  selectedSlot: null,
  bookingMsg: "",
  adminTab: "appointments",
  adminApptFilter: "all",
  hoursMsg: "",
  dentistTab: "appointments",
  dentistSelectedPatient: null,
};

const QUOTES = [
  "Take care of your teeth, and they will take care of your smile for life.",
  "A gentle brush today saves a big drill tomorrow.",
  "Your smile is the first sentence you speak before you say a word.",
  "Flossing takes seconds; regret over cavities lasts years.",
  "Strong teeth start with small daily habits.",
  "A confident smile begins with a healthy mouth.",
];


async function init() {
  try {
    state.settings = await apiGetSettings();
  } catch (e) {
    console.error(e);
  }
  const saved = loadSession();
  if (saved) {
    state.currentUser = saved;
    state.view =
      saved.role === "admin"
        ? "adminDashboard"
        : saved.role === "dentist"
          ? "dentistDashboard"
          : "patientDashboard";
  }
  state.loaded = true;
  await loadDataForView(state.view);
  render();
}

async function loadDataForView(view) {
  try {
    if (view === "home" || view === "about") {
      state.settings = await apiGetSettings();
    } else if (view === "patientDashboard" && state.currentUser) {
      state.myAppointments = await apiGetAppointments(state.currentUser.id);
    } else if (view === "booking") {
      state.settings = await apiGetSettings();
    } else if (view === "adminDashboard") {
      state.allAppointments = await apiGetAppointments();
      state.patients = await apiGetPatients();
      state.settings = await apiGetSettings();
    } else if (view === "dentistDashboard") {
      state.allAppointments = await apiGetAppointments();
      state.patients = await apiGetPatients();
    }
  } catch (e) {
    console.error(e);
  }
}

async function goto(view) {
  state.authError = "";
  state.view = view;
  render(); // show instantly, data below fills in
  await loadDataForView(view);
  render();
}


function fmtTime12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const ap = h >= 12 ? "PM" : "AM";
  let hh = h % 12;
  if (hh === 0) hh = 12;
  return hh + ":" + String(m).padStart(2, "0") + " " + ap;
}
function fmtDateNice(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function escapeHtml(str) {
  return String(str || "").replace(
    /[&<>"']/g,
    (s) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        s
      ],
  );
}
function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/* ---------------------- ICONS ---------------------- */
const ICON_TOOTH_PATH = `M12 3c-2.2 0-3 1.1-4.3 1.1C6 4.1 4.5 3.3 3.4 4.4 2 5.8 2.6 9 3.4 11.5c.6 2 1.4 3.6 1.9 5.7.3 1.4.9 3.8 2.3 3.8 1.6 0 1.6-3 2-4.6.3-1.1.7-1.8 1.4-1.8s1.1.7 1.4 1.8c.4 1.6.4 4.6 2 4.6 1.4 0 2-2.4 2.3-3.8.5-2.1 1.3-3.7 1.9-5.7.8-2.5 1.4-5.7 0-7.1-1.1-1.1-2.6-.3-4.3.1C15 4.1 14.2 3 12 3z`;
const ICON_TOOTH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="${ICON_TOOTH_PATH}"/></svg>`;
const ICON_CLOCK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>`;
const ICON_SHIELD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"/></svg>`;
const ICON_HEART = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.5 8.4 2.3 5 6 5c2 0 3.4 1 4 2 .6-1 2-2 4-2 3.7 0 5.5 3.4 4 6.7C19.5 16.4 12 21 12 21z"/></svg>`;
const ICON_LOGOUT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`;

function brandSvg() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" style="color:var(--teal)"><path d="${ICON_TOOTH_PATH}"/></svg>`;
}
function waveDivider() {
  return `<svg class="wave" viewBox="0 0 1000 60" preserveAspectRatio="none"><path d="M0,30 C120,60 230,0 350,30 C470,60 580,0 700,30 C820,60 930,0 1000,25 L1000,60 L0,60 Z" fill="currentColor"/></svg>`;
}

/* ---------------------- RENDER: SHELL ---------------------- */
function render() {
  const app = document.getElementById("app");
  if (!state.loaded) {
    app.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:var(--ink-soft);font-family:'Fraunces',serif;font-size:18px;">Opening the clinic…</div>`;
    return;
  }
  app.innerHTML =
    renderNav() +
    "<main>" +
    renderView() +
    "</main>" +
    renderFooter() +
    renderModal();
  attachDynamicHandlers();
}

function renderNav() {
  const u = state.currentUser;
  let links = "";
  if (!u) {
    links += navBtn("home", "Home");
    links += navBtn("about", "About");
    links += `<button class="btn btn-outline btn-sm" data-nav="login">Log in</button>`;
    links += `<button class="btn btn-primary btn-sm" data-nav="register">Register</button>`;
  } else if (u.role === "patient") {
    links += navBtn("home", "Home");
    links += navBtn("patientDashboard", "My Profile");
    links += `<button class="btn btn-ghost btn-sm" data-action="logout">${ICON_LOGOUT} Logout</button>`;
  } else if (u.role === "admin") {
    links += navBtn("adminDashboard", "Admin Panel");
    links += `<button class="btn btn-ghost btn-sm" data-action="logout">${ICON_LOGOUT} Logout</button>`;
  } else if (u.role === "dentist") {
    links += navBtn("dentistDashboard", "Dentist Panel");
    links += `<button class="btn btn-ghost btn-sm" data-action="logout">${ICON_LOGOUT} Logout</button>`;
  }
  return `<nav class="nav">
    <div class="brand" data-nav="home">${brandSvg()} Dental Clinic</div>
    <div class="nav-links">${links}</div>
  </nav>`;
}
function navBtn(view, label) {
  const active = state.view === view ? "active" : "";
  return `<button class="nav-link ${active}" data-nav="${view}">${label}</button>`;
}
function renderFooter() {
  return `<footer>© ${new Date().getFullYear()} Dental Clinic · Demo application built for scheduling &amp; patient records</footer>`;
}

function renderView() {
  switch (state.view) {
    case "home":
      return renderHome();
    case "about":
      return renderHome(true);
    case "login":
      return renderAuth("login");
    case "register":
      return renderAuth("register");
    case "patientDashboard":
      return renderPatientDashboard();
    case "adminDashboard":
      return renderAdminDashboard();
    case "dentistDashboard":
      return renderDentistDashboard();
    case "booking":
      return state.currentUser ? renderPatientDashboard() : renderHome();
    default:
      return renderHome();
  }
}

/* ---------------------- HOME ---------------------- */
function renderHome() {
  if (!state.settings) return `<div class="empty-note">Loading…</div>`;
  return `
  <section class="hero">
    <div>
      <span class="eyebrow">${ICON_HEART} Gentle, modern dentistry</span>
      <h1>Healthy smiles, <em>cared for</em> properly.</h1>
      <p class="lead">Dental Clinic offers checkups, cleanings and treatment in a calm setting — with online booking so you always know when the dentist can see you.</p>
      <div class="hero-ctas">
        <button class="btn btn-primary" data-action="cta-book">${ICON_CLOCK} Book an appointment</button>
        <button class="btn btn-outline" data-nav="about">Learn more</button>
      </div>
    </div>
    <div class="hero-art">
      <svg viewBox="0 0 300 300" fill="none">
        <circle cx="150" cy="150" r="140" fill="var(--mint)"/>
        <g transform="translate(80,70) scale(5.5)" stroke="var(--teal)" stroke-width="0.9" fill="none">
          <path d="${ICON_TOOTH_PATH}" fill="#fff"/>
        </g>
      </svg>
    </div>
  </section>
  <div style="color:var(--mint)">${waveDivider()}</div>

  <section class="block" id="about-section" style="background:var(--mint);border-radius:24px;">
    <div class="section-head">
      <span class="eyebrow">${ICON_SHIELD} Why patients choose us</span>
      <h2>Care that fits around your day</h2>
      <p>Three things guide every visit at Dental Clinic.</p>
    </div>
    <div class="values">
      <div class="value-card">${ICON_TOOTH}<h3>Preventive first</h3><p>Regular checkups catch small issues before they become big, costly ones.</p></div>
      <div class="value-card">${ICON_CLOCK}<h3>Time respected</h3><p>Real-time slots mean no double-booking and no waiting room surprises.</p></div>
      <div class="value-card">${ICON_HEART}<h3>Continuity of care</h3><p>Your dentist can always see your full visit history before treating you.</p></div>
    </div>
  </section>

  <section class="block">
    <div class="section-head">
      <span class="eyebrow">From the clinic notepad</span>
      <h2>A little reminder</h2>
    </div>
    <div class="quote-wrap">
      <div class="quote-card">
        <span class="mark">"</span>
        <p class="quote-text">${escapeHtml(QUOTES[state.quoteIndex])}</p>
        <div class="quote-nav">
          ${QUOTES.map((_, i) => `<button class="dot ${i === state.quoteIndex ? "active" : ""}" data-quote="${i}"></button>`).join("")}
        </div>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="section-head">
      <span class="eyebrow">${ICON_CLOCK} Plan your visit</span>
      <h2>Working hours &amp; break</h2>
      <p>Slots outside the shaded break are open for booking, ${state.settings.slotMinutes} minutes each.</p>
    </div>
    ${hoursTableHtml()}
  </section>
  `;
}

function hoursTableHtml() {
  const s = state.settings;
  const rows = DAY_KEYS.map((k) => {
    const d = s.hours[k];
    if (d.closed)
      return `<tr><td>${DAY_LABELS[k]}</td><td colspan="2" class="tag-closed">Closed</td></tr>`;
    return `<tr><td>${DAY_LABELS[k]}</td><td>${fmtTime12(d.start)} – ${fmtTime12(d.end)}</td><td class="tag-break">Break ${fmtTime12(s.breakStart)}–${fmtTime12(s.breakEnd)}</td></tr>`;
  }).join("");
  return `<table class="hours-table"><thead><tr><th>Day</th><th>Open hours</th><th>Gap / break</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---------------------- AUTH ---------------------- */
function renderAuth(mode) {
  const isLogin = mode === "login";
  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <h2>${isLogin ? "Welcome back" : "Create your account"}</h2>
      <p class="sub">${isLogin ? "Log in to manage your appointments." : "Register as a patient to start booking visits."}</p>
      ${state.authError ? `<div class="form-msg error">${escapeHtml(state.authError)}</div>` : ""}
      <form id="auth-form">
        ${
          !isLogin
            ? `
        <div class="field"><label>Full name</label><input name="name" required placeholder="e.g. Aram Karim"></div>
        <div class="field"><label>Phone</label><input name="phone" required placeholder="07xx xxx xxxx"></div>
        `
            : ""
        }
        <div class="field"><label>Username</label><input name="username" required placeholder="Choose a username"></div>
        ${!isLogin ? `<div class="field"><label>Email</label><input type="email" name="email" required placeholder="you@example.com"></div>` : ""}
        <div class="field"><label>Password</label><input type="password" name="password" required placeholder="••••••••"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" ${state.authLoading ? "disabled" : ""}>${isLogin ? "Log in" : "Register"}</button>
      </form>
      <div class="auth-switch">
        ${isLogin ? `New here? <button data-nav="register">Create an account</button>` : `Already registered? <button data-nav="login">Log in</button>`}
      </div>
      ${isLogin ? `<div class="demo-note">Demo staff logins — Admin: <b>admin</b> / <b>admin123</b> &nbsp;·&nbsp; Dentist: <b>dentist</b> / <b>dentist123</b></div>` : ""}
    </div>
  </div>`;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const username = (fd.get("username") || "").trim();
  const password = (fd.get("password") || "").trim();
  state.authLoading = true;

  try {
    if (state.view === "login") {
      const { user } = await apiLogin({ username, password });
      state.currentUser = user;
      saveSession(user);
      state.authError = "";
      state.authLoading = false;
      await goto(
        user.role === "admin"
          ? "adminDashboard"
          : user.role === "dentist"
            ? "dentistDashboard"
            : "patientDashboard",
      );
    } else {
      const name = (fd.get("name") || "").trim();
      const phone = (fd.get("phone") || "").trim();
      const email = (fd.get("email") || "").trim();
      const { user } = await apiRegister({
        username,
        password,
        name,
        phone,
        email,
      });
      state.currentUser = user;
      saveSession(user);
      state.authError = "";
      state.authLoading = false;
      await goto("patientDashboard");
    }
  } catch (err) {
    state.authError = err.message;
    state.authLoading = false;
    render();
  }
}

/* ---------------------- PATIENT DASHBOARD ---------------------- */
function renderPatientDashboard() {
  const u = state.currentUser;
  const appts = state.myAppointments || [];
  const visits = appts.filter((a) => a.status === "completed").length;
  const upcoming = appts.filter(
    (a) => a.status === "pending" || a.status === "confirmed",
  );
  return `
  <div class="dash">
    <div class="dash-head">
      <div><h1>Hi, ${escapeHtml(u.name)}</h1><p>Here's your profile and appointment history.</p></div>
      <button class="btn btn-primary" data-action="open-booking">${ICON_CLOCK} Book appointment</button>
    </div>
    <div class="grid-2">
      <div class="card">
        <div class="profile-avatar">${initials(u.name)}</div>
        <h3>${escapeHtml(u.name)}</h3>
        <div class="profile-row"><span>Username</span><span>${escapeHtml(u.username)}</span></div>
        <div class="profile-row"><span>Email</span><span>${escapeHtml(u.email || "-")}</span></div>
        <div class="profile-row"><span>Phone</span><span>${escapeHtml(u.phone || "-")}</span></div>
        <div class="visit-badge">${ICON_HEART} Visited ${visits} time${visits === 1 ? "" : "s"}</div>
        <div style="margin-top:18px;">
          <button class="btn btn-ghost btn-sm" data-action="logout">${ICON_LOGOUT} Logout</button>
        </div>
      </div>
      <div class="card">
        <h3>Upcoming appointments</h3>
        ${upcoming.length ? upcoming.map((a) => apptItemHtml(a)).join("") : `<div class="empty-note">No upcoming appointments — book one when you're ready.</div>`}
        <h3 style="margin-top:24px;">Visit history</h3>
        ${appts.length ? appts.map((a) => apptItemHtml(a, true)).join("") : `<div class="empty-note">No appointments yet.</div>`}
      </div>
    </div>
  </div>`;
}
function apptItemHtml(a, showNotes) {
  return `<div class="appt-item">
    <div>
      <div class="appt-date">${fmtDateNice(a.date)}</div>
      <div class="appt-time">${fmtTime12(a.time)}${showNotes && a.dentistNotes ? " · Note: " + escapeHtml(a.dentistNotes) : ""}</div>
    </div>
    <span class="pill ${a.status}">${a.status}</span>
  </div>`;
}

/* ---------------------- BOOKING MODAL ---------------------- */
function renderModal() {
  if (state.view !== "booking") return "";
  const min = todayStr();
  return `<div class="modal-overlay" data-action="close-modal">
    <div class="modal" onclick="event.stopPropagation()">
      <div class="modal-head"><h3>Book an appointment</h3><button class="btn btn-ghost btn-sm" data-action="close-modal">✕</button></div>
      ${state.bookingMsg ? `<div class="form-msg ${state.bookingMsg.type}">${escapeHtml(state.bookingMsg.text)}</div>` : ""}
      <div class="field">
        <label>Choose a date</label>
        <input type="date" id="booking-date" min="${min}" value="${state.bookingDate}">
      </div>
      ${
        state.bookingDate
          ? state.bookingSlots.length
            ? `
        <div class="field">
          <label>Available time slots (${fmtDateNice(state.bookingDate)})</label>
          <div class="slots-grid">
            ${state.bookingSlots.map((t) => `<button class="slot-btn ${state.selectedSlot === t ? "selected" : ""}" data-slot="${t}">${fmtTime12(t)}</button>`).join("")}
          </div>
        </div>
      `
            : `<div class="empty-note">No open slots that day — the clinic may be closed or fully booked.</div>`
          : ""
      }
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px;" data-action="confirm-booking" ${!state.bookingDate || !state.selectedSlot ? "disabled" : ""}>Confirm appointment</button>
    </div>
  </div>`;
}

async function refreshSlotsForDate(date) {
  state.bookingDate = date;
  state.selectedSlot = null;
  state.bookingMsg = "";
  render();
  try {
    const { slots } = await apiGetSlots(date);
    state.bookingSlots = slots;
  } catch (e) {
    state.bookingSlots = [];
  }
  render();
}

/* ---------------------- ADMIN DASHBOARD ---------------------- */
function renderAdminDashboard() {
  const tab = state.adminTab;
  return `
  <div class="dash">
    <div class="dash-head"><div><h1>Admin panel</h1><p>Manage appointments, clinic hours and patients.</p></div></div>
    <div class="tabs">
      <button class="tab-btn ${tab === "appointments" ? "active" : ""}" data-admintab="appointments">Appointments</button>
      <button class="tab-btn ${tab === "hours" ? "active" : ""}" data-admintab="hours">Working hours</button>
      <button class="tab-btn ${tab === "patients" ? "active" : ""}" data-admintab="patients">Patients</button>
    </div>
    ${tab === "appointments" ? renderAdminAppointments() : tab === "hours" ? renderAdminHours() : renderAdminPatients()}
  </div>`;
}

function renderAdminAppointments() {
  const filter = state.adminApptFilter;
  let list = state.allAppointments || [];
  if (filter !== "all") list = list.filter((a) => a.status === filter);
  const filters = ["all", "pending", "confirmed", "completed", "cancelled"];
  return `
  <div class="card">
    <div class="tabs" style="margin-bottom:16px;">
      ${filters.map((f) => `<button class="tab-btn ${filter === f ? "active" : ""}" data-apptfilter="${f}" style="text-transform:capitalize;">${f}</button>`).join("")}
    </div>
    ${
      list.length
        ? `<table class="data-table"><thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>
      ${list
        .map(
          (a) => `<tr>
          <td>${escapeHtml(a.patientName || "Unknown")}</td>
          <td>${fmtDateNice(a.date)}</td>
          <td>${fmtTime12(a.time)}</td>
          <td><span class="pill ${a.status}">${a.status}</span></td>
          <td><div class="row-actions">
            ${a.status === "pending" ? `<button class="btn btn-outline btn-sm" data-apptaction="confirm" data-id="${a.id}">Confirm</button>` : ""}
            ${a.status === "pending" || a.status === "confirmed" ? `<button class="btn btn-outline btn-sm" data-apptaction="complete" data-id="${a.id}">Complete</button>` : ""}
            ${a.status === "pending" || a.status === "confirmed" ? `<button class="btn btn-ghost btn-sm" data-apptaction="cancel" data-id="${a.id}" style="color:var(--red)">Cancel</button>` : ""}
          </div></td>
        </tr>`,
        )
        .join("")}
    </tbody></table>`
        : `<div class="empty-note">No appointments in this view.</div>`
    }
  </div>`;
}

function renderAdminHours() {
  const s = state.settings;
  return `
  <div class="card">
    <h3>Weekly working hours</h3>
    <form id="hours-form">
      ${DAY_KEYS.map((k) => {
        const d = s.hours[k];
        return `<div class="hours-form-row">
          <label>${DAY_LABELS[k]}</label>
          <input type="time" name="${k}-start" value="${d.start}" ${d.closed ? "disabled" : ""}>
          <input type="time" name="${k}-end" value="${d.end}" ${d.closed ? "disabled" : ""}>
          <label style="display:flex;align-items:center;gap:6px;"><input type="checkbox" name="${k}-closed" ${d.closed ? "checked" : ""}> Closed</label>
        </div>`;
      }).join("")}
      <hr style="border:none;border-top:1px solid var(--border);margin:18px 0;">
      <div class="hours-form-row" style="grid-template-columns:110px 1fr 1fr;">
        <label>Break</label>
        <input type="time" name="breakStart" value="${s.breakStart}">
        <input type="time" name="breakEnd" value="${s.breakEnd}">
      </div>
      <div class="field" style="max-width:220px;margin-top:10px;">
        <label>Slot length (minutes)</label>
        <select name="slotMinutes">
          ${[15, 20, 30, 45, 60].map((v) => `<option value="${v}" ${s.slotMinutes == v ? "selected" : ""}>${v} min</option>`).join("")}
        </select>
      </div>
      <button type="submit" class="btn btn-primary" style="margin-top:16px;">Save working hours</button>
      ${state.hoursMsg ? `<div class="form-msg success" style="margin-top:14px;">${escapeHtml(state.hoursMsg)}</div>` : ""}
    </form>
  </div>`;
}

function renderAdminPatients() {
  const patients = state.patients || [];
  return `
  <div class="card">
    <h3>Registered patients (${patients.length})</h3>
    ${
      patients.length
        ? patients
            .map(
              (p) => `
      <div class="patient-list-item">
        <div><b>${escapeHtml(p.name)}</b><div style="color:var(--ink-soft);font-size:13px;">${escapeHtml(p.email || "")} · ${escapeHtml(p.phone || "")}</div></div>
        <span class="visit-badge">Visited ${p.visits}x</span>
      </div>`,
            )
            .join("")
        : `<div class="empty-note">No patients registered yet.</div>`
    }
  </div>`;
}

/* ---------------------- DENTIST DASHBOARD ---------------------- */
function renderDentistDashboard() {
  const tab = state.dentistTab;
  return `
  <div class="dash">
    <div class="dash-head"><div><h1>Dentist panel</h1><p>Review today's schedule and patient history.</p></div></div>
    <div class="tabs">
      <button class="tab-btn ${tab === "appointments" ? "active" : ""}" data-dentisttab="appointments">Appointments</button>
      <button class="tab-btn ${tab === "patients" ? "active" : ""}" data-dentisttab="patients">Patient history</button>
    </div>
    ${tab === "appointments" ? renderDentistAppointments() : renderDentistPatients()}
  </div>`;
}

function renderDentistAppointments() {
  const list = (state.allAppointments || [])
    .filter((a) => a.status !== "cancelled")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return `<div class="card">
    ${
      list.length
        ? `<table class="data-table"><thead><tr><th>Patient</th><th>Date</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    ${list
      .map(
        (a) => `<tr>
        <td>${escapeHtml(a.patientName || "Unknown")}</td>
        <td>${fmtDateNice(a.date)}</td>
        <td>${fmtTime12(a.time)}</td>
        <td><span class="pill ${a.status}">${a.status}</span></td>
        <td>${a.status !== "completed" ? `<button class="btn btn-outline btn-sm" data-apptaction="complete" data-id="${a.id}">Mark completed</button>` : '<span style="color:var(--ink-soft);font-size:12px;">Done</span>'}</td>
      </tr>`,
      )
      .join("")}
    </tbody></table>`
        : `<div class="empty-note">No appointments scheduled.</div>`
    }
  </div>`;
}

function renderDentistPatients() {
  const patients = state.patients || [];
  if (state.dentistSelectedPatient) {
    const p = patients.find((u) => u.id === state.dentistSelectedPatient);
    const appts = (state.allAppointments || [])
      .filter((a) => a.patientId === state.dentistSelectedPatient)
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    if (!p) return `<div class="empty-note">Patient not found.</div>`;
    return `<div class="card">
      <button class="btn btn-ghost btn-sm" data-action="dentist-back" style="margin-bottom:14px;">← Back to all patients</button>
      <h3>${escapeHtml(p.name)}'s history</h3>
      <p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:16px;">${escapeHtml(p.email || "")} · ${escapeHtml(p.phone || "")} · Visited ${p.visits} time(s)</p>
      ${
        appts.length
          ? appts
              .map(
                (a) => `
        <div class="history-block">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <div><b>${fmtDateNice(a.date)}</b> · ${fmtTime12(a.time)}</div>
            <span class="pill ${a.status}">${a.status}</span>
          </div>
          <div class="note-box">
            <label style="font-size:12.5px;font-weight:600;color:var(--ink-soft);">Clinical notes</label>
            <textarea data-note-id="${a.id}" placeholder="Diagnosis, treatment, follow-up...">${escapeHtml(a.dentistNotes || "")}</textarea>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <button class="btn btn-outline btn-sm" data-action="save-note" data-id="${a.id}">Save note</button>
              ${a.status !== "completed" ? `<button class="btn btn-outline btn-sm" data-apptaction="complete" data-id="${a.id}">Mark completed</button>` : ""}
            </div>
          </div>
        </div>
      `,
              )
              .join("")
          : `<div class="empty-note">No visits recorded for this patient yet.</div>`
      }
    </div>`;
  }
  return `<div class="card">
    <h3>All patients (${patients.length})</h3>
    ${
      patients.length
        ? patients
            .map(
              (p) => `
      <div class="patient-list-item clickable" data-select-patient="${p.id}">
        <div><b>${escapeHtml(p.name)}</b><div style="color:var(--ink-soft);font-size:13px;">${escapeHtml(p.email || "")}</div></div>
        <span class="visit-badge">Visited ${p.visits}x</span>
      </div>`,
            )
            .join("")
        : `<div class="empty-note">No patients yet.</div>`
    }
  </div>`;
}

/* ---------------------- EVENT HANDLING ---------------------- */
function attachDynamicHandlers() {
  const authForm = document.getElementById("auth-form");
  if (authForm) authForm.addEventListener("submit", handleAuthSubmit);

  const bookingDateInput = document.getElementById("booking-date");
  if (bookingDateInput)
    bookingDateInput.addEventListener("change", (e) =>
      refreshSlotsForDate(e.target.value),
    );

  const hoursForm = document.getElementById("hours-form");
  if (hoursForm) hoursForm.addEventListener("submit", handleHoursSubmit);
}

document.addEventListener("click", async (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (navEl) {
    const view = navEl.getAttribute("data-nav");
    await goto(view);
    if (view === "about")
      setTimeout(() => {
        const el = document.getElementById("about-section");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 50);
    return;
  }

  const actionEl = e.target.closest("[data-action]");
  if (actionEl) {
    const action = actionEl.getAttribute("data-action");
    if (action === "logout") {
      state.currentUser = null;
      clearSession();
      await goto("home");
      return;
    }
    if (action === "cta-book") {
      if (!state.currentUser) {
        await goto("login");
      } else if (state.currentUser.role === "patient") {
        state.bookingDate = "";
        state.selectedSlot = null;
        state.bookingSlots = [];
        state.bookingMsg = "";
        await goto("booking");
      }
      return;
    }
    if (action === "open-booking") {
      state.bookingDate = "";
      state.selectedSlot = null;
      state.bookingSlots = [];
      state.bookingMsg = "";
      await goto("booking");
      return;
    }
    if (action === "close-modal") {
      await goto(
        state.currentUser ? state.currentUser.role + "Dashboard" : "home",
      );
      return;
    }
    if (action === "confirm-booking") {
      if (!state.bookingDate || !state.selectedSlot) return;
      try {
        await apiCreateAppointment({
          patientId: state.currentUser.id,
          date: state.bookingDate,
          time: state.selectedSlot,
        });
        await goto("patientDashboard");
      } catch (err) {
        state.bookingMsg = { type: "error", text: err.message };
        render();
      }
      return;
    }
    if (action === "dentist-back") {
      state.dentistSelectedPatient = null;
      render();
      return;
    }
    if (action === "save-note") {
      const id = actionEl.getAttribute("data-id");
      const ta = document.querySelector(`textarea[data-note-id="${id}"]`);
      if (ta) {
        await apiUpdateAppointment(id, { dentistNotes: ta.value });
        await loadDataForView(state.view);
        render();
      }
      return;
    }
  }

  const quoteDot = e.target.closest("[data-quote]");
  if (quoteDot) {
    state.quoteIndex = Number(quoteDot.getAttribute("data-quote"));
    render();
    return;
  }

  const slotBtn = e.target.closest("[data-slot]");
  if (slotBtn) {
    state.selectedSlot = slotBtn.getAttribute("data-slot");
    render();
    return;
  }

  const adminTab = e.target.closest("[data-admintab]");
  if (adminTab) {
    state.adminTab = adminTab.getAttribute("data-admintab");
    render();
    return;
  }

  const dentistTab = e.target.closest("[data-dentisttab]");
  if (dentistTab) {
    state.dentistTab = dentistTab.getAttribute("data-dentisttab");
    state.dentistSelectedPatient = null;
    render();
    return;
  }

  const apptFilter = e.target.closest("[data-apptfilter]");
  if (apptFilter) {
    state.adminApptFilter = apptFilter.getAttribute("data-apptfilter");
    render();
    return;
  }

  const selectPatient = e.target.closest("[data-select-patient]");
  if (selectPatient) {
    state.dentistSelectedPatient = selectPatient.getAttribute(
      "data-select-patient",
    );
    render();
    return;
  }

  const apptAction = e.target.closest("[data-apptaction]");
  if (apptAction) {
    const id = apptAction.getAttribute("data-id");
    const act = apptAction.getAttribute("data-apptaction");
    const statusMap = {
      confirm: "confirmed",
      cancel: "cancelled",
      complete: "completed",
    };
    if (statusMap[act]) {
      await apiUpdateAppointment(id, { status: statusMap[act] });
      await loadDataForView(state.view);
      render();
    }
    return;
  }
});

async function handleHoursSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const s = state.settings;
  DAY_KEYS.forEach((k) => {
    s.hours[k].start = fd.get(k + "-start") || s.hours[k].start;
    s.hours[k].end = fd.get(k + "-end") || s.hours[k].end;
    s.hours[k].closed = fd.get(k + "-closed") === "on";
  });
  s.breakStart = fd.get("breakStart") || s.breakStart;
  s.breakEnd = fd.get("breakEnd") || s.breakEnd;
  s.slotMinutes = Number(fd.get("slotMinutes")) || s.slotMinutes;
  await apiUpdateSettings(s);
  state.hoursMsg = "Working hours updated.";
  render();
}

/* ---------------------- GO ---------------------- */
init();
