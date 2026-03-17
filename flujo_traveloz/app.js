/* ═══════════════════════════════════════════════════════════
   TravelOz — Flujo Backend Admin
   JavaScript: Interactividad, scroll animations, counter
   ═══════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── Navbar scroll effect ────────────────────────
  var navbar = document.getElementById('navbar');

  function handleNavScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', handleNavScroll, { passive: true });
  handleNavScroll();

  // ─── Mobile nav toggle ───────────────────────────
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.querySelector('.navbar-links');

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
  }

  document.querySelectorAll('.nav-link').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });

  // ─── Active nav link on scroll ───────────────────
  var sections = document.querySelectorAll('section[id]');
  var navLinksAll = document.querySelectorAll('.nav-link');

  function updateActiveNav() {
    var scrollY = window.scrollY + 120;

    sections.forEach(function (section) {
      var top = section.offsetTop;
      var height = section.offsetHeight;
      var id = section.getAttribute('id');

      if (scrollY >= top && scrollY < top + height) {
        navLinksAll.forEach(function (link) {
          link.classList.remove('active');
          if (link.getAttribute('href') === '#' + id) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });

  // ─── Animated counter ────────────────────────────
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var duration = 1600;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(step);
  }

  // ─── Scroll reveal (IntersectionObserver) ────────
  var revealElements = [];

  var selectors = [
    '.glass-card',
    '.module-card',
    '.service-card',
    '.system-card',
    '.timeline-item',
    '.role-card',
    '.rule-row',
    '.benefit-row',
    '.stack-card',
    '.diagram-wrapper',
    '.section-header',
    '.pricing-card',
    '.option-card',
    '.options-fixed',
    '.entity-card',
    '.callout'
  ];

  selectors.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      el.classList.add('reveal');
      revealElements.push(el);
    });
  });

  var counterEls = document.querySelectorAll('.stat-number[data-count]');
  var countersAnimated = false;

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var parent = entry.target.parentElement;
          var siblings = parent
            ? Array.from(parent.children).filter(function (c) {
                return c.classList.contains('reveal');
              })
            : [];
          var idx = siblings.indexOf(entry.target);
          var delay = Math.max(0, idx) * 80;

          setTimeout(function () {
            entry.target.classList.add('visible');
          }, delay);

          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
  );

  revealElements.forEach(function (el) {
    observer.observe(el);
  });

  // Counter observer
  var counterObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          counterEls.forEach(function (el, i) {
            setTimeout(function () {
              animateCounter(el);
            }, i * 150);
          });
        }
      });
    },
    { threshold: 0.5 }
  );

  var heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    counterObserver.observe(heroStats);
  }

  // ─── Smooth scroll for anchor links ──────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      var targetId = this.getAttribute('href').slice(1);
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();
