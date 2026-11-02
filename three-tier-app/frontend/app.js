const API = '/api';
const COLS = [
  { s: 'todo',  label: 'To do' },
  { s: 'doing', label: 'In progress' },
  { s: 'done',  label: 'Done' },
];
const NEXT = { todo: ['doing', 'Start'], doing: ['done', 'Complete'], done: ['todo', 'Reopen'] };
let tasks = [];

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

async function checkHealth() {
  try {
    const h = await api('/health');
    $('t-api').className = 'tier up';
    $('t-db').className = 'tier ' + (h.db === 'up' ? 'up' : '');
    $('host').textContent = 'served by ' + h.host;
  } catch {
    $('t-api').className = 'tier';
    $('t-db').className = 'tier';
    $('host').textContent = 'API unreachable';
  }
}

function renderStats() {
  const c = { todo: 0, doing: 0, done: 0 };
  tasks.forEach((t) => c[t.status]++);
  const total = tasks.length;
  const pct = total ? Math.round((c.done / total) * 100) : 0;
  $('stats').innerHTML = `
    <div class="stat"><b>${total}</b><span>Total tasks</span></div>
    <div class="stat"><b>${c.todo}</b><span>To do</span></div>
    <div class="stat"><b>${c.doing}</b><span>In progress</span></div>
    <div class="stat"><b>${pct}%</b><span>Completed (${c.done} of ${total})</span>
      <div class="bar"><div style="width:${pct}%"></div></div></div>`;
}

function renderBoard() {
  const q = $('search').value.toLowerCase();
  const list = tasks.filter((t) => (t.title + ' ' + (t.description || '')).toLowerCase().includes(q));
  $('board').innerHTML = COLS.map(({ s, label }) => {
    const items = list.filter((t) => t.status === s);
    const cards = items.map((t) => `
      <article class="task ${t.priority} ${t.status}">
        <h3>${esc(t.title)}</h3>
        ${t.description ? `<p>${esc(t.description)}</p>` : ''}
        <div class="meta">
          <small>${t.priority} priority</small>
          <div class="acts">
            <button data-act="move" data-id="${t.id}" data-to="${NEXT[t.status][0]}">${NEXT[t.status][1]}</button>
            <button class="del" data-act="del" data-id="${t.id}">Delete</button>
          </div>
        </div>
      </article>`).join('');
    return `<div class="col" data-s="${s}"><h2>${label}<em>${items.length}</em></h2>${cards || '<div class="empty">Nothing here yet</div>'}</div>`;
  }).join('');
  renderStats();
}

async function load() {
  try {
    tasks = await api('/tasks');
    renderBoard();
  } catch (e) {
    toast(e.message);
  }
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await api('/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: $('title').value, description: $('desc').value, priority: $('priority').value }),
    });
    e.target.reset();
    toast('Task added');
    load();
  } catch (err) { toast(err.message); }
});

$('board').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.act === 'move') {
      await api('/tasks/' + b.dataset.id, { method: 'PATCH', body: JSON.stringify({ status: b.dataset.to }) });
      toast('Task updated');
    } else {
      await api('/tasks/' + b.dataset.id, { method: 'DELETE' });
      toast('Task deleted');
    }
    load();
  } catch (err) { toast(err.message); }
});

$('search').addEventListener('input', renderBoard);

checkHealth();
load();
setInterval(checkHealth, 10000);
