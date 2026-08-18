// ---------- Language toggle ----------
const langBtns = document.querySelectorAll('[data-lang-btn]');
const html = document.documentElement;

function setLang(lang){
  html.setAttribute('data-lang', lang);
  langBtns.forEach(b => b.classList.toggle('is-active', b.dataset.langBtn === lang));
  document.querySelectorAll('[data-en][data-it]').forEach(el => {
    el.textContent = el.dataset[lang === 'en' ? 'en' : 'it'];
  });
}

langBtns.forEach(btn => {
  btn.addEventListener('click', () => setLang(btn.dataset.langBtn));
});

// ---------- Parallax on mouse move (desktop) ----------
const parallax = document.getElementById('parallax');
const layers = document.querySelectorAll('.layer');

if (window.matchMedia('(pointer: fine)').matches) {
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5);
    const y = (e.clientY / window.innerHeight - 0.5);
    layers.forEach(layer => {
      const depth = parseFloat(layer.dataset.depth) || 0.05;
      const tx = x * depth * 200;
      const ty = y * depth * 200;
      layer.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  });
}

// ---------- Cover -> About transition ----------
const coverScreen = document.getElementById('cover');
const aboutScreen = document.getElementById('about');
const wipe = document.getElementById('wipe');
const enterBtn = document.getElementById('enterBtn');
const backBtn = document.getElementById('backBtn');

function goTo(targetId){
  const isAbout = targetId === 'about';
  wipe.classList.add('is-running');

  setTimeout(() => {
    coverScreen.classList.toggle('is-active', !isAbout);
    aboutScreen.classList.toggle('is-active', isAbout);
    if (isAbout) aboutScreen.scrollTop = 0;

    wipe.classList.remove('is-running');
    wipe.classList.add('is-leaving');

    setTimeout(() => wipe.classList.remove('is-leaving'), 700);
  }, 700);
}

enterBtn.addEventListener('click', () => goTo('about'));
backBtn.addEventListener('click', () => goTo('cover'));

// allow scrolling down on cover to also enter, like the reference site's "scroll to continue" pattern
let scrollLock = false;
coverScreen.addEventListener('wheel', (e) => {
  if (scrollLock) return;
  if (e.deltaY > 30) {
    scrollLock = true;
    goTo('about');
    setTimeout(() => { scrollLock = false; }, 1500);
  }
}, { passive: true });
