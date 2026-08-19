/* =========================================================================
   AIFOS — Comportements d'interface
   Aucune dépendance. Le site reste utilisable sans JavaScript.
   ========================================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------------
     1. Header sticky : ombre après 80 px de scroll (spec §4.1)
     --------------------------------------------------------------------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var ticking = false;
    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 80);
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(onScroll);
      }
    }, { passive: true });
    onScroll();
  }

  /* ---------------------------------------------------------------------
     2. Menu mobile
     --------------------------------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');

  if (toggle && mobileNav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      mobileNav.classList.toggle('is-open', open);
      mobileNav.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('nav-open', open);
    };

    setOpen(false);

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    mobileNav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Repasser en desktop referme le menu et libère le scroll
    window.matchMedia('(min-width: 1080px)').addEventListener('change', function (e) {
      if (e.matches) setOpen(false);
    });
  }

  /* ---------------------------------------------------------------------
     3. Apparition au scroll (spec §14) — fade-in + translate Y
     --------------------------------------------------------------------- */
  var revealables = document.querySelectorAll('.reveal, .method__step');

  if (reduceMotion || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(revealables, function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    Array.prototype.forEach.call(revealables, function (el) {
      observer.observe(el);
    });
  }

  /* ---------------------------------------------------------------------
     4. Formulaire de contact
     Validation légère + envoi AJAX si un endpoint est configuré.
     Sans endpoint, le formulaire retombe sur un mailto (voir data-fallback).
     --------------------------------------------------------------------- */
  var form = document.querySelector('[data-contact-form]');

  if (form) {
    var status = form.querySelector('.form__status');
    var submitBtn = form.querySelector('[type="submit"]');
    var msgOk = form.getAttribute('data-msg-ok') || 'Merci, votre demande a bien été envoyée.';
    var msgKo = form.getAttribute('data-msg-ko') || 'Une erreur est survenue. Merci de réessayer.';
    var sendingLabel = form.getAttribute('data-msg-sending') || 'Envoi…';

    var showStatus = function (text, ok) {
      if (!status) return;
      status.textContent = text;
      status.classList.add('is-shown');
      status.classList.toggle('form__status--ok', ok);
      status.classList.toggle('form__status--ko', !ok);
      status.setAttribute('role', 'status');
    };

    var fieldError = function (input, show) {
      var wrap = input.closest('.field');
      if (!wrap) return;
      var err = wrap.querySelector('.field__error');
      input.setAttribute('aria-invalid', String(show));
      if (err) {
        err.classList.toggle('is-shown', show);
        input.setAttribute('aria-describedby', show ? err.id : '');
      }
    };

    // Retire l'état d'erreur dès que l'utilisateur corrige
    form.addEventListener('input', function (e) {
      if (e.target.matches('input, select, textarea') && e.target.checkValidity()) {
        fieldError(e.target, false);
      }
    });

    form.addEventListener('submit', function (e) {
      var invalid = null;

      Array.prototype.forEach.call(form.elements, function (el) {
        if (!el.name || el.type === 'submit') return;
        var ok = el.checkValidity();
        fieldError(el, !ok);
        if (!ok && !invalid) invalid = el;
      });

      if (invalid) {
        e.preventDefault();
        invalid.focus();
        return;
      }

      var endpoint = form.getAttribute('action');

      // Envoi natif géré par le navigateur (mailto:)
      if (endpoint && endpoint.indexOf('mailto:') === 0) return;

      // FORM_ENDPOINT pas encore renseigné : on bloque plutôt que d'envoyer
      // le visiteur sur une 404. Voir README.md § « Variables à renseigner ».
      if (!endpoint || endpoint.indexOf('{{') !== -1) {
        e.preventDefault();
        showStatus(form.getAttribute('data-msg-unconfigured') || msgKo, false);
        return;
      }

      e.preventDefault();

      var originalLabel = submitBtn ? submitBtn.textContent : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = sendingLabel;
      }

      fetch(endpoint, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          showStatus(msgOk, true);
          form.reset();
        })
        .catch(function () {
          showStatus(msgKo, false);
        })
        .then(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalLabel;
          }
        });
    });
  }

  /* ---------------------------------------------------------------------
     5. Année courante dans le footer
     --------------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
