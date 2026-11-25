/* Виджет «Расчёт вмятины» — вставляется на любой сайт одной строкой:
   <script src="https://ВАШ-ДОМЕН/w.js" data-id="ID" async></script>
   Необязательные атрибуты: data-color="#FF4D17", data-label="Рассчитать цену",
   data-position="right|left", data-inline="selector" (вставить блок вместо плавающей кнопки) */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var id = script.getAttribute("data-id");
  if (!id) {
    console.warn("[rovno] не указан data-id");
    return;
  }

  var origin = new URL(script.src, location.href).origin;
  var color = script.getAttribute("data-color") || "#FF4D17";
  var label = script.getAttribute("data-label") || "Рассчитать цену";
  var side = script.getAttribute("data-position") === "left" ? "left" : "right";
  var inline = script.getAttribute("data-inline");
  var url = origin + "/embed/" + encodeURIComponent(id);

  function css() {
    if (document.getElementById("rovno-widget-css")) return;
    var st = document.createElement("style");
    st.id = "rovno-widget-css";
    st.textContent =
      ".rovno-btn{position:fixed;bottom:22px;" + side + ":22px;z-index:2147483000;" +
      "display:inline-flex;align-items:center;gap:8px;padding:14px 20px;border:none;border-radius:999px;" +
      "background:" + color + ";color:#0a0a0a;font:600 15px/1 system-ui,-apple-system,'Segoe UI',sans-serif;" +
      "cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.35);transition:transform .18s ease}" +
      ".rovno-btn:hover{transform:translateY(-2px)}" +
      ".rovno-btn--inline{position:static;box-shadow:none}" +
      ".rovno-ov{position:fixed;inset:0;z-index:2147483001;background:rgba(4,6,8,.72);" +
      "display:flex;align-items:center;justify-content:center;padding:16px;backdrop-filter:blur(4px)}" +
      ".rovno-frame{width:100%;max-width:600px;height:min(760px,92vh);border:0;border-radius:18px;" +
      "background:#07080a;box-shadow:0 30px 80px rgba(0,0,0,.55)}" +
      ".rovno-x{position:absolute;top:10px;right:14px;width:34px;height:34px;border-radius:50%;" +
      "border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.5);color:#fff;font-size:18px;" +
      "line-height:1;cursor:pointer}";
    document.head.appendChild(st);
  }

  function open() {
    css();
    if (document.querySelector(".rovno-ov")) return;
    var ov = document.createElement("div");
    ov.className = "rovno-ov";
    var frame = document.createElement("iframe");
    frame.className = "rovno-frame";
    frame.src = url;
    frame.title = "Расчёт цены ремонта вмятины";
    frame.allow = "clipboard-write";
    var x = document.createElement("button");
    x.className = "rovno-x";
    x.type = "button";
    x.setAttribute("aria-label", "Закрыть");
    x.innerHTML = "&times;";
    ov.appendChild(frame);
    ov.appendChild(x);
    document.body.appendChild(ov);

    function close() {
      ov.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    x.addEventListener("click", close);
    ov.addEventListener("click", function (e) {
      if (e.target === ov) close();
    });
    document.addEventListener("keydown", onKey);
  }

  function mount() {
    css();
    var target = inline ? document.querySelector(inline) : null;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "rovno-btn" + (target ? " rovno-btn--inline" : "");
    btn.innerHTML = "🚗 " + label;
    btn.addEventListener("click", open);
    if (target) target.appendChild(btn);
    else document.body.appendChild(btn);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  window.RovnoCalc = { open: open, url: url };
})();
