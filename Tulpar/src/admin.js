import './admin.css';
import { api, photoUrl, money, km, carName, esc, STATUS_LABELS, CATEGORY_LABELS } from './shared.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let cars = [];
let leads = [];

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.append(t);
  setTimeout(() => t.remove(), 2600);
}

// ---------- Auth ----------
async function start() {
  let admin = false;
  try {
    admin = (await api('me')).admin;
  } catch (e) {
    showLogin(e.status === 503 ? e.message : '');
    return;
  }
  if (admin) openApp(); else showLogin();
}

function showLogin(message = '') {
  $('.app').hidden = true;
  $('.login').hidden = false;
  $('.login__error').textContent = message;
  $('.login input').focus();
}

$('.login__card').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  try {
    const r = await api('login', { method: 'POST', body: { pin: e.target.pin.value } });
    e.target.reset();
    openApp(r.defaultPin);
  } catch (err) {
    $('.login__error').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

$('.js-logout').addEventListener('click', async () => {
  await api('logout', { method: 'POST' }).catch(() => {});
  showLogin();
});

async function openApp(defaultPin = false) {
  $('.login').hidden = true;
  $('.app').hidden = false;
  $('.js-pin-banner').hidden = !defaultPin;
  await Promise.all([loadCars(), loadLeads(), loadSettings()]);
}

// ---------- Tabs ----------
$$('.tab').forEach((t) => t.addEventListener('click', () => {
  $$('.tab').forEach((x) => { x.classList.toggle('is-active', x === t); x.setAttribute('aria-selected', String(x === t)); });
  $$('.panel').forEach((p) => { p.hidden = p.dataset.panel !== t.dataset.tab; });
  if (t.dataset.tab === 'leads') loadLeads();
}));

// ---------- Cars list ----------
async function loadCars() {
  cars = (await api('admin-cars')).cars;
  renderCars();
}

function renderCars() {
  const el = $('.js-cars');
  const visible = cars.filter((c) => !c.hidden).length;
  $('.js-cars-sum').textContent = `Всего ${cars.length}, на сайте ${visible}. Порядок здесь = порядок в каталоге.`;
  if (!cars.length) {
    el.innerHTML = '<div class="empty">Пока нет автомобилей. Нажмите «Добавить автомобиль».</div>';
    return;
  }
  el.innerHTML = cars.map((c, i) => `
    <div class="row${c.hidden ? ' is-hidden' : ''}" data-id="${esc(c.id)}">
      <div class="row__img">${c.photos?.[0] ? `<img src="${esc(photoUrl(c.photos[0]))}" alt="" loading="lazy" />` : 'нет фото'}</div>
      <div class="row__main">
        <div class="row__title">${esc(carName(c))} ${c.year ? `<span class="muted">${c.year}</span>` : ''}</div>
        <div class="row__meta">${esc([money(c.price), c.mileage ? km(c.mileage) : 'Новый', c.power ? `${c.power} л.с.` : '', CATEGORY_LABELS[c.category]].filter(Boolean).join(' · '))}</div>
        <div class="row__tags">
          <span class="tag tag--${esc(c.status)}">${STATUS_LABELS[c.status]}</span>
          ${c.hidden ? '<span class="tag tag--hidden">Скрыт</span>' : ''}
          ${c.featured ? '<span class="tag tag--featured">★ В шоуруме</span>' : ''}
          <span class="tag">${(c.photos || []).length} фото</span>
        </div>
      </div>
      <div class="row__actions">
        <button class="icon" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Выше">↑</button>
        <button class="icon" data-act="down" ${i === cars.length - 1 ? 'disabled' : ''} aria-label="Ниже">↓</button>
        <button class="icon" data-act="toggle" aria-label="${c.hidden ? 'Показать на сайте' : 'Скрыть с сайта'}" title="${c.hidden ? 'Показать на сайте' : 'Скрыть с сайта'}">${c.hidden ? '◌' : '◉'}</button>
        <button class="btn btn--line btn--sm" data-act="edit">Изменить</button>
        <button class="icon danger" data-act="delete" aria-label="Удалить">🗑</button>
      </div>
    </div>`).join('');
}

$('.js-cars').addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.closest('.row').dataset.id;
  const i = cars.findIndex((c) => c.id === id);
  const car = cars[i];
  const act = btn.dataset.act;
  try {
    if (act === 'edit') return openEditor(car);
    if (act === 'delete') {
      if (!confirm(`Удалить ${carName(car)}? Фото тоже удалятся.`)) return;
      await api('car-delete', { method: 'POST', body: { id } });
      cars.splice(i, 1);
      toast('Удалено');
    }
    if (act === 'toggle') {
      const r = await api('car', { method: 'POST', body: { ...car, hidden: !car.hidden } });
      cars[i] = r.car;
      toast(r.car.hidden ? 'Скрыт с сайта' : 'Показан на сайте');
    }
    if (act === 'up' || act === 'down') {
      const j = act === 'up' ? i - 1 : i + 1;
      [cars[i], cars[j]] = [cars[j], cars[i]];
      await api('reorder', { method: 'POST', body: { ids: cars.map((c) => c.id) } });
    }
    renderCars();
  } catch (err) {
    toast(err.message);
  }
});

