/**
 * dsh-ds-peak-tint — browser half.
 *
 * DeepSeek 系模型名按峰谷时段着色：
 *   - 峰（peak）：北京时间 周一至周五 09:00-12:00、14:00-18:00 → 浅红 #ff9d9d
 *   - 谷（off-peak）：其余（含周末全天）→ 浅绿 #9dffb0
 *
 * 目标元素：
 *   1. composer 模型选择触发按钮（aria-haspopup="menu"）内的模型名 span（首个 span）。
 *   2. 模型选择菜单里 role="menuitemradio" 的模型项（title 属性 = 模型显示名）。
 *
 * 匹配规则：模型名/aria-label/title 含 "deepseek"（不区分大小写），无论供应商。
 * 不修改模型名文本，只改颜色；当模型名变化或时段切换时自动更新。
 */
(function () {
  "use strict";

  var PEAK_RED = "#ff9d9d";
  var OFFPEAK_GREEN = "#9dffb0";
  var CHECK_MS = 60 * 1000; // 每分钟重判一次，覆盖峰谷边界

  function isPeak(date) {
    // 北京时间 = UTC+8
    var bj = new Date(date.getTime() + 8 * 3600 * 1000);
    var dow = bj.getUTCDay(); // 0=周日, 1-5=周一至周五, 6=周六
    var h = bj.getUTCHours();
    var weekday = dow >= 1 && dow <= 5;
    var peakHour = (h >= 9 && h < 12) || (h >= 14 && h < 18);
    return weekday && peakHour;
  }

  function isDeepseek(text) {
    return typeof text === "string" && /deepseek/i.test(text);
  }

  function currentColor() {
    return isPeak(new Date()) ? PEAK_RED : OFFPEAK_GREEN;
  }

  /** 模型名 span：菜单项内层级最深、文本非空的 span。 */
  function nameSpanOf(button) {
    var spans = button.querySelectorAll("span");
    var best = null;
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      var txt = s.textContent || "";
      if (txt.trim().length === 0) continue;
      if (best === null || s.contains(best)) best = s;
    }
    return best;
  }

  function applyTo(button, check, color) {
    var target;
    if (check(button)) {
      target = nameSpanOf(button) || button;
      target.style.color = color;
      target.style.transition = "color 0.4s ease";
    } else {
      target = nameSpanOf(button) || button;
      target.style.color = "";
      target.style.transition = "";
    }
  }

  function paint() {
    var color = currentColor();
    try {
      // 1. composer 触发按钮（aria-haspopup="menu"）：chk 看 aria-label / title / 文本
      var triggers = document.querySelectorAll('button[aria-haspopup="menu"]');
      for (var i = 0; i < triggers.length; i++) {
        (function (btn) {
          applyTo(
            btn,
            function (b) {
              return (
                isDeepseek(b.getAttribute("aria-label")) ||
                isDeepseek(b.getAttribute("title")) ||
                isDeepseek(b.textContent)
              );
            },
            color
          );
        })(triggers[i]);
      }
      // 2. 菜单模型项：role="menuitemradio" 且 title 是模型名
      var items = document.querySelectorAll('button[role="menuitemradio"]');
      for (var j = 0; j < items.length; j++) {
        (function (btn) {
          applyTo(
            btn,
            function (b) {
              return isDeepseek(b.getAttribute("title"));
            },
            color
          );
        })(items[j]);
      }
    } catch (e) {
      /* DOM 快照竞态——忽略，下轮再试 */
    }
  }

  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setInterval(paint, CHECK_MS);
  }

  // 页面加载完成后尽快着色（触发按钮可能在 React 渲染后才出现）
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      paint();
      schedule();
    });
  } else {
    paint();
    schedule();
  }

  // React 重渲染：观察整个 document 的子树变更，防抖后着色
  var debounce = null;
  try {
    var mo = new MutationObserver(function () {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(paint, 120);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {
    /* 不支持 MutationObserver 时退化为定时器 */
  }
})();