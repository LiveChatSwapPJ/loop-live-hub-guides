/**
 * 左ペイン: ページ内アンカーの現在地ハイライト、スマホでリンク押下後にメニューを閉じる
 */
(function () {
  const nav = document.getElementById('tocNav');
  if (!nav) return;

  const mqMobile = window.matchMedia('(max-width: 959px)');
  function closeNavIfMobile() {
    if (!mqMobile.matches) return;
    nav.classList.remove('nav--open');
    const btn = document.getElementById('navMenuBtn');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  nav.addEventListener('click', function (e) {
    if (!e.target.closest('a')) return;
    closeNavIfMobile();
  });

  const toc = nav.querySelector('.nav__toc');
  const anchorLinks = Array.from(nav.querySelectorAll('.nav__sub a[href^="#"]'));
  if (!anchorLinks.length) return;

  function clearAnchorActive() {
    anchorLinks.forEach(function (link) {
      link.classList.remove('nav__anchor--active');
      link.removeAttribute('aria-current');
    });
  }

  function setActiveById(id) {
    clearAnchorActive();
    if (!id) return;
    const target = nav.querySelector('.nav__sub a[href="#' + id + '"]');
    if (target) {
      target.classList.add('nav__anchor--active');
      target.setAttribute('aria-current', 'location');
      if (toc && !toc.open) toc.open = true;
    }
  }

  const ids = anchorLinks
    .map(function (a) {
      const h = a.getAttribute('href');
      return h && h.charAt(0) === '#' ? h.slice(1) : '';
    })
    .filter(Boolean);

  const main = document.getElementById('main');
  if (!main || !ids.length) {
    window.addEventListener('hashchange', function () {
      setActiveById(location.hash.slice(1));
    });
    setActiveById(location.hash.slice(1));
    return;
  }

  const sectionEls = ids
    .map(function (id) {
      const el = document.getElementById(id);
      return el && main.contains(el) ? el : null;
    })
    .filter(Boolean);

  if (!sectionEls.length) {
    window.addEventListener('hashchange', function () {
      setActiveById(location.hash.slice(1));
    });
    setActiveById(location.hash.slice(1));
    return;
  }

  const offset = 96;

  function pickSectionByScroll() {
    const y = window.scrollY + offset;
    let chosen = sectionEls[0];
    for (let i = 0; i < sectionEls.length; i++) {
      const el = sectionEls[i];
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (top <= y + 1) chosen = el;
    }
    return chosen.id;
  }

  let ticking = false;
  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      setActiveById(pickSectionByScroll());
    });
  }

  window.addEventListener('scroll', onScrollOrResize, { passive: true });
  window.addEventListener('resize', onScrollOrResize);

  window.addEventListener('hashchange', function () {
    const id = location.hash.slice(1);
    if (id && ids.indexOf(id) !== -1) setActiveById(id);
  });

  if (location.hash) {
    const id = location.hash.slice(1);
    if (ids.indexOf(id) !== -1) setActiveById(id);
    else onScrollOrResize();
  } else {
    onScrollOrResize();
  }
})();
