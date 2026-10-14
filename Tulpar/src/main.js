import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import defaults from '../data/defaults.json';
import { api, photoUrl, money, km, carName, esc, specRows, STATUS_LABELS } from './shared.js';

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

document.body.classList.add('is-loading');
$('.js-year').textContent = new Date().getFullYear();

let settings = { ...defaults.settings };
let cars = [];

// ---------- Contacts ----------
function applySettings(s) {
  settings = { ...settings, ...s };
  const tel = settings.phone.replace(/[^\d+]/g, '');
  $$('.js-phone').forEach((a) => { a.href = `tel:${tel}`; a.textContent = settings.phone; });
  $$('.js-mail').forEach((a) => { a.href = `mailto:${settings.email}`; a.textContent = settings.email; });
  $$('.js-wa').forEach((a) => { a.href = `https://wa.me/${settings.whatsapp}`; });
  $('.js-address').textContent = settings.address;
  $('.js-hours').textContent = settings.hours;
  if (settings.instagram) {
    $('.js-ig-wrap').hidden = false;
    $('.js-ig').href = settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`;
  }
}
applySettings({});

// ---------- Smooth scroll ----------
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}
function scrollToEl(el) {
  if (lenis) lenis.scrollTo(el, { duration: 1.6 });
  else el.scrollIntoView();
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(el);
  });
});

// ---------- Header & menu ----------
const header = $('.header');
let lastY = 0;
let menuOpen = false;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  header.classList.toggle('is-solid', y > 40);
  header.classList.toggle('is-hidden', y > lastY && y > 400 && !menuOpen);
  lastY = y;
}, { passive: true });

const burger = $('.burger');
const menu = $('#menu');
function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menu.hidden = true;
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-label', 'Открыть меню');
  lenis?.start();
}
burger.addEventListener('click', () => {
  if (menuOpen) return closeMenu();
  menuOpen = true;
  menu.hidden = false;
  burger.setAttribute('aria-expanded', 'true');
  burger.setAttribute('aria-label', 'Закрыть меню');
  lenis?.stop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// ---------- Reveals ----------
const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add('is-in');
    io.unobserve(e.target);
  }
}, { rootMargin: '0px 0px -12% 0px' });
const armReveals = (root = document) => $$('.reveal, .h2', root).forEach((el) => io.observe(el));

// ---------- Manifesto ----------
const manifesto = $('.js-split');
const goldWords = new Set(['Тулпар', 'характером:', 'свободу,']);
manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/)
  .map((w) => `<span class="w${goldWords.has(w) ? ' is-gold' : ''}">${w}</span>`).join(' ');
const words = $$('.w', manifesto);
if (reducedMotion) words.forEach((w) => w.classList.add('is-lit'));
else {
  ScrollTrigger.create({
    trigger: '.manifesto', start: 'top 40%', end: 'bottom 90%',
    onUpdate: (st) => {
      const n = Math.round(st.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
    },
  });
}

// ---------- Counters ----------
const fmt = (n, el) => (el.dataset.format === 'space' ? Math.round(n).toLocaleString('ru-RU').replace(/ |,/g, ' ') : String(Math.round(n))) + (el.dataset.suffix || '');
$$('[data-count]').forEach((el) => {
  const to = Number(el.dataset.count);
  el.textContent = fmt(reducedMotion ? to : 0, el);
  if (reducedMotion) return;
  ScrollTrigger.create({
    trigger: el, start: 'top 85%', once: true,
    onEnter: () => {
      const o = { v: 0 };
      gsap.to(o, { v: to, duration: 2, ease: 'expo.out', onUpdate: () => { el.textContent = fmt(o.v, el); } });
    },
  });
});

// ---------- Services: horizontal scroll on desktop ----------
gsap.matchMedia().add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
  const track = $('.services__track');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: { trigger: '.services', pin: '.services__pin', start: 'top top', end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true },
  });
  return () => tween.scrollTrigger?.kill();
});

// ---------- Catalog ----------
const grid = $('.js-grid');
let filter = 'all';
grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);

function cardHtml(c) {
  const cover = c.photos?.[0];
  const chips = [c.year, c.mileage ? km(c.mileage) : 'Новый', c.power ? `${c.power} л.с.` : '', c.transmission?.split(',')[0], c.drive]
    .filter(Boolean).slice(0, 4);
  return `
    <article class="car reveal" data-id="${esc(c.id)}">
      <div class="car__img">
        ${cover ? `<img src="${esc(photoUrl(cover))}" alt="${esc(carName(c))}" loading="lazy" decoding="async" />` : '<span class="noimg">Фото скоро</span>'}
        <span class="badge badge--${esc(c.status)}">${STATUS_LABELS[c.status] || ''}</span>
      </div>
      <div class="car__body">
        <h3 class="car__title">${esc(carName(c))}<small>${esc([c.trim, c.color].filter(Boolean).join(' · '))}</small></h3>
        <div class="car__chips">${chips.map((x) => `<span>${esc(x)}</span>`).join('')}</div>
        <div class="car__foot">
          <span class="car__price">${money(c.price)}${c.oldPrice > c.price ? `<s>${money(c.oldPrice)}</s>` : ''}</span>
          <span class="car__more">Подробнее →</span>
        </div>
      </div>
      <button class="car__btn" type="button" aria-label="Подробнее: ${esc(carName(c))}"></button>
    </article>`;
}

function renderCatalog() {
  const list = cars.filter((c) => filter === 'all' || c.category === filter);
  grid.innerHTML = list.map(cardHtml).join('');
  $('.js-empty').hidden = list.length > 0;
  $$('.car', grid).forEach((el) => {
    io.observe(el);
    $('.car__btn', el).addEventListener('click', () => openSheet(el.dataset.id));
  });
  ScrollTrigger.refresh();
}

$$('.chip').forEach((b) => b.addEventListener('click', () => {
  filter = b.dataset.filter;
  $$('.chip').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-selected', String(x === b)); });
  renderCatalog();
}));

function applyCars(list) {
  cars = list;
  renderCatalog();
  const stock = cars.filter((c) => c.status === 'stock').length;
  $('.js-stock-count').textContent = stock || cars.length;

  // Test-drive select
  const sel = $('.js-car-select');
  sel.innerHTML = '<option>Пока не знаю</option>' + cars.filter((c) => c.status !== 'sold')
    .map((c) => `<option>${esc([carName(c), c.year].filter(Boolean).join(', '))}</option>`).join('');

  // Showroom: the featured car's specs
  const f = cars.find((c) => c.featured) || cars[0];
  if (f) {
    $('.js-feature-name').textContent = carName(f);
    const sp = [['Мощность', f.power ? `${f.power} л.с.` : ''], ['Двигатель', f.engine], ['0–100 км/ч', f.accel], ['Год', f.year]]
      .filter(([, v]) => v).slice(0, 3);
    $('.js-feature-specs').innerHTML = sp.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('.js-feature-open').onclick = () => openSheet(f.id);
  }
}

// ---------- Car sheet ----------
const sheet = $('.sheet');
let sheetCar = null;
const RATE = 0.14;

function updateCalc() {
  if (!sheetCar) return;
  const down = Number($('.js-calc-down').value);
  const term = Number($('.js-calc-term').value);
  $('.js-calc-down-out').textContent = `${down}% · ${money(Math.round(sheetCar.price * down / 100))}`;
  $('.js-calc-term-out').textContent = `${term} мес.`;
  const principal = sheetCar.price * (1 - down / 100);
  const r = RATE / 12;
  const pay = principal > 0 ? (principal * r) / (1 - Math.pow(1 + r, -term)) : 0;
  $('.js-calc-pay').textContent = sheetCar.price ? money(Math.round(pay / 1000) * 1000) : '—';
}
$('.js-calc-down').addEventListener('input', updateCalc);
$('.js-calc-term').addEventListener('input', updateCalc);

function showPhoto(i) {
  const p = sheetCar.photos[i];
  $('.js-sheet-img').src = p ? photoUrl(p) : '';
  $('.js-sheet-img').alt = carName(sheetCar);
  $$('.js-sheet-thumbs button').forEach((b, j) => b.classList.toggle('is-active', i === j));
}

function openSheet(id) {
  const c = cars.find((x) => x.id === id);
  if (!c) return;
  sheetCar = c;
  $('.js-sheet-status').textContent = STATUS_LABELS[c.status] || '';
  $('#sheet-title').textContent = carName(c);
  $('.js-sheet-sub').textContent = [c.trim, c.year, c.color].filter(Boolean).join(' · ');
  $('.js-sheet-price').textContent = money(c.price);
  $('.js-sheet-old').textContent = c.oldPrice > c.price ? money(c.oldPrice) : '';
  $('.js-sheet-specs').innerHTML = specRows(c).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
  $('.js-sheet-desc').textContent = c.description || '';
  $('.js-sheet-features').innerHTML = (c.features || []).map((f) => `<li>${esc(f)}</li>`).join('');
  $('.js-sheet-thumbs').innerHTML = (c.photos || []).length > 1
    ? c.photos.map((p, i) => `<button type="button" aria-label="Фото ${i + 1}"><img src="${esc(photoUrl(p))}" alt="" loading="lazy" /></button>`).join('')
    : '';
  $$('.js-sheet-thumbs button').forEach((b, i) => b.addEventListener('click', () => showPhoto(i)));
  showPhoto(0);
  $('.calc').hidden = !c.price || c.status === 'sold';
  updateCalc();
  const text = `Здравствуйте! Интересует ${carName(c)}${c.year ? `, ${c.year}` : ''} (${money(c.price)}).`;
  $('.js-sheet-wa').href = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`;
  lenis?.stop();
  sheet.showModal();
}
function closeSheet() { sheet.close(); }
sheet.addEventListener('close', () => lenis?.start());
$('.sheet__close').addEventListener('click', closeSheet);
sheet.addEventListener('click', (e) => { if (e.target === sheet) closeSheet(); });
$('.js-sheet-drive').addEventListener('click', () => {
  const label = [carName(sheetCar), sheetCar.year].filter(Boolean).join(', ');
  const sel = $('.js-car-select');
  const opt = [...sel.options].find((o) => o.text === label);
  if (opt) sel.value = opt.text;
  closeSheet();
  scrollToEl($('#test-drive'));
  setTimeout(() => $('.form').elements.name.focus({ preventScroll: true }), 1200);
});

// ---------- Test-drive form ----------
const form = $('.form');
const status = $('.form__status');
const phoneInput = form.elements.phone;
phoneInput.addEventListener('input', () => {
  let d = phoneInput.value.replace(/\D/g, '');
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (d && !d.startsWith('7')) d = '7' + d;
  d = d.slice(0, 11);
  const parts = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)].filter(Boolean);
  phoneInput.value = d ? `+7 ${parts.join(' ')}`.trim() : '';
});
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = form.elements.name;
  const okName = name.value.trim().length > 1;
  const okPhone = phoneInput.value.replace(/\D/g, '').length === 11;
  name.setAttribute('aria-invalid', String(!okName));
  phoneInput.setAttribute('aria-invalid', String(!okPhone));
  if (!okName || !okPhone) {
    status.textContent = !okName ? 'Укажите, как к вам обращаться.' : 'Проверьте номер телефона.';
    (!okName ? name : phoneInput).focus();
    return;
  }
  const lead = {
    name: name.value.trim(),
    phone: phoneInput.value,
    car: form.elements.car.value,
    date: form.elements.date.value ? new Date(form.elements.date.value).toLocaleDateString('ru-RU') : '',
  };
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  status.textContent = 'Отправляем…';
  try {
    await api('lead', { method: 'POST', body: lead });
    status.textContent = 'Спасибо! Менеджер перезвонит в течение 10 минут.';
    form.reset();
  } catch {
    // No database yet (or offline): hand the request to WhatsApp instead
    const text = `Здравствуйте! Хочу на тест-драйв.\nИмя: ${lead.name}\nТелефон: ${lead.phone}\nАвтомобиль: ${lead.car}\nДата: ${lead.date || 'не указана'}`;
    const href = `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(text)}`;
    status.innerHTML = `Откройте WhatsApp, чтобы отправить заявку: <a href="${href}" target="_blank" rel="noopener">написать менеджеру</a>`;
    window.open(href, '_blank', 'noopener');
  } finally {
    btn.disabled = false;
  }
});

