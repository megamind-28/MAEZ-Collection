/**
 * MAEZ Collection — Main JavaScript
 *
 * Features:
 *  • Sticky/transparent navigation with mobile hamburger menu
 *  • Photo gallery carousel for each property card
 *  • Availability calendar with date-range selection
 *  • Real-time price breakdown
 *  • Booking tab switching
 *  • Payment modal
 *  • Square Web Payments SDK integration
 *  • FAQ accordion
 *  • Contact form feedback
 *
 * ──────────────────────────────────────────────────────────────
 * SQUARE SETUP (required before going live):
 *   1. Replace SQUARE_APP_ID with your Square Application ID
 *   2. Replace SQUARE_LOCATION_ID with your Square Location ID
 *   3. Change the Square SDK script tag in index.html from
 *      sandbox.web.squarecdn.com to web.squarecdn.com
 * ──────────────────────────────────────────────────────────────
 */

/* ── Square Credentials ────────────────────────────────────── */
const SQUARE_APP_ID      = 'sandbox-sq0idb-REPLACE_WITH_YOUR_APP_ID';
const SQUARE_LOCATION_ID = 'REPLACE_WITH_YOUR_LOCATION_ID';

/* ── Property Data ─────────────────────────────────────────── */
const PROPERTIES = {
  1: {
    name:         'The Luxe Suite',
    meta:         '📍 Downtown · 2 BR · Sleeps 4',
    nightly:      189,
    cleaning:     75,
    taxRate:      0.14,
    maxGuests:    4,
    // Simulate booked dates: array of 'YYYY-MM-DD' strings
    bookedDates:  generateBookedDates([
      { start: offsetDate(5),  end: offsetDate(9)  },
      { start: offsetDate(14), end: offsetDate(17) },
      { start: offsetDate(22), end: offsetDate(25) },
    ]),
  },
  2: {
    name:         'The Urban Oasis',
    meta:         '📍 Midtown · 1 BR · Sleeps 2',
    nightly:      129,
    cleaning:     60,
    taxRate:      0.14,
    maxGuests:    2,
    bookedDates:  generateBookedDates([
      { start: offsetDate(3),  end: offsetDate(6)  },
      { start: offsetDate(18), end: offsetDate(21) },
    ]),
  },
  3: {
    name:         'The Grand Retreat',
    meta:         '📍 Uptown · 3 BR · Sleeps 6',
    nightly:      289,
    cleaning:     100,
    taxRate:      0.14,
    maxGuests:    6,
    bookedDates:  generateBookedDates([
      { start: offsetDate(7),  end: offsetDate(12) },
      { start: offsetDate(20), end: offsetDate(24) },
    ]),
  },
};

/* ── App State ─────────────────────────────────────────────── */
const state = {
  activeProp:  1,
  checkIn:     null,   // Date object
  checkOut:    null,   // Date object
  guests:      2,
  calMonth:    new Date(),   // First day of currently displayed month
  squareCard:  null,
  squareInited: false,
};

/* ── DOM Ready ─────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initGalleries();
  initBookingTabs();
  renderCalendar();
  initDateInputs();
  initGuestStepper();
  initFAQ();
  initContactForm();
  initSquarePayment();
  updateBookingSummary();
});

/* =============================================================
   NAVIGATION
============================================================= */
function initNav() {
  const header    = document.getElementById('header');
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  // Sticky header on scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Hamburger toggle
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
  });

  // Close mobile menu on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76);
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  });
}

/* =============================================================
   GALLERY CAROUSEL
============================================================= */
function initGalleries() {
  document.querySelectorAll('.prop-gallery').forEach(gallery => {
    const track  = gallery.querySelector('.gallery-track');
    const slides = gallery.querySelectorAll('.gallery-slide');
    const prev   = gallery.querySelector('.gallery-btn.prev');
    const next   = gallery.querySelector('.gallery-btn.next');
    const dotsEl = gallery.querySelector('.gallery-dots');

    let current = 0;
    const total = slides.length;

    // Build dots
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Photo ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsEl.appendChild(dot);
    });

    function goTo(idx) {
      current = (idx + total) % total;
      track.style.transform = `translateX(-${current * 100}%)`;
      dotsEl.querySelectorAll('.gallery-dot').forEach((d, i) =>
        d.classList.toggle('active', i === current)
      );
    }

    prev.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));

    // Touch/swipe support
    let touchStartX = 0;
    gallery.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
    gallery.addEventListener('touchend',   e => {
      const delta = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(delta) > 40) goTo(current + (delta > 0 ? 1 : -1));
    });
  });
}

