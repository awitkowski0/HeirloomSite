/* DRAFT MOCK, Heirloom Cribs & More, issue #44. Plain JS, no dependencies. */
(function () {
  "use strict";
  var FINISHES = ["Natural","Almond","Asbury Brown","Carbon","Earthtone","Ebony","Harvest","Manchester","Michaels Cherry","Sandstone"];
  // Real site photos (research/color-photo-coverage.md). index i = finish i. images/w/ holds resized WebP copies (scale only, no edits).
  var DIMS = { crib0: [1120, 1128], crib: [1120, 928], cg: [1200, 1000] };
  function cribBase(i) { return "addison_crib_" + i; }
  function raisedBase(i) { return "addison_crib_with_raised_panel_headboard_" + i; }
  function cribDims(i) { return i === 0 ? DIMS.crib0 : DIMS.crib; }
  function srcset(base) { return "images/w/" + base + "-200.webp 200w, images/w/" + base + "-400.webp 400w, images/w/" + base + "-800.webp 800w, images/" + base + ".jpg 1120w"; }
  var SET = [
    { id: "SET-01", name: "Addison Chest Dresser", base: "addison_chest_dresser_0", perFinish: false },
    { id: "SET-02", name: "Addison 7 Drawer Dresser", base: "addison_7_drawer_dresser_0", perFinish: false },
    { id: "SET-03", name: "Addison 6 Drawer Dresser", base: "addison_6_drawer_dresser_0", perFinish: false },
    { id: "SET-04", name: "Addison 3 Drawer Nightstand", base: "addison_3_drawer_nightstand_0", perFinish: false },
    { id: "SET-05", name: "Addison Crib with Raised Panel Headboard", base: raisedBase, perFinish: true }
  ];
  var GALLERY_PH = ["ANGLE-02","ANGLE-03","DETAIL-05","DETAIL-06","LIFESTYLE-09","LIFESTYLE-10","SCALE-12","STAGE-13","STAGE-14"];
  var CARD_SIZES = "(min-width: 861px) 210px, (min-width: 700px) 30vw, (min-width: 420px) 45vw, 90vw";

  var selected = 0, shown = 0;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]; }); }
  function tag(id) { return '<span class="slotid" aria-hidden="true">' + id + '</span>'; }

  // ---------- toast ----------
  var toastTimer;
  function toast(msg) {
    var t = $("toast"); t.textContent = msg || "Mock only"; t.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove("show"); }, 1600);
  }
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-mock]");
    if (!el) return;
    if (el.tagName !== "INPUT") e.preventDefault(); else el.checked = false;
    toast("Mock only");
  });

  // ---------- dev section tags (aria-hidden, dev chrome) ----------
  document.querySelectorAll(".sec[data-sec]").forEach(function (s) {
    var t = document.createElement("span");
    t.className = "slotid sectag"; t.setAttribute("aria-hidden", "true"); t.textContent = s.dataset.sec;
    s.insertBefore(t, s.firstChild);
  });

  // ---------- gallery ----------
  function buildThumbs() {
    var d = cribDims(0);
    var h = '<button type="button" class="slot real thumbbtn" id="thumbHero" aria-label="Show HERO-01 photo: Addison Crib in Natural">' +
      '<img alt="Addison Crib in Natural, thumbnail" src="images/w/' + cribBase(0) + '-200.webp" width="' + d[0] + '" height="' + d[1] + '" loading="lazy" decoding="async">' + tag("HERO-01") + '</button>';
    GALLERY_PH.forEach(function (id) {
      h += '<div class="slot ph">' + tag(id) + '<span>Real photo needed</span></div>';
    });
    $("thumbs").innerHTML = h;
    $("thumbHero").addEventListener("click", function () { $("hero").scrollIntoView({ block: "nearest" }); toast("HERO-01 is the main photo"); });
  }

  // ---------- finish picker: ARIA radiogroup, roving tabindex ----------
  var picker;
  function buildPicker() {
    var h = "";
    FINISHES.forEach(function (f, i) {
      var d = cribDims(i);
      h += '<button type="button" class="finish" role="radio" aria-checked="' + (i === 0) + '" tabindex="' + (i === 0 ? 0 : -1) + '" data-i="' + i + '">' +
           '<img src="images/w/' + cribBase(i) + '-200.webp" alt="" width="' + d[0] + '" height="' + d[1] + '" loading="lazy" decoding="async">' + esc(f) + '</button>';
    });
    picker = $("finishPicker"); picker.innerHTML = h;
    function btns() { return picker.querySelectorAll(".finish"); }
    function choose(i, focus) {
      selected = i;
      btns().forEach(function (c, k) { c.setAttribute("aria-checked", k === i); c.tabIndex = k === i ? 0 : -1; });
      if (focus) btns()[i].focus();
      render(i, false);
    }
    // click / tap: preview + select
    picker.addEventListener("click", function (e) {
      var b = e.target.closest(".finish"); if (b) choose(+b.dataset.i, false);
    });
    picker.addEventListener("keydown", function (e) {
      var b = e.target.closest(".finish"); if (!b) return;
      var i = +b.dataset.i, n = FINISHES.length, k = e.key;
      if (k === "ArrowRight" || k === "ArrowDown") i = (i + 1) % n;
      else if (k === "ArrowLeft" || k === "ArrowUp") i = (i - 1 + n) % n;
      else if (k === "Home") i = 0;
      else if (k === "End") i = n - 1;
      else if (k === " " || k === "Enter") { e.preventDefault(); choose(i, true); return; }
      else return;
      e.preventDefault(); choose(i, true);
    });
    // hover preview (mouse)
    picker.addEventListener("mouseover", function (e) {
      var b = e.target.closest(".finish"); if (!b) return;
      var i = +b.dataset.i; if (i !== shown) render(i, i !== selected);
    });
    picker.addEventListener("mouseleave", function () { render(selected, false); });
    // keyboard focus = same preview as hover
    picker.addEventListener("focusin", function (e) {
      var b = e.target.closest(".finish"); if (!b) return;
      var i = +b.dataset.i; render(i, i !== selected);
    });
    picker.addEventListener("focusout", function (e) {
      if (!picker.contains(e.relatedTarget)) render(selected, false);
    });
  }

  // ---------- finish guide (S08) ----------
  function buildGuide() {
    var h = "";
    FINISHES.forEach(function (f, i) {
      var sw = "FINISH-SW-" + f.replace(/\s+/g, ""), d = cribDims(i);
      h += '<div class="fg"><div class="slot photo"><img src="images/w/' + cribBase(i) + '-400.webp" srcset="' + srcset(cribBase(i)) + '" sizes="(min-width: 861px) 200px, (min-width: 600px) 30vw, 45vw" alt="Addison Crib in ' + esc(f) + ', front 3/4" width="' + d[0] + '" height="' + d[1] + '" loading="lazy" decoding="async"></div>' +
        '<div class="slot ph">' + tag(sw) + '<span>OTO Spectrum swatch: pending Phil, one yes/no in the Ready-for-Phil package</span></div><b>' + esc(f) + '</b></div>';
    });
    $("finishGuide").innerHTML = h;
  }

  // ---------- render selected/preview finish ----------
  function render(i, isPreview) {
    shown = i;
    var f = FINISHES[i], d = cribDims(i), base = cribBase(i);
    var hero = $("hero");
    hero.srcset = "images/w/" + base + "-400.webp 400w, images/w/" + base + "-600.webp 600w, images/w/" + base + "-800.webp 800w, images/" + base + ".jpg 1120w";
    hero.src = "images/" + base + ".jpg";
    hero.width = d[0]; hero.height = d[1];
    hero.alt = "Addison Crib in " + f + ", front 3/4";
    $("heroTag").textContent = "HERO-01 · " + f;
    $("previewFlag").hidden = !isPreview;
    if (!isPreview) { $("finishName").textContent = f; $("bbFinish").textContent = f; }
    var th = $("thumbHero");
    if (th) { th.querySelector("img").src = "images/w/" + base + "-200.webp"; th.querySelector("img").alt = "Addison Crib in " + f + ", thumbnail"; th.setAttribute("aria-label", "Show HERO-01 photo: Addison Crib in " + f); }
    $("syncBadge").textContent = (isPreview ? "Previewing: " : "Showing: ") + f;
    var h = "";
    SET.forEach(function (it) {
      var b = it.perFinish ? it.base(i) : it.base;
      var dd = it.perFinish ? DIMS.crib : DIMS.cg;
      var note = it.perFinish
        ? '<div class="match">✓ Shown in ' + esc(f) + '</div>'
        : '<div class="gap">Shown in the photographed finish. Ask us about ' + esc(f) + '.</div>';
      var alt = it.perFinish ? it.name + " in " + f + ", front 3/4" : it.name + ", photographed finish";
      h += '<article class="card"><div class="slot"><img src="images/w/' + b + '-400.webp" srcset="' + srcset(b) + '" sizes="' + CARD_SIZES + '" alt="' + esc(alt) + '" width="' + dd[0] + '" height="' + dd[1] + '" loading="lazy" decoding="async">' + tag(it.id + (it.perFinish ? " · " + esc(f) : " · gap")) + '</div>' +
        '<div class="body"><h3>' + esc(it.name) + '</h3>' + note +
        '<button type="button" class="btn" data-mock aria-label="View ' + esc(it.name) + '">View</button></div></article>';
    });
    $("setGrid").innerHTML = h;
  }

  // ---------- style + slot toggles ----------
  $("styleSwitch").addEventListener("change", function () {
    document.body.dataset.theme = this.value;
    $("themeNote").hidden = !(this.value === "fqp" || this.value === "kc");
  });
  $("slotToggle").addEventListener("click", function () {
    var on = document.body.dataset.slots !== "on";
    document.body.dataset.slots = on ? "on" : "off";
    this.textContent = "Show slot labels: " + (on ? "ON" : "OFF");
    this.setAttribute("aria-pressed", on);
  });

  // ---------- tabs ----------
  function showPage(id) {
    ["pageA","pageB"].forEach(function (p) { $(p).hidden = p !== id; });
    document.querySelectorAll(".tab").forEach(function (t) {
      var on = t.dataset.page === id; t.classList.toggle("active", on);
      if (on) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current");
    });
    var hh = id === "pageB" ? "#templateB" : "#templateA";
    if (location.hash !== hh) history.replaceState(null, "", location.pathname + location.search + hh);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll(".tab").forEach(function (t) { t.addEventListener("click", function () { showPage(t.dataset.page); }); });

  // ---------- Template B: horse (toggle buttons with aria-pressed) ----------
  var HORSE = [["Color 1 (placeholder)","#e0e0e0"],["Color 2 (placeholder)","#c4c4c4"],["Color 3 (placeholder)","#a6a6a6"],["Color 4 (placeholder)","#8a8a8a"],["Color 5 (placeholder)","#6e6e6e"]];
  var FRIENDS = ["Add-on toy 1 (placeholder)","Add-on toy 2 (placeholder)","Add-on toy 3 (placeholder)"];
  function buildHorse() {
    function sw(active) {
      return HORSE.map(function (c, i) {
        return '<button type="button" class="swatch" data-c="' + i + '" aria-pressed="' + (i === active) + '" aria-label="' + c[0] + '" title="' + c[0] + '" style="background:' + c[1] + '"></button>';
      }).join("");
    }
    function setColor(i, refocus) {
      $("horseSwatches").innerHTML = sw(i); $("horseSwatchesImg").innerHTML = sw(i);
      document.querySelectorAll(".horseColor").forEach(function (el) { el.textContent = HORSE[i][0]; });
      $("friendGrid").innerHTML = FRIENDS.map(function (name, k) {
        return '<article class="card"><div class="slot ph">' + tag("SET-0" + (k + 1)) + '<span>Real photo needed</span></div>' +
          '<div class="body"><h3>' + name + '</h3><div class="colorline">Color: <b>' + HORSE[i][0] + '</b></div>' +
          '<div class="gap">future, no toys carried yet</div></div></article>';
      }).join("");
      if (refocus) { var b = refocus.querySelector('[data-c="' + i + '"]'); if (b) b.focus(); }
    }
    document.addEventListener("click", function (e) {
      var b = e.target.closest(".swatch"); if (b) setColor(+b.dataset.c, b.parentNode);
    });
    setColor(0);
  }

  // ---------- init ----------
  buildThumbs(); buildPicker(); buildGuide(); render(0, false); buildHorse();
  if (location.hash === "#templateB") showPage("pageB");
  // test hooks for headless checks: ?finish=5 | ?hover=7 | ?focus=3 | ?page=pageB | ?theme=oto
  var q = new URLSearchParams(location.search);
  if (q.get("theme")) { $("styleSwitch").value = q.get("theme"); $("styleSwitch").dispatchEvent(new Event("change")); }
  if (q.get("finish")) { picker.querySelector('.finish[data-i="' + (+q.get("finish")) + '"]').click(); }
  if (q.get("hover")) { picker.querySelector('.finish[data-i="' + (+q.get("hover")) + '"]').dispatchEvent(new MouseEvent("mouseover", { bubbles: true })); }
  if (q.get("focus")) { picker.querySelector('.finish[data-i="' + (+q.get("focus")) + '"]').focus(); }
  if (q.get("page")) showPage(q.get("page"));
  if (q.toString()) window.scrollTo(0, 0);
})();