// ---------- Data ----------
async function loadData() {
  const [c, s] = await Promise.allSettled([api('cars'), api('settings')]);
  applyCars(c.status === 'fulfilled' ? c.value.cars : defaults.cars.filter((x) => !x.hidden));
  if (s.status === 'fulfilled') applySettings(s.value.settings);
}

// ---------- Studio stage: one photo per section ----------
const stageImgs = $$('.stage__img');
const viewSections = $$('section[data-view]');
let showroomView = 'side';
let currentView = 'low';

function setView(name) {
  if (name === currentView) return;
  currentView = name;
  stageImgs.forEach((img) => img.classList.toggle('is-active', img.dataset.view === name));
}

function updateStage() {
  const mid = window.innerHeight * 0.5;
  for (const el of viewSections) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) {
      setView(el.dataset.view === 'showroom' ? showroomView : el.dataset.view);
      return;
    }
  }
}
window.addEventListener('scroll', updateStage, { passive: true });

// Gentle parallax that follows the cursor
if (!reducedMotion && !isMobile) {
  window.addEventListener('pointermove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * -18;
    const y = (e.clientY / window.innerHeight - 0.5) * -12;
    document.querySelector('.stage').style.setProperty('--px', `${x.toFixed(1)}px`);
    document.querySelector('.stage').style.setProperty('--py', `${y.toFixed(1)}px`);
  }, { passive: true });
}

