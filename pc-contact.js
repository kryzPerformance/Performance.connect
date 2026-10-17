/* ============================================================================
   pc-contact.js — "Message the seller" (listing + part-out pages)
   ----------------------------------------------------------------------------
   The page never knows the seller's email. It sends the buyer's message to
   our contact-relay function (Supabase Edge Function), which looks up the
   seller's email on the server and emails them through SMTP2GO with
   Reply-To set to the buyer.

   Uses the contact modal markup already on the page:
     #contact-modal-overlay, #contact-form, #contact-name,
     #contact-reply-email, #contact-message, #contact-form-error,
     #contact-submit-btn, #contact-success, #contact-close-success,
     #contact-modal-close, optional #contact-modal-sub
   and a hidden honeypot input named "website".

   Usage:  PCContact.open({ kind: 'listing', id: 12 })
           PCContact.open({ kind: 'partout', id: '<uuid>', part: 'Turbo kit' })
   ========================================================================== */
window.PCContact = (function () {
  'use strict';

  var RELAY_URL = 'https://myapluhgfpnyjsfrflhd.supabase.co/functions/v1/contact-relay';
  var PUBLISHABLE_KEY = 'sb_publishable_yfHWon3pr30Z8do9QW9tSQ_wqlkzDxc';

  var ERRORS = {
    rate_limited:     'You’ve sent a few messages in a short time. Please wait a little and try again.',
    bad_email:        'Please enter a valid email address so the seller can reply.',
    name_required:    'Please add your name.',
    message_required: 'Please write a message.',
    no_email:         'This seller can’t receive email messages. Try Instagram instead.',
    not_found:        'This listing is no longer available.'
  };

  var target = null;
  function $(id) { return document.getElementById(id); }

  function open(t) {
    target = t;
    var sub = $('contact-modal-sub');
    if (sub) {
      sub.textContent = (t.part ? 'Asking about: ' + t.part + '. ' : '') +
        'Your message goes straight to the seller — their email stays private.';
    }
    $('contact-form').style.display = 'block';
    $('contact-success').style.display = 'none';
    $('contact-form-error').style.display = 'none';
    $('contact-modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    $('contact-modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function showError(msg) {
    var el = $('contact-form-error');
    el.textContent = msg;
    el.style.display = 'block';
  }

  function wire() {
    $('contact-modal-close').addEventListener('click', close);
    $('contact-modal-overlay').addEventListener('click', function (e) { if (e.target === this) close(); });
    $('contact-close-success').addEventListener('click', close);

    $('contact-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!target) return;
      var btn = $('contact-submit-btn');
      $('contact-form-error').style.display = 'none';
      btn.textContent = 'Sending...';
      btn.disabled = true;

      var hp = this.querySelector('[name="website"]');
      var body = {
        kind: target.kind,
        id: target.id,
        part: target.part || null,
        name: $('contact-name').value,
        email: $('contact-reply-email').value,
        message: $('contact-message').value,
        website: hp ? hp.value : ''
      };

      try {
        var res = await fetch(RELAY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': PUBLISHABLE_KEY },
          body: JSON.stringify(body)
        });
        var json = await res.json().catch(function () { return {}; });
        if (json.ok) {
          $('contact-form').style.display = 'none';
          $('contact-success').style.display = 'block';
          $('contact-form').reset();
        } else {
          showError(ERRORS[json.error] || 'Could not send your message. Please try again.');
        }
      } catch (err) {
        showError('Network error — please check your connection and try again.');
      }

      btn.textContent = 'Send Message';
      btn.disabled = false;
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();

  return { open: open, close: close };
})();