// ---------- Editor ----------
const dlg = $('.editor');
const form = $('.editor__form');
let editing = null;     // car being edited, or null for a new one
let photos = [];        // current photo list in the editor
let uploadedNow = [];   // images uploaded during this edit (deleted if cancelled)
let removed = [];       // images removed during this edit (deleted after save)

const TEXT_FIELDS = ['brand', 'model', 'trim', 'color', 'engine', 'fuel', 'transmission', 'drive', 'accel', 'topSpeed', 'consumption', 'description'];
const NUM_FIELDS = ['year', 'price', 'oldPrice', 'mileage', 'power'];
const spaced = (n) => (n ? Number(n).toLocaleString('ru-RU').replace(/ |,/g, ' ') : '');

function openEditor(car = null) {
  editing = car;
  form.reset();
  $('#editor-title').textContent = car ? `${carName(car)}` : 'Новый автомобиль';
  $('.editor__error').textContent = '';
  $('.js-upload-status').textContent = '';
  const c = car || { category: 'sedan', status: 'stock', specs: [], features: [], photos: [] };
  for (const f of TEXT_FIELDS) form.elements[f].value = c[f] ?? '';
  for (const f of NUM_FIELDS) form.elements[f].value = f === 'year' ? (c.year || '') : spaced(c[f]);
  form.elements.category.value = c.category || 'sedan';
  form.elements.status.value = c.status || 'stock';
  form.elements.features.value = (c.features || []).join('\n');
  form.elements.visible.checked = !c.hidden;
  form.elements.featured.checked = Boolean(c.featured);
  $('.js-specs').innerHTML = '';
  (c.specs || []).forEach((s) => addSpecRow(s.k, s.v));
  photos = [...(c.photos || [])];
  uploadedNow = [];
  removed = [];
  renderPhotos();
  dlg.showModal();
}
$('.js-add').addEventListener('click', () => openEditor());

async function closeEditor() {
  dlg.close();
  // Cancelled: throw away photos uploaded during this edit
  for (const id of uploadedNow) api('image-delete', { method: 'POST', body: { id } }).catch(() => {});
  uploadedNow = [];
}
$$('.js-close', dlg).forEach((b) => b.addEventListener('click', closeEditor));
dlg.addEventListener('cancel', (e) => { e.preventDefault(); closeEditor(); });

// Number fields: keep thousands separators readable while typing
for (const f of ['price', 'oldPrice', 'mileage']) {
  form.elements[f].addEventListener('input', (e) => {
    const d = e.target.value.replace(/\D/g, '');
    e.target.value = spaced(d);
  });
}

