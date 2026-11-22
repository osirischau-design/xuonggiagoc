/* Xưởng Giá Gốc – tương tác nhẹ: menu mobile, gallery, danh sách báo giá */
(function () {
  "use strict";
  var ROOT = (document.currentScript && document.currentScript.src || "").replace(/assets\/main\.js.*$/, "");
  var KEY = "xgg-quote-v1";

  // ---------- lưu trữ an toàn ----------
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
  }
  function save(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
    updateCount(list);
  }
  function updateCount(list) {
    list = list || load();
    document.querySelectorAll("[data-quote-count]").forEach(function (el) {
      el.textContent = list.length;
      el.hidden = list.length === 0;
    });
  }

  // ---------- toast ----------
  var toastTimer;
  function toast(html) {
    var t = document.querySelector(".toast");
    if (!t) return;
    t.innerHTML = html;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 4000);
  }

  // ---------- menu mobile ----------
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
      document.body.style.overflow = open ? "hidden" : "";
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) toggle.click();
    });
  }

  // ---------- gallery ----------
  var gallery = document.querySelector("[data-gallery]");
  if (gallery) {
    var main = gallery.querySelector(".gallery-img");
    gallery.querySelectorAll(".gallery-thumbs button").forEach(function (b) {
      b.addEventListener("click", function () {
        main.removeAttribute("srcset");
        main.src = b.dataset.src;
        main.width = +b.dataset.w; main.height = +b.dataset.h;
        main.alt = b.dataset.alt;
        gallery.querySelectorAll(".gallery-thumbs button").forEach(function (x) { x.removeAttribute("aria-current"); });
        b.setAttribute("aria-current", "true");
      });
    });
    var lb = document.querySelector("[data-lightbox]");
    var zoom = gallery.querySelector("[data-zoom]");
    if (lb && zoom && typeof lb.showModal === "function") {
      zoom.addEventListener("click", function () {
        var img = lb.querySelector("img");
        img.src = main.currentSrc.replace("-sm.webp", ".webp");
        img.alt = main.alt;
        lb.showModal();
      });
      lb.addEventListener("click", function (e) { if (e.target === lb || e.target.closest("[data-close]")) lb.close(); });
    }
  }

  // ---------- thêm vào báo giá ----------
  document.querySelectorAll("[data-add-quote]").forEach(function (btn) {
    var slug = btn.dataset.slug;
    var label = btn.querySelector("span");
    function mark() {
      var inList = load().some(function (x) { return x.slug === slug; });
      btn.classList.toggle("is-added", inList);
      if (label) label.textContent = inList ? "Đã thêm – xem yêu cầu báo giá" : "Thêm vào yêu cầu báo giá";
      return inList;
    }
    mark();
    btn.addEventListener("click", function () {
      if (mark()) { location.href = ROOT + "bao-gia/"; return; }
      var list = load();
      list.push({ slug: slug, name: btn.dataset.name, url: btn.dataset.url, img: btn.dataset.img, qty: "" });
      save(list);
      mark();
      toast("Đã thêm “" + escapeHtml(btn.dataset.name) + "” <a href=\"" + ROOT + "bao-gia/\">Xem yêu cầu báo giá</a>");
    });
  });

  // ---------- trang báo giá ----------
  var form = document.querySelector("[data-quote-form]");
  if (form) {
    var listEl = form.querySelector("[data-quote-list]");
    var empty = form.querySelector("[data-quote-empty]");
    var addInput = form.querySelector("#q-add");

    function render() {
      var list = load();
      listEl.querySelectorAll(".quote-item").forEach(function (n) { n.remove(); });
      empty.hidden = list.length > 0;
      list.forEach(function (item, idx) {
        var row = document.createElement("div");
        row.className = "quote-item";
        var thumb = item.img ? "<img src=\"" + ROOT + item.img + "\" alt=\"\" width=\"56\" height=\"56\">" : "<span></span>";
        var name = item.url ? "<a class=\"qi-name\" href=\"" + ROOT + item.url + "\">" + escapeHtml(item.name) + "</a>" : "<span class=\"qi-name\">" + escapeHtml(item.name) + "</span>";
        row.innerHTML = thumb + name +
          "<label class=\"qi-qty sr-label\"><span class=\"sr-only\">Số lượng " + escapeHtml(item.name) + "</span><input inputmode=\"numeric\" placeholder=\"Số lượng\" value=\"" + escapeHtml(item.qty || "") + "\"></label>" +
          "<button type=\"button\" class=\"qi-remove\" aria-label=\"Xóa " + escapeHtml(item.name) + "\"><svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M6 6l12 12M18 6 6 18\"/></svg></button>";
        row.querySelector("label").style.margin = "0";
        row.querySelector("input").addEventListener("input", function (e) {
          var l = load(); if (l[idx]) { l[idx].qty = e.target.value; save(l); }
        });
        row.querySelector(".qi-remove").addEventListener("click", function () {
          var l = load(); l.splice(idx, 1); save(l); render();
        });
        listEl.appendChild(row);
      });
    }
    render();

    function addFree() {
      var v = (addInput.value || "").trim();
      if (!v) return;
      var list = load();
      if (!list.some(function (x) { return x.name.toLowerCase() === v.toLowerCase(); })) {
        list.push({ slug: "", name: v, url: "", img: "", qty: "" });
        save(list);
      }
      addInput.value = "";
      render();
    }
    form.querySelector("[data-quote-add]").addEventListener("click", addFree);
    addInput.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addFree(); } });

    var sendMode = "mail";
    form.querySelectorAll("[data-send]").forEach(function (b) {
      b.addEventListener("click", function () { sendMode = b.dataset.send; });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var err = form.querySelector("[data-form-error]");
      var ten = form.elements.ten, sdt = form.elements.sdt;
      var ok = true;
      [ten, sdt].forEach(function (f) {
        var valid = f.value.trim() && f.checkValidity();
        f.setAttribute("aria-invalid", valid ? "false" : "true");
        if (!valid) ok = false;
      });
      err.hidden = ok;
      if (!ok) { (ten.value.trim() ? sdt : ten).focus(); return; }

      var cfg = window.XGG || {};
      var f = form.elements;
      var lines = ["YÊU CẦU BÁO GIÁ – XƯỞNG GIÁ GỐC", ""];
      var list = load();
      if (list.length) {
        lines.push("Sản phẩm:");
        list.forEach(function (x, i) { lines.push((i + 1) + ". " + x.name + (x.qty ? " – SL: " + x.qty : "")); });
        lines.push("");
      }
      [["Dịp tặng", f.dip.value], ["Ngày cần hàng", f.ngay.value], ["Ngân sách / phần", f.ngansach.value], ["Tổng số phần", f.tongso.value], ["Ghi chú", f.ghichu.value]]
        .forEach(function (p) { if (p[1] && p[1].trim()) lines.push(p[0] + ": " + p[1].trim()); });
      lines.push("", "Người liên hệ: " + f.ten.value.trim());
      if (f.congty.value.trim()) lines.push("Công ty: " + f.congty.value.trim());
      lines.push("Điện thoại: " + f.sdt.value.trim());
      if (f.email.value.trim()) lines.push("Email: " + f.email.value.trim());
      var text = lines.join("\n");

      if (sendMode === "zalo") {
        var open = function () { window.open(cfg.zalo, "_blank", "noopener"); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            toast("Đã sao chép nội dung – dán vào Zalo để gửi Xưởng nhé.");
            open();
          }, open);
        } else { open(); }
      } else {
        var subject = "Yêu cầu báo giá – " + (f.congty.value.trim() || f.ten.value.trim());
        location.href = "mailto:" + cfg.email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(text);
      }
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]; });
  }

  updateCount();
})();
