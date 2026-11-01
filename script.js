(() => {
  'use strict';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  let lastScroll = window.scrollY;
  let ticking = false;
  const menuToggle = document.querySelector('#menu-toggle');

  // En-tête qui se masque en descendant et réapparaît en remontant.
  function updateHeader() {
    if (!header) return;
    const current = window.scrollY;
    const menuOpen = menuToggle && menuToggle.checked;
    header.classList.toggle('header-scrolled', current > 20);
    if (menuOpen || current < 100 || current < lastScroll) header.classList.remove('header-hidden');
    else if (current > lastScroll + 4) header.classList.add('header-hidden');
    lastScroll = current;
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { window.requestAnimationFrame(updateHeader); ticking = true; }
  }, { passive: true });
  menuToggle?.addEventListener('change', () => { if (menuToggle.checked) header?.classList.remove('header-hidden'); });
  document.querySelectorAll('.main-nav a').forEach(link => link.addEventListener('click', () => { if (menuToggle) menuToggle.checked = false; }));

  // Animations d'apparition au défilement.
  const revealTargets = document.querySelectorAll('.section, .page-hero, .card, .member, .service-item, .stats-grid > div, .cta-panel');
  if ('IntersectionObserver' in window && !reduceMotion) {
    revealTargets.forEach(el => el.classList.add('reveal-ready'));
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.12 });
    revealTargets.forEach(el => revealObserver.observe(el));
  }

  // Compteurs animés : conserve le suffixe et le format d'origine.
  const counters = document.querySelectorAll('.stats-grid strong');
  function animateCounter(el) {
    if (el.dataset.counted) return;
    el.dataset.counted = 'true';
    const original = el.textContent.trim();
    const match = original.match(/^([0-9]+(?:[.,][0-9]+)?)(.*)$/);
    if (!match) return;
    const target = Number(match[1].replace(',', '.'));
    const suffix = match[2];
    const decimals = (match[1].split(/[.,]/)[1] || '').length;
    const duration = reduceMotion ? 1 : 1100;
    const start = performance.now();
    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      const formatted = decimals ? value.toFixed(decimals).replace('.', ',') : String(Math.round(value)).padStart(match[1].length, '0');
      el.textContent = formatted + suffix;
      if (progress < 1) requestAnimationFrame(frame); else el.textContent = original;
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { animateCounter(entry.target); counterObserver.unobserve(entry.target); }
    }), { threshold: 0.6 });
    counters.forEach(el => counterObserver.observe(el));
  } else counters.forEach(animateCounter);

  // Carrousel de témoignages avec commandes et rotation automatique.
  document.querySelectorAll('[data-testimonial-carousel]').forEach(carousel => {
    const slides = [...carousel.querySelectorAll('.testimonial-slide')];
    const dots = [...carousel.querySelectorAll('[data-carousel-dot]')];
    if (!slides.length) return;
    let active = 0;
    let timer;
    function show(index) {
      active = (index + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        const selected = i === active;
        slide.hidden = !selected;
        slide.classList.toggle('is-active', selected);
        slide.setAttribute('aria-hidden', String(!selected));
      });
      dots.forEach((dot, i) => { if (i === active) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
    }
    const restart = () => { clearInterval(timer); if (!reduceMotion && slides.length > 1) timer = setInterval(() => show(active + 1), 6000); };
    carousel.querySelector('[data-carousel-prev]')?.addEventListener('click', () => { show(active - 1); restart(); });
    carousel.querySelector('[data-carousel-next]')?.addEventListener('click', () => { show(active + 1); restart(); });
    dots.forEach((dot, i) => dot.addEventListener('click', () => { show(i); restart(); }));
    carousel.addEventListener('mouseenter', () => clearInterval(timer));
    carousel.addEventListener('mouseleave', restart);
    carousel.addEventListener('focusin', () => clearInterval(timer));
    carousel.addEventListener('focusout', restart);
    show(0); restart();
  });

  // Fenêtre modale pour les appels à l'action.
  const modal = document.createElement('dialog');
  modal.className = 'cta-dialog';
  modal.setAttribute('aria-labelledby', 'cta-dialog-title');
  modal.innerHTML = `<div class="cta-dialog-content"><button type="button" class="dialog-close" aria-label="Fermer">×</button><p class="eyebrow">VOTRE PROCHAIN PROJET</p><h2 id="cta-dialog-title">Prêt à donner vie à votre idée ?</h2><p>Présentez-nous votre besoin : nous serons ravis d'en discuter avec vous.</p><a class="btn" href="${document.querySelector('.logo')?.getAttribute('href')?.startsWith('../') ? 'contact.html' : 'pages/contact.html'}">Contacter Novatech ↗</a></div>`;
  document.body.appendChild(modal);
  const closeModal = () => modal.close();
  modal.querySelector('.dialog-close').addEventListener('click', closeModal);
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.querySelectorAll('.cta-panel .btn-light').forEach(link => {
    link.addEventListener('click', event => { event.preventDefault(); if (typeof modal.showModal === 'function') modal.showModal(); else window.location.href = link.href; });
  });

  // Validation personnalisée du formulaire de contact.
  const form = document.querySelector('.form');
  if (form) {
    const fields = ['nom', 'email', 'type', 'message'];
    const feedback = form.querySelector('.form-feedback');
    const validators = {
      nom: value => value.trim().length >= 2 ? '' : 'Veuillez saisir au moins 2 caractères.',
      email: value => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) ? '' : 'Veuillez saisir une adresse e-mail valide.',
      type: value => value.trim() ? '' : 'Veuillez sélectionner un type de projet.',
      message: value => value.trim().length < 20 ? 'Votre message doit contenir au moins 20 caractères.' : value.trim().length > 1000 ? 'Votre message ne doit pas dépasser 1 000 caractères.' : ''
    };
    function validate(id) {
      const field = form.querySelector(`#${id}`);
      const error = form.querySelector(`[data-error-for="${id}"]`);
      const message = validators[id](field.value);
      field.setAttribute('aria-invalid', String(Boolean(message)));
      if (error) error.textContent = message;
      return !message;
    }
    fields.forEach(id => {
      const field = form.querySelector(`#${id}`);
      field?.addEventListener('blur', () => validate(id));
      field?.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(id); });
      field?.addEventListener('change', () => validate(id));
    });
    form.addEventListener('submit', event => {
      const valid = fields.map(validate).every(Boolean);
      if (!valid) {
        event.preventDefault();
        feedback.textContent = 'Certains champs nécessitent votre attention.';
        form.querySelector('[aria-invalid="true"]')?.focus();
      } else {
        feedback.textContent = 'Validation réussie. Votre application e-mail va préparer le message.';
      }
    });
  }
})();