function addSpecRow(k = '', v = '') {
  const row = document.createElement('div');
  row.className = 'spec-row';
  row.innerHTML = `<input placeholder="Название" value="${esc(k)}" aria-label="Название характеристики" />
    <input placeholder="Значение" value="${esc(v)}" aria-label="Значение" />
    <button type="button" class="icon" aria-label="Удалить строку">×</button>`;
  row.querySelector('button').addEventListener('click', () => row.remove());
  $('.js-specs').append(row);
  return row;
}
$('.js-add-spec').addEventListener('click', () => addSpecRow().querySelector('input').focus());

function renderPhotos() {
  $('.js-photos').innerHTML = photos.map((p, i) => `
    <div class="photo">
      <img src="${esc(photoUrl(p))}" alt="Фото ${i + 1}" />
      ${i === 0 ? '<span class="photo__cover">Обложка</span>' : ''}
      <div class="photo__tools">
        ${i > 0 ? `<button type="button" data-i="${i}" data-act="left" aria-label="Левее">←</button>` : ''}
        ${i < photos.length - 1 ? `<button type="button" data-i="${i}" data-act="right" aria-label="Правее">→</button>` : ''}
        <button type="button" data-i="${i}" data-act="remove" aria-label="Удалить фото">✕</button>
      </div>
    </div>`).join('');
}
$('.js-photos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const i = Number(b.dataset.i);
  if (b.dataset.act === 'remove') {
    const [p] = photos.splice(i, 1);
    if (p.startsWith('img_')) removed.push(p);
  } else {
    const j = b.dataset.act === 'left' ? i - 1 : i + 1;
    [photos[i], photos[j]] = [photos[j], photos[i]];
  }
  renderPhotos();
});

// Resize on the device before upload: fast on mobile data and well under the server limit.
function resizeImage(file, max = 1800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не удалось прочитать фото')); };
    img.src = url;
  });
}

$('.js-files').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 20 - photos.length);
  e.target.value = '';
  const status = $('.js-upload-status');
  for (let n = 0; n < files.length; n++) {
    status.textContent = `Загружаем ${n + 1} из ${files.length}…`;
    try {
      const dataUrl = await resizeImage(files[n]);
      const { id } = await api('image', { method: 'POST', body: { dataUrl } });
      photos.push(id);
      uploadedNow.push(id);
      renderPhotos();
    } catch (err) {
      status.textContent = `Ошибка: ${err.message}`;
      return;
    }
  }
  status.textContent = files.length ? 'Готово ✓' : '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = { id: editing?.id };
  for (const f of TEXT_FIELDS) body[f] = form.elements[f].value;
  for (const f of NUM_FIELDS) body[f] = form.elements[f].value.replace(/\D/g, '');
  body.category = form.elements.category.value;
  body.status = form.elements.status.value;
  body.features = form.elements.features.value.split('\n');
  body.hidden = !form.elements.visible.checked;
  body.featured = form.elements.featured.checked;
  body.specs = $$('.spec-row').map((r) => {
    const [k, v] = $$('input', r);
    return { k: k.value, v: v.value };
  });
  body.photos = photos;
  if (!body.brand.trim() || !body.model.trim()) {
    $('.editor__error').textContent = 'Укажите марку и модель.';
    return;
  }
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  try {
    const { car } = await api('car', { method: 'POST', body });
    // Only one car can be the showroom hero
    if (car.featured) {
      for (const other of cars.filter((c) => c.featured && c.id !== car.id)) {
        const r = await api('car', { method: 'POST', body: { ...other, featured: false } });
        Object.assign(other, r.car);
      }
    }
    const i = cars.findIndex((c) => c.id === car.id);
    if (i > -1) cars[i] = car; else cars.unshift(car);
    for (const id of removed) api('image-delete', { method: 'POST', body: { id } }).catch(() => {});
    uploadedNow = [];
    removed = [];
    dlg.close();
    renderCars();
    toast('Сохранено');
  } catch (err) {
    $('.editor__error').textContent = err.message;
  } finally {
    btn.disabled = false;
  }
});

