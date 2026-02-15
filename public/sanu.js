/* ════════════════════════════════════════════
   SANÙ — sanu.js
   ════════════════════════════════════════════ */

// ── CONFIG ───────────────────────────────────────────────────────
const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwnnLMoCSZghYoKl5rXbzawJQMrJ9ayvGnAMo5lKA7yELutFZrZRUPJ-aPtRGCFWlMS/exec";
// ─────────────────────────────────────────────────────────────────


// ── SCROLL REVEAL ─────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  let delay = 0;
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.transitionDelay = delay + 's';
      entry.target.classList.add('vis');
      delay += 0.06;
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


// ── MULTI-STEP FORM ───────────────────────────────────────────────

// Form data collected across steps
const formData = {
  what_sells:   '',
  difficulties: '',
  automate:     '',
  contact:      '',
  source:       'landing',
};

// ── Chip selection ──

document.querySelectorAll('.msf-chips').forEach(group => {
  const isMulti = group.classList.contains('multi');

  group.querySelectorAll('.msf-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (isMulti) {
        // Multi: toggle each chip independently
        chip.classList.toggle('sel');
      } else {
        // Single: deselect all, then select clicked
        group.querySelectorAll('.msf-chip').forEach(c => c.classList.remove('sel'));
        chip.classList.add('sel');

        // Show free-text field when "Autre" is selected (step 1 only)
        const otherField = document.getElementById('sells-other');
        if (otherField) {
          otherField.hidden = chip.dataset.val !== 'Autre';
        }
      }
    });
  });
});


// ── Navigation ──

document.querySelectorAll('.msf-btn-next').forEach(btn => {
  if (btn.classList.contains('cta-anchor')) return; // skip the CTA link
  btn.addEventListener('click', () => {
    const step = parseInt(btn.dataset.step, 10);
    collectStep(step);

    // Last step → submit
    if (step === 3) {
      submitForm();
    } else {
      goToStep(step + 1);
    }
  });
});

document.querySelectorAll('.msf-btn-back').forEach(btn => {
  btn.addEventListener('click', () => {
    const step = parseInt(btn.dataset.step, 10);
    goToStep(step - 1);
  });
});


// ── Step helpers ──

function collectStep(step) {
  if (step === 0) {
    const selected = [...document.querySelectorAll('#chips-sells .sel')]
      .map(c => c.dataset.val).join(', ');
    const other = document.getElementById('sells-other').value.trim();
    formData.what_sells = [selected, other].filter(Boolean).join(' — ');
  }

  if (step === 1) {
    const selected = [...document.querySelectorAll('#chips-pain .sel')]
      .map(c => c.dataset.val).join(', ');
    const extra = document.getElementById('pain-extra').value.trim();
    formData.difficulties = [selected, extra].filter(Boolean).join(' / ');
  }

  if (step === 2) {
    const selected = [...document.querySelectorAll('#chips-auto .sel')]
      .map(c => c.dataset.val).join(', ');
    const extra = document.getElementById('auto-extra').value.trim();
    formData.automate = [selected, extra].filter(Boolean).join(' / ');
  }

  if (step === 3) {
    formData.contact = document.getElementById('msf-contact').value.trim();
  }
}

function goToStep(n) {
  document.querySelectorAll('.msf-step').forEach((el, i) => {
    el.classList.toggle('active', i === n);
  });
  document.querySelectorAll('.msf-dot').forEach((dot, i) => {
    dot.classList.toggle('done', i <= n);
  });
}


// ── Submit ──

async function submitForm() {
  const contactInput = document.getElementById('msf-contact');
  const contact = contactInput.value.trim();

  // Validate contact
  if (!contact) {
    contactInput.classList.add('error');
    contactInput.placeholder = 'Entre ton numéro WhatsApp 👆';
    setTimeout(() => {
      contactInput.classList.remove('error');
      contactInput.placeholder = 'Ton numéro (+229…)';
    }, 1800);
    return;
  }

  formData.contact = contact;

  // Loading state
  const submitBtn = document.getElementById('msf-submit-btn');
  const originalLabel = submitBtn.innerHTML;
  submitBtn.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="white" stroke-width="2.5"
      style="animation:spin 0.8s linear infinite">
      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
    </svg>`;
  submitBtn.disabled = true;

  // Send to Google Sheets
  try {
    await fetch(WEBHOOK_URL, {
      method:  'POST',
      mode:    'no-cors',   // Apps Script doesn't return CORS headers
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(formData),
    });
  } catch (err) {
    // Network failure — save locally so entry isn't lost
    console.warn('[Sanù] Webhook unavailable, saving locally:', err);
    saveFallback(formData);
  }

  // Show success regardless (UX first)
  showSuccess();

  submitBtn.innerHTML = originalLabel;
  submitBtn.disabled  = false;
}

function showSuccess() {
  document.getElementById('msf-progress').style.display = 'none';
  document.querySelectorAll('.msf-step').forEach(el => el.style.display = 'none');
  document.getElementById('msf-success').hidden = false;
}

function saveFallback(data) {
  try {
    const pending = JSON.parse(sessionStorage.getItem('sanu_pending') || '[]');
    pending.push({ ...data, ts: new Date().toISOString() });
    sessionStorage.setItem('sanu_pending', JSON.stringify(pending));
  } catch (_) {}
}
