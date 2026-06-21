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

  /* ── PHONE MASK (normaliza autofill com +55) ── */
  function normalizePhoneDigits(raw) {
    var d = (raw || '').replace(/\D/g, '');
    d = d.replace(/^0+/, '');
    if (d.length > 11 && d.indexOf('55') === 0) d = d.slice(2);
    if (d.length > 11) d = d.slice(0, 11);
    return d;
  }
  function formatPhone(digits) {
    if (digits.length > 10) return '(' + digits.slice(0,2) + ') ' + digits.slice(2,7) + '-' + digits.slice(7,11);
    if (digits.length > 6)  return '(' + digits.slice(0,2) + ') ' + digits.slice(2,6) + '-' + digits.slice(6);
    if (digits.length > 2)  return '(' + digits.slice(0,2) + ') ' + digits.slice(2);
    if (digits.length > 0)  return '(' + digits;
    return '';
  }
  function applyPhoneMask(input) {
    input.value = formatPhone(normalizePhoneDigits(input.value));
  }
  document.querySelectorAll('.phone-mask').forEach(function(input) {
    var handler = function() { applyPhoneMask(input); };
    ['input', 'change', 'blur'].forEach(function(ev) { input.addEventListener(ev, handler); });
    input.addEventListener('paste', function() { setTimeout(handler, 0); });
    setTimeout(handler, 300);
  });

  /* ── UTM CAPTURE + PERSISTÊNCIA ENTRE PÁGINAS ── */
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  // Ao cair na 1ª página com UTM, guarda na sessão do navegador
  (function persistUTMs() {
    var p = new URLSearchParams(window.location.search);
    UTM_KEYS.forEach(function(k) {
      var v = p.get(k);
      if (v) { try { sessionStorage.setItem('nc_' + k, v); } catch (e) {} }
    });
  })();

  // Lê da URL e, se vazio, recupera da sessão — garante UTM no Make mesmo após navegar
  function getUTMs() {
    var p = new URLSearchParams(window.location.search);
    var out = {};
    UTM_KEYS.forEach(function(k) {
      var v = p.get(k) || '';
      if (!v) { try { v = sessionStorage.getItem('nc_' + k) || ''; } catch (e) {} }
      out[k] = v;
    });
    return out;
  }

  // Repassa as UTMs nos links internos (de uma página v5 para outra)
  (function decorateInternalLinks() {
    var utms = getUTMs();
    var qs = UTM_KEYS.filter(function(k) { return utms[k]; })
                     .map(function(k) { return k + '=' + encodeURIComponent(utms[k]); })
                     .join('&');
    if (!qs) return;
    document.querySelectorAll('a[href]').forEach(function(a) {
      var href = a.getAttribute('href');
      if (!href || /^(https?:|mailto:|tel:|javascript:|#)/i.test(href)) return; // externos/âncoras
      if (href.indexOf('utm_source=') > -1) return;                 // já tem UTM, não duplica
      var hash = '', hi = href.indexOf('#');
      if (hi > -1) { hash = href.slice(hi); href = href.slice(0, hi); } // preserva #âncora
      a.setAttribute('href', href + (href.indexOf('?') > -1 ? '&' : '?') + qs + hash);
    });
  })();

  /* ── LEAD SCORE: mapas de rótulo e pontuação ── */
  var PACIENTES_LABEL = {
    p_10_20:   'De 10 a 20 pacientes',
    p_20_50:   'De 20 a 50 pacientes',
    p_50_100:  'De 50 a 100 pacientes',
    p_100_mais:'Mais de 100 pacientes'
  };
  var PACIENTES_SCORE = { p_10_20:1, p_20_50:2, p_50_100:3, p_100_mais:4 };

  var INVEST_LABEL = {
    acima_50k: 'Acima de R$ 50 mil',
    de_30_50k: 'De R$ 30 mil a R$ 50 mil',
    de_5_30k:  'De R$ 5 mil a R$ 30 mil',
    abaixo_5k: 'Abaixo de R$ 5 mil'
  };
  var INVEST_SCORE = { acima_50k:3, de_30_50k:2, de_5_30k:1, abaixo_5k:0 };

  var PERFIL_SCORE = { dono:2, representante:1, autonomo:0 };

  /* ── MODAL multi-etapa ── */
  var WEBHOOK_URL = 'https://hook.us2.make.com/akop9whubtloyou7p5t4b0uwybtapoj0';

  var overlay   = document.getElementById('leadModal');
  var modalForm = document.getElementById('leadFormModal');

  if (overlay && modalForm) {
    var steps        = Array.prototype.slice.call(modalForm.querySelectorAll('.modal-step'));
    var totalSteps   = steps.length;
    var progressFill = document.getElementById('modalProgress');
    var stepLabel    = document.getElementById('modalStepLabel');
    var modalError   = document.getElementById('modalError');
    var modalSub     = document.getElementById('modalSub');
    var equipInput   = document.getElementById('equipInteresse');
    var btnSubmit    = modalForm.querySelector('button[type="submit"]');
    var BTN_HTML     = btnSubmit ? btnSubmit.innerHTML : '';
    var DEFAULT_SUB  = modalSub ? modalSub.textContent : '';
    var current      = 0;

    function showStep(i) {
      current = Math.max(0, Math.min(i, totalSteps - 1));
      steps.forEach(function(s, idx) { s.classList.toggle('active', idx === current); });
      if (progressFill) progressFill.style.width = ((current + 1) / totalSteps * 100) + '%';
      if (stepLabel) stepLabel.textContent = 'Etapa ' + (current + 1) + ' de ' + totalSteps;
      if (modalError) modalError.style.display = 'none';
      var focusable = steps[current].querySelector('input, button');
      if (focusable && focusable.type !== 'radio') { try { focusable.focus(); } catch (e) {} }
    }

    function openModal(equip) {
      modalForm.reset();
      document.querySelectorAll('.phone-mask').forEach(function(i){ i.value = ''; });
      if (equipInput) equipInput.value = equip || '';
      if (modalSub) modalSub.textContent = equip ? ('Equipamento de interesse: ' + equip) : DEFAULT_SUB;
      if (btnSubmit) { btnSubmit.classList.remove('loading'); btnSubmit.innerHTML = BTN_HTML; }
      showStep(0);
      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }
    function closeModal() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }

    /* abre o modal a partir de qualquer CTA (inclui âncoras antigas dos formulários) */
    document.querySelectorAll('.js-open-modal, a[href="#form-topo"], a[href="#form-final"], a[href="#formulario"]').forEach(function(trigger) {
      trigger.addEventListener('click', function(e) {
        e.preventDefault();
        openModal(trigger.getAttribute('data-equip') || '');
      });
    });

    /* fechar */
    var closeBtn = document.getElementById('modalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && overlay.classList.contains('open')) closeModal();
    });

    /* validação da etapa 1 (contato) */
    function validateStep1() {
      var nome  = (modalForm.querySelector('input[name="nome"]')  || {}).value || '';
      var wpp   = (modalForm.querySelector('input[name="whatsapp"]') || {}).value || '';
      var email = (modalForm.querySelector('input[name="email"]') || {}).value || '';
      nome = nome.trim(); email = email.trim();
      if (!nome || !wpp || !email) return 'Por favor, preencha nome, WhatsApp e e-mail.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Por favor, insira um e-mail válido.';
      if (normalizePhoneDigits(wpp).length < 10) return 'Por favor, insira um WhatsApp válido com DDD.';
      return '';
    }
    function showError(msg) {
      if (!modalError) return;
      modalError.textContent = msg;
      modalError.style.display = 'block';
    }

    /* botão "Continuar" da etapa 1 */
    modalForm.querySelectorAll('.modal-next').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var err = validateStep1();
        if (err) { showError(err); return; }
        showStep(current + 1);
      });
    });

    /* botões "Voltar" */
    modalForm.querySelectorAll('.modal-back').forEach(function(btn) {
      btn.addEventListener('click', function() { showStep(current - 1); });
    });

    /* auto-avança nas etapas de escolha única (perfil e pacientes) */
    ['perfil', 'momento'].forEach(function(field) {
      modalForm.querySelectorAll('input[name="' + field + '"]').forEach(function(radio) {
        radio.addEventListener('change', function() {
          if (current < totalSteps - 1) setTimeout(function() { showStep(current + 1); }, 200);
        });
      });
    });

    /* SUBMIT final */
    modalForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      if (modalError) modalError.style.display = 'none';

      var err = validateStep1();
      if (err) { showStep(0); showError(err); return; }

      var perfilEl  = modalForm.querySelector('input[name="perfil"]:checked');
      var pacEl     = modalForm.querySelector('input[name="momento"]:checked');
      var investEl  = modalForm.querySelector('input[name="investimento"]:checked');
      if (!perfilEl || !pacEl || !investEl) {
        showError('Por favor, responda todas as perguntas antes de enviar.');
        return;
      }

      var nome     = modalForm.querySelector('input[name="nome"]').value.trim();
      var whatsappDigits   = normalizePhoneDigits(modalForm.querySelector('input[name="whatsapp"]').value);
      var whatsappFmt      = formatPhone(whatsappDigits);
      var whatsappE164     = '55' + whatsappDigits;
      var email    = modalForm.querySelector('input[name="email"]').value.trim();

      var perfil   = perfilEl.value;
      var pacCode  = pacEl.value;
      var invCode  = investEl.value;
      var equip    = equipInput ? equipInput.value : '';

      var leadScore   = (PERFIL_SCORE[perfil] || 0) + (PACIENTES_SCORE[pacCode] || 0) + (INVEST_SCORE[invCode] || 0);
      var qualificado = invCode !== 'abaixo_5k';   // regra v1: só "abaixo de 5 mil" não qualifica

      var utms = getUTMs();
      var payload = {
        nome: nome,
        whatsapp: whatsappFmt,
        whatsapp_e164: whatsappE164,
        email: email,
        perfil: perfil,
        momento: PACIENTES_LABEL[pacCode] || pacCode,        // chave legada do Make (agora = nº de pacientes)
        investimento: INVEST_LABEL[invCode] || invCode,       // chave legada do Make (faixa de investimento)
        pacientes: PACIENTES_LABEL[pacCode] || pacCode,
        faixa_investimento: INVEST_LABEL[invCode] || invCode,
        equipamento_interesse: equip,
        lead_score: leadScore,
        qualificado: qualificado,
        origem: modalForm.dataset.origem || 'lp-index-v5',
        utm_source:   utms.utm_source,
        utm_medium:   utms.utm_medium,
        utm_campaign: utms.utm_campaign,
        utm_content:  utms.utm_content,
        utm_term:     utms.utm_term
      };

      if (btnSubmit) { btnSubmit.classList.add('loading'); btnSubmit.textContent = 'Enviando...'; }

      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          mode: 'cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        // Guarda nome + equipamento p/ personalizar a mensagem de WhatsApp na página de obrigado
        try {
          sessionStorage.setItem('nc_nome', nome);
          sessionStorage.setItem('nc_equip', equip || '');
        } catch (e2) {}
        // Roteamento: qualificado dispara Lead (obrigado.html); não-qualificado não dispara nada.
        window.location.href = qualificado ? 'obrigado.html' : 'lead-recebido.html';
      } catch (err2) {
        showError('Erro ao enviar. Verifique sua conexão e tente novamente.');
        if (btnSubmit) { btnSubmit.classList.remove('loading'); btnSubmit.innerHTML = BTN_HTML; }
      }
    });
  }

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