/* =============================================================
   BOOKING TABS
============================================================= */
function initBookingTabs() {
  document.querySelectorAll('.booking-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.booking-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      state.activeProp = parseInt(tab.dataset.prop, 10);
      state.checkIn  = null;
      state.checkOut = null;
      state.calMonth = new Date();
      state.calMonth.setDate(1);

      renderCalendar();
      updateBookingSummary();
      syncDateInputs();
    });
  });
}

/* Scroll to booking section and activate a property tab */
function scrollToBooking(propId) {
  state.activeProp = propId;
  document.querySelectorAll('.booking-tab').forEach(t => {
    const active = parseInt(t.dataset.prop, 10) === propId;
    t.classList.toggle('active', active);
    t.setAttribute('aria-selected', active.toString());
  });
  state.checkIn  = null;
  state.checkOut = null;
  state.calMonth = new Date();
  state.calMonth.setDate(1);
  renderCalendar();
  updateBookingSummary();

  const section = document.getElementById('booking');
  if (section) {
    const offset = section.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

/* =============================================================
   AVAILABILITY CALENDAR
============================================================= */
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const title = document.getElementById('calTitle');
  if (!grid || !title) return;

  const prop      = PROPERTIES[state.activeProp];
  const booked    = new Set(prop.bookedDates);
  const today     = toDateStr(new Date());
  const year      = state.calMonth.getFullYear();
  const month     = state.calMonth.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMo  = new Date(year, month + 1, 0).getDate();

  title.textContent = `${MONTHS[month]} ${year}`;
  grid.innerHTML    = '';

  // Day-name headers
  DAYS.forEach(d => {
    const el = document.createElement('div');
    el.className  = 'cal-day-name';
    el.textContent = d;
    grid.appendChild(el);
  });

  // Empty leading cells
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  // Date cells
  for (let d = 1; d <= daysInMo; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const el      = document.createElement('button');
    el.textContent = d;
    el.dataset.date = dateStr;

    const isToday   = dateStr === today;
    const isPast    = dateStr < today;
    const isBooked  = booked.has(dateStr);
    const isCheckIn = state.checkIn  && toDateStr(state.checkIn)  === dateStr;
    const isCheckOut= state.checkOut && toDateStr(state.checkOut) === dateStr;
    const inRange   = state.checkIn && state.checkOut &&
                      dateStr > toDateStr(state.checkIn) &&
                      dateStr < toDateStr(state.checkOut);

    let cls = 'cal-day';
    if (isPast)       cls += ' past';
    else if (isBooked) cls += ' booked';
    else if (isCheckIn)  cls += ' check-in available';
    else if (isCheckOut) cls += ' check-out available';
    else if (inRange)    cls += ' in-range available';
    else                 cls += ' available';
    if (isToday) cls += ' today';

    el.className = cls;
    el.setAttribute('aria-label', dateStr);

    if (!isPast && !isBooked) {
      el.addEventListener('click', () => handleDateClick(dateStr));
    }
    grid.appendChild(el);
  }

  // Prev/Next nav
  document.getElementById('calPrev').onclick = () => {
    state.calMonth.setMonth(state.calMonth.getMonth() - 1);
    renderCalendar();
  };
  document.getElementById('calNext').onclick = () => {
    state.calMonth.setMonth(state.calMonth.getMonth() + 1);
    renderCalendar();
  };
}

function handleDateClick(dateStr) {
  const prop   = PROPERTIES[state.activeProp];
  const booked = new Set(prop.bookedDates);

  if (!state.checkIn || (state.checkIn && state.checkOut)) {
    // Start new selection
    state.checkIn  = new Date(dateStr + 'T12:00:00');
    state.checkOut = null;
  } else {
    // Second click — set check-out
    const ci = toDateStr(state.checkIn);
    if (dateStr <= ci) {
      state.checkIn  = new Date(dateStr + 'T12:00:00');
      state.checkOut = null;
    } else {
      // Verify no booked dates in range
      const rangeOk = !rangeHasBooked(ci, dateStr, booked);
      if (rangeOk) {
        state.checkOut = new Date(dateStr + 'T12:00:00');
        syncDateInputs();
        updateBookingSummary();
      } else {
        alert('One or more dates in your selected range are already booked. Please choose different dates.');
        state.checkIn  = null;
        state.checkOut = null;
      }
    }
  }
  renderCalendar();
}

/* =============================================================
   DATE INPUTS (manual entry synced to calendar)
============================================================= */
function initDateInputs() {
  const ciEl = document.getElementById('checkIn');
  const coEl = document.getElementById('checkOut');
  if (!ciEl || !coEl) return;

  const today = toDateStr(new Date());
  ciEl.min = today;
  coEl.min = today;

  ciEl.addEventListener('change', () => {
    if (ciEl.value) {
      state.checkIn = new Date(ciEl.value + 'T12:00:00');
      coEl.min = ciEl.value;
      state.calMonth = new Date(ciEl.value);
      state.calMonth.setDate(1);
    } else {
      state.checkIn = null;
    }
    renderCalendar();
    updateBookingSummary();
  });

  coEl.addEventListener('change', () => {
    if (coEl.value) {
      state.checkOut = new Date(coEl.value + 'T12:00:00');
    } else {
      state.checkOut = null;
    }
    renderCalendar();
    updateBookingSummary();
  });
}

function syncDateInputs() {
  const ciEl = document.getElementById('checkIn');
  const coEl = document.getElementById('checkOut');
  if (ciEl) ciEl.value = state.checkIn  ? toDateStr(state.checkIn)  : '';
  if (coEl) coEl.value = state.checkOut ? toDateStr(state.checkOut) : '';
}

/* =============================================================
   GUEST STEPPER
============================================================= */
function initGuestStepper() {
  const dec   = document.getElementById('guestDec');
  const inc   = document.getElementById('guestInc');
  const count = document.getElementById('guestCount');
  if (!dec || !inc || !count) return;

  dec.addEventListener('click', () => {
    if (state.guests > 1) {
      state.guests--;
      count.textContent = state.guests;
      updateBookingSummary();
    }
  });
  inc.addEventListener('click', () => {
    const max = PROPERTIES[state.activeProp].maxGuests;
    if (state.guests < max) {
      state.guests++;
      count.textContent = state.guests;
      updateBookingSummary();
    }
  });
}

/* =============================================================
   PRICE BREAKDOWN
============================================================= */
function updateBookingSummary() {
  const prop    = PROPERTIES[state.activeProp];
  const nameEl  = document.getElementById('sumPropName');
  const metaEl  = document.getElementById('sumPropMeta');
  if (nameEl) nameEl.textContent = prop.name;
  if (metaEl) metaEl.textContent = prop.meta;

  const breakdown = document.getElementById('priceBreakdown');
  if (!state.checkIn || !state.checkOut) {
    if (breakdown) breakdown.style.display = 'none';
    return;
  }

  const nights = Math.round((state.checkOut - state.checkIn) / 86400000);
  if (nights <= 0) {
    if (breakdown) breakdown.style.display = 'none';
    return;
  }

  const subtotal = prop.nightly * nights;
  const cleaning = prop.cleaning;
  const taxes    = Math.round((subtotal + cleaning) * prop.taxRate);
  const total    = subtotal + cleaning + taxes;

  const fmt = n => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  document.getElementById('nightlyLabel').textContent = `${fmt(prop.nightly)} × ${nights} night${nights > 1 ? 's' : ''}`;
  document.getElementById('nightlyTotal').textContent = fmt(subtotal);
  document.getElementById('cleaningFee').textContent  = fmt(cleaning);
  document.getElementById('taxFee').textContent       = fmt(taxes);
  document.getElementById('priceTotal').textContent   = fmt(total);

  if (breakdown) breakdown.style.display = 'block';

  // Store total for modal
  state.currentTotal = total;
  state.currentNights = nights;

  const payBtn = document.getElementById('payBtnAmount');
  if (payBtn) payBtn.textContent = `— ${fmt(total)}`;
}

/* =============================================================
   PAYMENT MODAL
============================================================= */
function openPaymentModal() {
  if (!state.checkIn || !state.checkOut) {
    alert('Please select your check-in and check-out dates first.');
    return;
  }

  const prop  = PROPERTIES[state.activeProp];
  const total = state.currentTotal || 0;
  const fmt   = n => `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;

  document.getElementById('modalPropName').textContent = prop.name;
  document.getElementById('mCheckIn').textContent      = formatDisplayDate(state.checkIn);
  document.getElementById('mCheckOut').textContent     = formatDisplayDate(state.checkOut);
  document.getElementById('mGuests').textContent       = state.guests;
  document.getElementById('mTotal').textContent        = fmt(total);
  document.getElementById('payBtnAmount').textContent  = `— ${fmt(total)}`;

  document.getElementById('paymentModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePaymentModal() {
  document.getElementById('paymentModal').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('paymentModal');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closePaymentModal();
    });
  }
});

// Close on Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePaymentModal();
});

/* =============================================================
   SQUARE WEB PAYMENTS SDK
============================================================= */
async function initSquarePayment() {
  // Validate Square is loaded
  if (!window.Square) {
    console.warn('Square SDK not loaded. Payment functionality will be unavailable until credentials are configured.');
    showSquarePlaceholder();
    return;
  }

  // Skip if credentials are still placeholders
  if (SQUARE_APP_ID.includes('REPLACE') || SQUARE_LOCATION_ID.includes('REPLACE')) {
    console.info('MAEZ Collection: Replace SQUARE_APP_ID and SQUARE_LOCATION_ID in js/main.js to enable live payments.');
    showSquarePlaceholder();
    return;
  }

  try {
    const payments = Square.payments(SQUARE_APP_ID, SQUARE_LOCATION_ID);
    state.squareCard = await payments.card();
    await state.squareCard.attach('#card-container');
    state.squareInited = true;

    document.getElementById('card-button').addEventListener('click', handlePayment);
  } catch (err) {
    console.error('Square initialization error:', err);
    showSquarePlaceholder();
  }
}

async function handlePayment() {
  if (!state.squareInited || !state.squareCard) {
    alert('Payment is not configured yet. Please contact the host directly to complete your booking.');
    return;
  }

  const agree = document.getElementById('agreeTerms');
  if (!agree.checked) {
    setPayStatus('Please agree to the cancellation policy and house rules.', false);
    return;
  }

  const btn = document.getElementById('card-button');
  btn.disabled    = true;
  btn.textContent = 'Processing…';
  setPayStatus('', false);

  try {
    const result = await state.squareCard.tokenize();
    if (result.status === 'OK') {
      // In production: send result.token to your backend to charge the card
      // e.g., POST /api/charge { token: result.token, amount: state.currentTotal * 100 }
      console.log('Square token (nonce):', result.token);
      setPayStatus('✅ Payment authorized! Your booking is confirmed. Check your email for details.', true);
      btn.textContent = '✅ Booking Confirmed';
    } else {
      const errMsg = result.errors ? result.errors.map(e => e.message).join(', ') : 'Payment failed.';
      setPayStatus(errMsg, false);
      btn.disabled    = false;
      btn.textContent = 'Confirm & Pay';
    }
  } catch (err) {
    setPayStatus('An unexpected error occurred. Please try again.', false);
    btn.disabled    = false;
    btn.textContent = 'Confirm & Pay';
  }
}

function setPayStatus(msg, success) {
  const el = document.getElementById('payment-status-container');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'pay-status' + (success ? ' success' : '');
}

function showSquarePlaceholder() {
  const container = document.getElementById('card-container');
  if (!container) return;
  container.innerHTML = `
    <div style="padding:1rem;background:#fff8e1;border:1px dashed #c9a84c;border-radius:8px;font-size:.85rem;color:#7a6020;text-align:center;">
      <strong>Payment Setup Required</strong><br>
      Replace <code>SQUARE_APP_ID</code> and <code>SQUARE_LOCATION_ID</code> in <code>js/main.js</code> with your Square credentials to enable online payments.
      <br><br>Until then, guests may contact you directly to complete their booking.
    </div>`;
}

/* =============================================================
   FAQ ACCORDION
============================================================= */
function initFAQ() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const answer   = btn.nextElementSibling;
      const expanded = btn.getAttribute('aria-expanded') === 'true';

      // Close all others
      document.querySelectorAll('.faq-q[aria-expanded="true"]').forEach(openBtn => {
        if (openBtn !== btn) {
          openBtn.setAttribute('aria-expanded', 'false');
          openBtn.nextElementSibling.hidden = true;
        }
      });

      btn.setAttribute('aria-expanded', (!expanded).toString());
      answer.hidden = expanded;
    });
  });
}

/* =============================================================
   CONTACT FORM
============================================================= */
function initContactForm() {
  const form    = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    // In production, POST form data to your backend / form service
    success.style.display = 'block';
    form.reset();
    setTimeout(() => { success.style.display = 'none'; }, 5000);
  });
}

/* =============================================================
   UTILITY HELPERS
============================================================= */

/** Return 'YYYY-MM-DD' string for a Date object */
function toDateStr(date) {
  return date.toISOString().split('T')[0];
}

/** Return a Date offset by N days from today */
function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Expand array of {start, end} Date ranges into a flat array of 'YYYY-MM-DD' strings */
function generateBookedDates(ranges) {
  const dates = [];
  ranges.forEach(({ start, end }) => {
    const cur = new Date(start);
    while (cur <= end) {
      dates.push(toDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
  });
  return dates;
}

/** Return true if any date in [startStr, endStr) exclusive is in the booked Set */
function rangeHasBooked(startStr, endStr, bookedSet) {
  const cur = new Date(startStr + 'T12:00:00');
  cur.setDate(cur.getDate() + 1);                  // day after check-in
  const end = new Date(endStr   + 'T12:00:00');
  while (cur < end) {
    if (bookedSet.has(toDateStr(cur))) return true;
    cur.setDate(cur.getDate() + 1);
  }
  return false;
}

/** Format a Date as "Mon DD, YYYY" */
function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
