/* SnowScope Web payments: Paddle Billing overlay checkout (Paddle is the merchant of record).
   Loaded by core.js only when web_config.json has paddle.client_token. Pro bought here unlocks Pro on the same
   SnowScope account on the website AND in the Android app (server: api/paddle_routes.py, engine/paddle.py).
   Flow: sign in (Firebase) -> GET /v1/billing/paddle/session (account id, country, trial eligibility) -> offers ->
   Paddle.Checkout.open({items, customer.email, customData.account_id}) -> poll /v1/me until Pro.
   Offers: Morocco -> Pro for life, the price of a coffee; elsewhere -> 3 days for 1 then yearly, yearly, monthly,
   remove ads. Never shown inside the Android app (Google Play rule: the app has no link to web purchases). */
(() => {
  "use strict";
  const SS = window.SS;
  if (!SS) return;
  const { S, esc, modal, head } = SS;
  const cfg = () => (S.cfg && S.cfg.paddle) || {};
  const lang = () => (window.I18N && I18N.lang) || "en";
  // amounts as set in Paddle (tools/paddle_catalog.py; tax included). Paddle has no MAD: Morocco pays in USD.
  const AMT = { pro_yearly: 29.99, pro_monthly: 4.99, trial: 1, noads_once: 0.99, pro_lifetime_ma: 1.09 };
  const L = {   // en -> [fr, de, it, es, ar]
    "Get SnowScope Pro": ["Passer à SnowScope Pro", "SnowScope Pro holen", "Passa a SnowScope Pro", "Consigue SnowScope Pro", "احصل على SnowScope Pro"],
    "One account for the website and the app: Pro bought here works in the Android app too, after you sign in with the same account.":
      ["Un seul compte pour le site et l'appli : Pro acheté ici marche aussi dans l'appli Android, connecté avec le même compte.",
       "Ein Konto für Website und App: Hier gekauftes Pro gilt auch in der Android-App, mit demselben Konto angemeldet.",
       "Un solo account per sito e app: Pro acquistato qui vale anche nell'app Android, con lo stesso account.",
       "Una cuenta para la web y la app: Pro comprado aquí funciona también en la app Android, con la misma cuenta.",
       "حساب واحد للموقع والتطبيق: Pro الذي تشتريه هنا يعمل أيضًا في تطبيق أندرويد عند تسجيل الدخول بنفس الحساب."],
    "Try 3 days for {p}": ["Essayez 3 jours pour {p}", "3 Tage testen für {p}", "Prova 3 giorni a {p}", "Prueba 3 días por {p}", "جرّب 3 أيام مقابل {p}"],
    "then {p} a year. Cancel anytime before the 3 days end and you pay nothing more.":
      ["puis {p} par an. Annulez avant la fin des 3 jours et vous ne payez rien de plus.",
       "danach {p} pro Jahr. Kündige vor Ende der 3 Tage und du zahlst nichts weiter.",
       "poi {p} all'anno. Annulla prima della fine dei 3 giorni e non paghi altro.",
       "después {p} al año. Cancela antes de que acaben los 3 días y no pagas nada más.",
       "ثم {p} في السنة. ألغِ قبل نهاية الأيام الثلاثة ولن تدفع شيئًا آخر."],
    "Yearly": ["Annuel", "Jährlich", "Annuale", "Anual", "سنوي"],
    "Monthly": ["Mensuel", "Monatlich", "Mensile", "Mensual", "شهري"],
    "{p} a year": ["{p} par an", "{p} pro Jahr", "{p} all'anno", "{p} al año", "{p} في السنة"],
    "{p} a month": ["{p} par mois", "{p} pro Monat", "{p} al mese", "{p} al mes", "{p} في الشهر"],
    "Remove ads": ["Supprimer les pubs", "Werbung entfernen", "Rimuovi la pubblicità", "Quitar anuncios", "إزالة الإعلانات"],
    "{p} once, no ads for good (Pro features not included)": ["{p} une fois, plus jamais de pubs (sans les fonctions Pro)", "{p} einmalig, für immer ohne Werbung (ohne Pro-Funktionen)", "{p} una volta, niente pubblicità per sempre (senza funzioni Pro)", "{p} una vez, sin anuncios para siempre (sin funciones Pro)", "{p} مرة واحدة، بلا إعلانات للأبد (دون ميزات Pro)"],
    "SnowScope Pro for life": ["SnowScope Pro à vie", "SnowScope Pro für immer", "SnowScope Pro a vita", "SnowScope Pro de por vida", "SnowScope Pro مدى الحياة"],
    "the price of a coffee": ["le prix d'un café", "der Preis eines Kaffees", "il prezzo di un caffè", "el precio de un café", "ثمن قهوة"],
    "One payment of {p} (about 10 MAD), yours forever.": ["Un seul paiement de {p} (environ 10 MAD), à vous pour toujours.", "Eine Zahlung von {p} (etwa 10 MAD), für immer.", "Un solo pagamento di {p} (circa 10 MAD), per sempre.", "Un solo pago de {p} (unos 10 MAD), para siempre.", "دفعة واحدة {p} (حوالي 10 دراهم)، لك إلى الأبد."],
    "Sign in to continue": ["Connectez-vous pour continuer", "Zum Fortfahren anmelden", "Accedi per continuare", "Inicia sesión para continuar", "سجّل الدخول للمتابعة"],
    "Secure payment by Paddle, our reseller. Prices include tax.": ["Paiement sécurisé par Paddle, notre revendeur. Taxes comprises.", "Sichere Zahlung über Paddle, unseren Händler. Inklusive Steuern.", "Pagamento sicuro con Paddle, il nostro rivenditore. Tasse incluse.", "Pago seguro con Paddle, nuestro revendedor. Impuestos incluidos.", "دفع آمن عبر Paddle، بائعنا المعتمد. الأسعار شاملة الضرائب."],
    "Refunds and cancelling": ["Remboursements et résiliation", "Erstattung und Kündigung", "Rimborsi e disdetta", "Reembolsos y cancelación", "الاسترداد والإلغاء"],
    "Payment received. Unlocking Pro…": ["Paiement reçu. Activation de Pro…", "Zahlung erhalten. Pro wird freigeschaltet…", "Pagamento ricevuto. Attivazione di Pro…", "Pago recibido. Activando Pro…", "تم استلام الدفع. جارٍ تفعيل Pro…"],
    "Payment received. Removing the ads…": ["Paiement reçu. Suppression des pubs…", "Zahlung erhalten. Werbung wird entfernt…", "Pagamento ricevuto. Rimozione della pubblicità…", "Pago recibido. Quitando los anuncios…", "تم استلام الدفع. جارٍ إزالة الإعلانات…"],
    "Done! It is on your account, here and in the app (sign in with the same account).": ["C'est fait ! C'est sur votre compte, ici et dans l'appli (même compte).", "Fertig! Es ist auf deinem Konto, hier und in der App (gleiches Konto).", "Fatto! È sul tuo account, qui e nell'app (stesso account).", "¡Listo! Está en tu cuenta, aquí y en la app (misma cuenta).", "تم! أصبح في حسابك، هنا وفي التطبيق (بنفس الحساب)."],
    "Your payment went through; it can take a few minutes to show. Reload this page in a moment.": ["Votre paiement est passé ; l'activation peut prendre quelques minutes. Rechargez la page dans un instant.", "Deine Zahlung ist durch; die Freischaltung kann ein paar Minuten dauern. Lade die Seite gleich neu.", "Il pagamento è andato a buon fine; l'attivazione può richiedere qualche minuto. Ricarica la pagina tra poco.", "Tu pago se ha realizado; la activación puede tardar unos minutos. Recarga la página en un momento.", "تمّ الدفع؛ قد يستغرق التفعيل بضع دقائق. أعد تحميل الصفحة بعد قليل."],
    "Payments are not available right now. Try again in a minute.": ["Le paiement n'est pas disponible pour le moment. Réessayez dans une minute.", "Zahlungen sind gerade nicht verfügbar. Versuche es gleich noch einmal.", "I pagamenti non sono disponibili ora. Riprova tra un minuto.", "Los pagos no están disponibles ahora. Inténtalo en un minuto.", "الدفع غير متاح الآن. حاول بعد دقيقة."],
    "You already have Pro.": ["Vous avez déjà Pro.", "Du hast schon Pro.", "Hai già Pro.", "Ya tienes Pro.", "لديك Pro بالفعل."],
    "Manage or cancel": ["Gérer ou résilier", "Verwalten oder kündigen", "Gestisci o annulla", "Gestionar o cancelar", "إدارة أو إلغاء"],
  };
  const COL = { fr: 0, de: 1, it: 2, es: 3, ar: 4 };
  const t = (s, p) => { const r = (L[s] && COL[lang()] != null ? L[s][COL[lang()]] : s) || s; return p == null ? r : r.replace("{p}", p); };

  let paddleReady = null, cur = "USD", country = null, pending = null;
  const money = (v) => { try { return new Intl.NumberFormat((window.I18N && I18N.locale) || "en-GB", { style: "currency", currency: cur }).format(v); } catch { return "$" + v; } };
  // freemium (2026-11-03): the web checkout sleeps unless web_config "web_pro_enabled": true (docs/TIERS.md)
  const enabled = () => !!(window.SS && SS.webPro && SS.webPro()) && !!(cfg().client_token && cfg().prices && cfg().prices.pro_yearly);

  function loadPaddle() {
    if (paddleReady) return paddleReady;
    paddleReady = new Promise((ok, ko) => {
      const s = document.createElement("script");
      s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      s.onload = () => {
        try {
          if (cfg().env === "sandbox") window.Paddle.Environment.set("sandbox");
          window.Paddle.Initialize({ token: cfg().client_token, eventCallback: onPaddle });
          ok(window.Paddle);
        } catch (e) { ko(e); }
      };
      s.onerror = ko;
      document.head.appendChild(s);
    });
    paddleReady.catch(() => { paddleReady = null; });
    return paddleReady;
  }

  // visitor's country + Paddle's localized, formatted prices for every price (PricePreview); our API's Cloudflare
  // country first, then Paddle's own IP location, then the time zone. Fallback text only when Paddle can't be reached.
  const PRICE = {};
  async function locate(session) {
    country = (session && session.country) || country || null;
    try {
      const P = await loadPaddle();
      const ids = Object.entries(cfg().prices || {}).filter(([, v]) => v);
      const pv = await P.PricePreview({ items: ids.map(([, id]) => ({ priceId: id, quantity: 1 })),
                                        ...(country ? { address: { countryCode: country } } : {}) });
      const d = (pv && pv.data) || {};
      if (d.currencyCode) cur = d.currencyCode;
      if (!country && d.address && d.address.countryCode) country = d.address.countryCode;
      const byId = Object.fromEntries(ids.map(([k, id]) => [id, k]));
      ((d.details || {}).lineItems || []).forEach((li) => {
        const k = byId[(li.price || {}).id];
        if (k && li.formattedTotals) PRICE[k] = li.formattedTotals.total;
      });
    } catch { /* preview blocked: fall back below */ }
    if (!country) { try { if (Intl.DateTimeFormat().resolvedOptions().timeZone === "Africa/Casablanca") country = "MA"; } catch { /* old browser */ } }
    if (country === "MA") cur = "USD";
    return { country, prices: PRICE };
  }
  const fmt = (k) => PRICE[k] || money(AMT[k === "pro_yearly_trial" ? "trial" : k]);

  async function open(key) {
    if (!enabled()) { SS.upsell(); return; }
    if (!S.user) { pending = key || "open"; SS.signInModal("in"); return; }
    let session;
    try { session = await SS.api("/v1/billing/paddle/session", { timeout: 15000 }); }
    catch (e) { msgModal(t("Payments are not available right now. Try again in a minute.")); return; }
    if (S.state === "no_account") await SS.refreshMe();         // the session call just created the shared account
    if ((session.entitlement || {}).tier === "premium") { msgModal(t("You already have Pro.")); return; }
    await locate(session);
    if (key && cfg().prices[key]) {               // pricing page: the exact price the visitor clicked
      checkout(key === "pro_yearly_trial" && !session.trial_eligible ? "pro_yearly" : key, session);
      return;
    }
    offers(session);
  }

  function offer(key, title, sub, primary) {
    return '<button class="btn ' + (primary ? "ski" : "ghost") + ' big full" style="margin-top:8px;height:auto;min-height:52px;padding:10px 14px;flex-direction:column;align-items:flex-start;text-align:start" data-pay="' + key + '">' +
      '<b style="font-size:16px">' + esc(title) + '</b><small style="font-weight:450;opacity:.85;white-space:normal">' + esc(sub) + "</small></button>";
  }
  function offers(session) {
    const ma = country === "MA" && cfg().prices.pro_lifetime_ma;
    let h = head('<span class="pro"><span class="ms f">workspace_premium</span>PRO</span> ' + esc(t("Get SnowScope Pro")));
    h += '<p style="color:var(--ink2);margin:2px 0 6px">' + esc(t("One account for the website and the app: Pro bought here works in the Android app too, after you sign in with the same account.")) + "</p>";
    if (ma) h += offer("pro_lifetime_ma", t("SnowScope Pro for life") + " · " + t("the price of a coffee"), t("One payment of {p} (about 10 MAD), yours forever.", fmt("pro_lifetime_ma")), true);
    else {
      if (session.trial_eligible && cfg().prices.pro_yearly_trial) h += offer("pro_yearly_trial", t("Try 3 days for {p}", fmt("pro_yearly_trial")), t("then {p} a year. Cancel anytime before the 3 days end and you pay nothing more.", fmt("pro_yearly")), true);
      h += offer("pro_yearly", t("Yearly"), t("{p} a year", fmt("pro_yearly")), !session.trial_eligible);
      h += offer("pro_monthly", t("Monthly"), t("{p} a month", fmt("pro_monthly")));
      if (!(session.entitlement || {}).no_ads && cfg().prices.noads_once) h += offer("noads_once", t("Remove ads"), t("{p} once, no ads for good (Pro features not included)", fmt("noads_once")));
    }
    h += '<p style="color:var(--ink2);font-size:13px;margin:12px 0 0">' + esc(t("Secure payment by Paddle, our reseller. Prices include tax.")) +
      ' <a href="' + SS.ROOT + 'refund.html">' + esc(t("Refunds and cancelling")) + "</a></p>";
    const m = modal(h);
    m.el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pay]");
      if (b) { m.close(); checkout(b.dataset.pay, session); }
    });
  }

  let bought = null;
  async function checkout(key, session) {
    const priceId = cfg().prices[key];
    if (!priceId) return;
    bought = key;
    try {
      const P = await loadPaddle();
      P.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        ...(session.email ? { customer: { email: session.email } } : {}),
        customData: { account_id: session.account_id },
        settings: { displayMode: "overlay", variant: "one-page", locale: lang(), allowLogout: false,
                    successUrl: new URL(SS.ROOT + "welcome.html?p=" + encodeURIComponent(key), location.href).href,
                    theme: matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" },
      });
    } catch { msgModal(t("Payments are not available right now. Try again in a minute.")); }
  }

  function onPaddle(ev) {
    if (!ev || ev.name !== "checkout.completed") return;
    const noads = bought === "noads_once";
    setTimeout(() => { try { window.Paddle.Checkout.close(); } catch { /* already closed */ } }, 2500);
    const m = msgModal(t(noads ? "Payment received. Removing the ads…" : "Payment received. Unlocking Pro…"));
    const t0 = Date.now();
    const tick = async () => {
      await SS.refreshMe();
      if (noads ? S.noAds : S.pro) { setText(m, t("Done! It is on your account, here and in the app (sign in with the same account).")); return; }
      if (Date.now() - t0 > 120000) { setText(m, t("Your payment went through; it can take a few minutes to show. Reload this page in a moment.")); return; }
      setTimeout(tick, 3000);
    };
    setTimeout(tick, 2000);
  }
  function msgModal(text) { return modal(head('<span class="pro"><span class="ms f">workspace_premium</span>PRO</span>') + '<p data-m style="font-size:16px;margin:8px 0 4px">' + esc(text) + "</p>"); }
  function setText(m, text) { const p = m.el.querySelector("[data-m]"); if (p) p.textContent = text; }

  // customer portal: manage the card, cancel (account page, web purchases only)
  async function manage() {
    try {
      const r = await SS.api("/v1/billing/paddle/portal", { timeout: 15000 });
      if (r && r.url) location.href = r.url;
    } catch { msgModal(t("Payments are not available right now. Try again in a minute.")); }
  }

  // reopen the offers once the visitor has signed in from the "Get Pro" button
  SS.onChange(() => { if (pending && S.user && S.state !== "checking") { const k = pending; pending = null; open(k === "open" ? undefined : k); } });
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-buy-pro]");
    if (b && enabled()) { e.preventDefault(); const x = b.closest(".scrim") && b.closest(".scrim").querySelector("[data-close]"); if (x) x.click(); open(); }
    if (e.target.closest("[data-manage-pro]")) { e.preventDefault(); manage(); }
    const bp = e.target.closest("[data-buy-price]");
    if (bp && enabled()) { e.preventDefault(); open(bp.dataset.buyPrice); }
  });

  // pricing page: Paddle's localized prices in [data-price-of], Morocco card only for visitors in Morocco
  async function pricingPage() {
    const r = await locate(null);
    document.querySelectorAll("[data-price-of]").forEach((el) => { const v = r.prices[el.dataset.priceOf]; if (v) el.textContent = v; });
    document.querySelectorAll("[data-ma-only]").forEach((el) => { el.hidden = r.country !== "MA"; });
    document.querySelectorAll("[data-not-ma]").forEach((el) => { el.hidden = r.country === "MA"; });
  }
  // Paddle links (default payment link ?_ptxn=..., update payment method) open the checkout on any page with Paddle.js
  if (/[?&]_ptxn=/.test(location.search)) loadPaddle().catch(() => {});
  if (document.body && document.body.dataset.page === "pricing" && enabled()) pricingPage();

  window.SSPay = { enabled, open, manage, t, locate };
  // pages drawn before this file loaded swap their "Get Pro in the app" link for the web checkout
  S.listeners.forEach((f) => { try { f(S); } catch (e) { console.error(e); } });
})();