// Showroom: pick a view, or swipe across the photo to cycle through them
const VIEWS = ['side', 'low', 'front', 'top'];
function pickView(name) {
  showroomView = name;
  $$('.view').forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle('is-active', on);
    b.setAttribute('aria-checked', String(on));
  });
  updateStage();
}
$$('.view').forEach((b) => b.addEventListener('click', () => pickView(b.dataset.view)));
const drag = $('.showroom__drag');
let dragX = null;
drag.addEventListener('pointerdown', (e) => { dragX = e.clientX; });
window.addEventListener('pointerup', (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  dragX = null;
  if (Math.abs(dx) < 40) return;
  const i = VIEWS.indexOf(showroomView);
  pickView(VIEWS[(i + (dx < 0 ? 1 : VIEWS.length - 1)) % VIEWS.length]);
});

// ---------- Boot ----------
const loaderCount = $('.js-count');
const loaderBar = $('.js-bar');
let progress = 0;
function setProgress(p) {
  progress = Math.max(progress, p);
  loaderCount.textContent = String(Math.round(progress)).padStart(3, '0');
  loaderBar.style.transform = `scaleX(${progress / 100})`;
}
const fake = setInterval(() => setProgress(Math.min(progress + 9, 85)), 80);

async function boot() {
  const first = stageImgs[0];
  const firstLoaded = first.complete ? Promise.resolve() : new Promise((r) => { first.onload = r; first.onerror = r; });
  await Promise.race([
    Promise.allSettled([document.fonts?.ready, loadData(), firstLoaded]),
    new Promise((r) => setTimeout(r, 4000)),
  ]);
  clearInterval(fake);
  setProgress(100);
  await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 300));

  $('.loader').classList.add('is-done');
  document.body.classList.remove('is-loading');
  lenis?.start();
  setTimeout(() => {
    $$('.hero .line').forEach((l) => l.classList.add('is-in'));
    armReveals();
    ScrollTrigger.refresh();
    updateStage();
  }, reducedMotion ? 0 : 300);
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

boot();
