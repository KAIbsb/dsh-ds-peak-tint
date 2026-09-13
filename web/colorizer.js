/**
 * dsh-ds-peak-tint — browser half.
 *
 * DeepSeek 系模型名按峰谷时段着色：
 *   - 峰（peak）：北京时间 周一至周五 09:00-12:00、14:00-18:00 → 主题错误色 state-error-primary
 *   - 谷（off-peak）：其余（含周末全天）→ 主题成功色 state-success-primary
 *     （引擎支持 color-mix 时混入 25% 主题前景色以补足亮色主题的对比度，不支持则回退纯 token）
 *
 * 目标元素：
 *   1. composer 模型选择触发按钮（aria-haspopup="menu"）内的模型名 span。
 *   2. 模型选择菜单里 role="menuitemradio" 的模型项（title 属性 = 模型显示名）。
 *
 * 匹配规则：模型名/aria-label/title 含 "deepseek"（不区分大小写），无论供应商。
 * 不修改模型名文本，只改颜色；当模型名变化或时段切换时自动更新。
 *
 * 刷新策略：MutationObserver 只对涉及目标按钮的变更做防抖重绘（定向刷新），
 * 其余 DOM 变化（聊天流式输出等）一律忽略；峰谷边界由 60s 定时器兜底。
 */
(function () {
  "use strict";

  // 颜色只用主题语义 token（明暗主题各取对应值，不写死色值）
  var PEAK_RED = "var(--dsw-alias-state-error-primary)";
  var OFFPEAK_GREEN = "var(--dsw-alias-state-success-primary)";
  // 谷色增强：success 纯色在亮色主题下对白底仅约 2.28:1，混入 25% 前景色后约 3.7:1
  // （暗色主题下 label-primary 近白，混色反而更亮，两套主题都提升对比度）。
  // 仅在引擎支持 color-mix 时启用；不支持则保留上面的纯 token 值，绝不退化成不上色。
  var OFFPEAK_GREEN_MIX =
    "color-mix(in srgb, var(--dsw-alias-state-success-primary) 75%," +
    " var(--dsw-alias-label-primary))";
  var colorMixSupported = null; // 惰性探测：null = 尚未判定
  var CHECK_MS = 60 * 1000; // 每分钟重判一次，覆盖峰谷边界
  var TARGET_SELECTOR =
    'button[aria-haspopup="menu"], button[role="menuitemradio"]';

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

  /**
   * 谷色：引擎支持 color-mix 时用混色增强对比度，否则回退纯 token。
   * 探测必须用**字面量**色值——带 var() 的声明在解析期恒被判为合法，
   * 用它探测会让不支持 color-mix 的引擎误判为支持。
   */
  function offpeakColor() {
    if (colorMixSupported === null) {
      try {
        colorMixSupported =
          typeof CSS !== "undefined" &&
          typeof CSS.supports === "function" &&
          CSS.supports("color", "color-mix(in srgb, red, blue)");
      } catch (e) {
        colorMixSupported = false;
      }
    }
    return colorMixSupported ? OFFPEAK_GREEN_MIX : OFFPEAK_GREEN;
  }

  function currentColor() {
    return isPeak(new Date()) ? PEAK_RED : offpeakColor();
  }

  /** 模型名 span：目标按钮内层级最深、文本非空的 span。 */
  function nameSpanOf(button) {
    var spans = button.querySelectorAll("span");
    var best = null;
    for (var i = 0; i < spans.length; i++) {
      var s = spans[i];
      var txt = s.textContent || "";
      if (txt.trim().length === 0) continue;
      if (best === null || best.contains(s)) best = s;
    }
    return best;
  }

  function applyTo(button, check, color) {
    var target = nameSpanOf(button) || button;
    if (check(button)) {
      target.style.color = color;
      target.style.transition = "color 0.18s ease";
    } else {
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

  /** 节点本身或其子树中是否含目标按钮。 */
  function containsTarget(node) {
    if (node.nodeType !== 1) return false;
    return node.matches(TARGET_SELECTOR) || node.querySelector(TARGET_SELECTOR) !== null;
  }

  /** 定向判断：该变更是否涉及目标按钮（触发按钮 / 菜单项）。 */
  function isRelevant(record) {
    if (record.type === "attributes") {
      return record.target.matches && record.target.matches(TARGET_SELECTOR);
    }
    if (record.type === "characterData") {
      return (
        record.target.parentElement &&
        record.target.parentElement.closest(TARGET_SELECTOR) !== null
      );
    }
    // childList：新增或移除的节点里出现目标按钮才算相关
    for (var i = 0; i < record.addedNodes.length; i++) {
      if (containsTarget(record.addedNodes[i])) return true;
    }
    for (var j = 0; j < record.removedNodes.length; j++) {
      if (containsTarget(record.removedNodes[j])) return true;
    }
    return false;
  }

  var debounce = null;
  function schedulePaint() {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(paint, 120);
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

  // React 重渲染：只对涉及目标按钮的变更做防抖重绘（定向刷新）
  try {
    var mo = new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        if (isRelevant(records[i])) {
          schedulePaint();
          return;
        }
      }
    });
    mo.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["title", "aria-label"]
    });
  } catch (e) {
    /* 不支持 MutationObserver 时退化为定时器 */
  }
})();