// ---------- Leads ----------
const LEAD_LABELS = { new: 'Новая', work: 'В работе', done: 'Выполнена', cancel: 'Отменена' };

async function loadLeads() {
  try {
    leads = (await api('leads')).leads;
  } catch { return; }
  const fresh = leads.filter((l) => l.status === 'new').length;
  $('.js-new-leads').hidden = !fresh;
  $('.js-new-leads').textContent = fresh;
  const el = $('.js-leads');
  if (!leads.length) {
    el.innerHTML = '<div class="empty">Заявок пока нет. Они появятся здесь, когда клиенты заполнят форму тест-драйва на сайте.</div>';
    return;
  }
  el.innerHTML = leads.map((l) => {
    const digits = (l.phone || '').replace(/\D/g, '');
    return `
    <div class="lead${l.status === 'new' ? ' is-new' : ''}" data-id="${esc(l.id)}">
      <div>
        <div class="lead__name">${esc(l.name)}</div>
        <div class="lead__info">
          <a href="tel:+${digits}">${esc(l.phone)}</a>
          <a class="wa" href="https://wa.me/${digits}" target="_blank" rel="noopener">WhatsApp</a>
          <span>${esc(l.car || '—')}</span>
          ${l.date ? `<span>Дата: ${esc(l.date)}</span>` : ''}
          <span class="muted">${new Date(l.created_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</span>
        </div>
      </div>
      <div class="lead__actions">
        <select aria-label="Статус заявки">${Object.entries(LEAD_LABELS).map(([k, v]) => `<option value="${k}"${l.status === k ? ' selected' : ''}>${v}</option>`).join('')}</select>
        <button class="icon danger" type="button" aria-label="Удалить заявку">🗑</button>
      </div>
    </div>`;
  }).join('');
}
$('.js-leads').addEventListener('change', async (e) => {
  if (e.target.tagName !== 'SELECT') return;
  const id = e.target.closest('.lead').dataset.id;
  await api('lead-status', { method: 'POST', body: { id, status: e.target.value } }).catch((err) => toast(err.message));
  loadLeads();
});
$('.js-leads').addEventListener('click', async (e) => {
  if (!e.target.closest('.danger')) return;
  const id = e.target.closest('.lead').dataset.id;
  if (!confirm('Удалить заявку?')) return;
  await api('lead-delete', { method: 'POST', body: { id } }).catch((err) => toast(err.message));
  loadLeads();
});

// ---------- Settings ----------
async function loadSettings() {
  const [{ settings }, st] = await Promise.all([api('settings'), api('status')]);
  const f = $('.js-settings-form');
  for (const [k, v] of Object.entries(settings)) if (f.elements[k]) f.elements[k].value = v;
  $('.js-db').textContent = st.db ? 'подключена ✓' : 'не подключена';
}
function flash(form, msg, isError = false) {
  const el = form.querySelector('.saved');
  el.textContent = msg;
  el.classList.toggle('is-error', isError);
  if (!isError) setTimeout(() => { el.textContent = ''; }, 2500);
}
$('.js-settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target));
  try {
    await api('settings', { method: 'POST', body });
    flash(e.target, 'Сохранено ✓');
  } catch (err) { flash(e.target, err.message, true); }
});
$('.js-pin-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const { pin, pin2 } = e.target.elements;
  if (pin.value !== pin2.value) return flash(e.target, 'PIN-коды не совпадают', true);
  try {
    await api('pin', { method: 'POST', body: { pin: pin.value } });
    e.target.reset();
    $('.js-pin-banner').hidden = true;
    flash(e.target, 'PIN изменён ✓');
  } catch (err) { flash(e.target, err.message, true); }
});

start();
