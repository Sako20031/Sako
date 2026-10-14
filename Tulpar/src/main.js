import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

// ---- Edit these before launch ----
const CONFIG = {
  phone: '+77000000000',          // phone for calls, digits only after +
  whatsapp: '77000000000',        // WhatsApp number for test-drive requests
  email: 'hello@tulpar.kz',
};

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 860px), (pointer: coarse)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

document.body.classList.add('is-loading');

// ---------- Contacts ----------
$('.js-year').textContent = new Date().getFullYear();
$('.js-phone').href = `tel:${CONFIG.phone}`;
$('.js-mail').href = `mailto:${CONFIG.email}`;
$('.js-mail').textContent = CONFIG.email;
$('.js-wa').href = `https://wa.me/${CONFIG.whatsapp}`;

// ---------- Smooth scroll ----------
let lenis = null;
if (!reducedMotion) {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { offset: 0, duration: 1.6 });
  else target.scrollIntoView();
}
$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollTo(el);
  });
});

// ---------- Header ----------
const header = $('.header');
let lastY = 0;
function onScrollHeader() {
  const y = window.scrollY;
  header.classList.toggle('is-solid', y > 40);
  header.classList.toggle('is-hidden', y > lastY && y > 400 && !menuOpen);
  lastY = y;
}
window.addEventListener('scroll', onScrollHeader, { passive: true });

const burger = $('.burger');
const menu = $('#menu');
let menuOpen = false;
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
function armReveals() {
  $$('.reveal, .h2, .card').forEach((el) => io.observe(el));
}

// ---------- Manifesto word-by-word ----------
const manifesto = $('.js-split');
const goldWords = new Set(['Тулпар', 'характером:', 'свободу,']);
manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/)
  .map((w) => `<span class="w${goldWords.has(w) ? ' is-gold' : ''}">${w}</span>`).join(' ');
const words = $$('.w', manifesto);
if (reducedMotion) words.forEach((w) => w.classList.add('is-lit'));
else {
  ScrollTrigger.create({
    trigger: '.manifesto',
    start: 'top 40%',
    end: 'bottom 90%',
    onUpdate: (st) => {
      const n = Math.round(st.progress * words.length);
      words.forEach((w, i) => w.classList.toggle('is-lit', i < n));
    },
  });
}

// ---------- Counters ----------
const fmt = (n, el) => {
  const s = el.dataset.format === 'space' ? Math.round(n).toLocaleString('ru-RU').replace(/,/g, ' ') : String(Math.round(n));
  return s + (el.dataset.suffix || '');
};
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
const mm = gsap.matchMedia();
mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
  const track = $('.services__track');
  const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const tween = gsap.to(track, {
    x: () => -dist(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.services', pin: '.services__pin', start: 'top top',
      end: () => `+=${dist()}`, scrub: 0.6, invalidateOnRefresh: true,
    },
  });
  return () => tween.scrollTrigger?.kill();
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
form.addEventListener('submit', (e) => {
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
  const date = form.elements.date.value ? new Date(form.elements.date.value).toLocaleDateString('ru-RU') : 'не указана';
  const text = `Здравствуйте! Хочу на тест-драйв.\nИмя: ${name.value.trim()}\nТелефон: ${phoneInput.value}\nКласс: ${form.elements.model.value}\nДата: ${date}`;
  status.textContent = 'Спасибо! Открываем WhatsApp, чтобы отправить заявку менеджеру.';
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
});

// ---------- 3D stage ----------
const loaderCount = $('.js-count');
const loaderBar = $('.js-bar');
let progress = 0;
function setProgress(p) {
  progress = Math.max(progress, p);
  loaderCount.textContent = String(Math.round(progress)).padStart(3, '0');
  loaderBar.style.transform = `scaleX(${progress / 100})`;
}
const fake = setInterval(() => setProgress(Math.min(progress + 7, 85)), 90);

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch { return false; }
}

async function boot() {
  let stage = null;
  if (hasWebGL()) {
    try {
      const { createStage } = await import('./scene.js');
      stage = createStage($('.stage__canvas'), { reducedMotion, isMobile });
      stage.bindDrag($('.showroom__drag'));
      $$('.swatch').forEach((b) => b.addEventListener('click', () => {
        $$('.swatch').forEach((s) => { s.classList.remove('is-active'); s.setAttribute('aria-checked', 'false'); });
        b.classList.add('is-active');
        b.setAttribute('aria-checked', 'true');
        stage.setPaint(b.dataset.color);
      }));
      stage.start();
    } catch (err) {
      console.warn('WebGL stage failed, using fallback', err);
      document.documentElement.classList.add('no-webgl');
    }
  } else {
    document.documentElement.classList.add('no-webgl');
  }

  await document.fonts?.ready;
  clearInterval(fake);
  setProgress(100);
  await new Promise((r) => setTimeout(r, reducedMotion ? 0 : 450));

  $('.loader').classList.add('is-done');
  document.body.classList.remove('is-loading');
  lenis?.start();
  stage?.playIntro(gsap);
  setTimeout(() => {
    $$('.hero .line').forEach((l) => l.classList.add('is-in'));
    armReveals();
    ScrollTrigger.refresh();
    stage?.measure();
  }, reducedMotion ? 0 : 350);

  window.addEventListener('load', () => { ScrollTrigger.refresh(); stage?.measure(); });
  ScrollTrigger.addEventListener('refresh', () => stage?.measure());
}

boot();
