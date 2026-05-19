document.addEventListener('DOMContentLoaded', function() {

  /* ── MOBILE MENU ── */
  var navToggle = document.getElementById('navToggle');
  var navLinks  = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function() { navLinks.classList.toggle('open'); });
    navLinks.querySelectorAll('a').forEach(function(a) {
      a.addEventListener('click', function() { navLinks.classList.remove('open'); });
    });
  }

  /* ── REVEAL ── */
  var revealObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
    });
  }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(function(el) { revealObs.observe(el); });

  /* ── PHONE MASK ── */
  document.querySelectorAll('.phone-mask').forEach(function(input) {
    input.addEventListener('input', function(e) {
      var v = e.target.value.replace(/\D/g, '');
      if (v.length > 11) v = v.slice(0, 11);
      if (v.length > 6)       v = '(' + v.slice(0,2) + ') ' + v.slice(2,7) + '-' + v.slice(7);
      else if (v.length > 2)  v = '(' + v.slice(0,2) + ') ' + v.slice(2);
      else if (v.length > 0)  v = '(' + v;
      e.target.value = v;
    });
  });

  /* ── UTM CAPTURE ── */
  function getUTMs() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source:   params.get('utm_source')   || '',
      utm_medium:   params.get('utm_medium')   || '',
      utm_campaign: params.get('utm_campaign') || '',
      utm_content:  params.get('utm_content')  || '',
      utm_term:     params.get('utm_term')     || ''
    };
  }

  /* ── FORM SUBMIT (lida com múltiplos formulários) ── */
  var WEBHOOK_URL = 'https://hook.us2.make.com/akop9whubtloyou7p5t4b0uwybtapoj0';

  document.querySelectorAll('.leadForm').forEach(function(form) {
    var btnSubmit = form.querySelector('.btn-submit');
    var formError = form.querySelector('.form-error');
    if (!btnSubmit) return;
    var BTN_HTML  = btnSubmit.innerHTML;

    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      formError.style.display = 'none';

      var nome         = (form.querySelector('input[name="nome"]')     || {}).value || '';
      var whatsapp     = (form.querySelector('input[name="whatsapp"]') || {}).value || '';
      var email        = (form.querySelector('input[name="email"]')    || {}).value || '';
      var perfil       = form.querySelector('input[name="perfil"]:checked');
      var momento      = form.querySelector('input[name="momento"]:checked');
      var investimentoEl = form.querySelector('textarea[name="investimento"]') || form.querySelector('input[name="investimento"]');
      var investimento = investimentoEl ? investimentoEl.value.trim() : '';
      nome = nome.trim(); whatsapp = whatsapp.trim(); email = email.trim();

      if (!nome || !whatsapp || !email || !perfil || !momento || !investimento) {
        formError.textContent = 'Por favor, preencha todos os campos antes de enviar.';
        formError.style.display = 'block';
        formError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        formError.textContent = 'Por favor, insira um e-mail válido.';
        formError.style.display = 'block';
        return;
      }
      if (whatsapp.replace(/\D/g,'').length < 10) {
        formError.textContent = 'Por favor, insira um WhatsApp válido com DDD.';
        formError.style.display = 'block';
        return;
      }

      var utms = getUTMs();
      var payload = {
        nome: nome, whatsapp: whatsapp, email: email,
        perfil: perfil.value, momento: momento.value, investimento: investimento,
        origem: form.dataset.origem || 'lp-newcycle-v4',
        utm_source:   utms.utm_source,
        utm_medium:   utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content:  utms.utm_content,
        utm_term:     utms.utm_term
      };

      btnSubmit.classList.add('loading');
      btnSubmit.textContent = 'Enviando...';

      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        window.location.href = 'obrigado.html';
      } catch (err) {
        formError.textContent = 'Erro ao enviar. Por favor, verifique sua conexão e tente novamente.';
        formError.style.display = 'block';
        btnSubmit.classList.remove('loading');
        btnSubmit.innerHTML = BTN_HTML;
      }
    });
  });

  /* ── COUNT-UP ── */
  function animateCount(el) {
    var target   = parseInt(el.dataset.target);
    var prefix   = el.dataset.prefix || '';
    var duration = 1800;
    var start    = performance.now();
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function step(now) {
      var progress = Math.min((now - start) / duration, 1);
      var current  = Math.floor(easeOut(progress) * target);
      el.textContent = prefix + current.toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(step);
      else el.textContent = prefix + target.toLocaleString('pt-BR');
    }
    requestAnimationFrame(step);
  }
  var countObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting) {
        e.target.querySelectorAll('.count-up').forEach(animateCount);
        countObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  var statsEl = document.querySelector('.stats-grid');
  if (statsEl) countObs.observe(statsEl);

  /* ── FAQ ACCORDION ── */
  window.toggleFaq = function(header) {
    var item     = header.parentElement;
    var answer   = item.querySelector('.faq-answer');
    var isActive = item.classList.contains('active');
    document.querySelectorAll('.faq-item.active').forEach(function(a) {
      a.classList.remove('active');
      a.querySelector('.faq-answer').style.maxHeight = '0';
    });
    if (!isActive) {
      item.classList.add('active');
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  };

});
