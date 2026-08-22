/**
 * dsh-ds-peak-tint — host half.
 *
 * Registers the browser colorizer script at
 *   GET /plugins/dsh-ds-peak-tint/colorizer.js
 * and taps the index render to inject its <script> tag, so every page load
 * picks up the peak/off-peak model-name tinting.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "ds-peak-tint";
export const inject = ["webServer"];

const SCRIPT_PATH = "/plugins/dsh-ds-peak-tint/colorizer.js";
const here = dirname(fileURLToPath(import.meta.url));

export function apply(ctx) {
  let colorizer = "";
  try {
    colorizer = readFileSync(join(here, "web", "colorizer.js"), "utf8");
  } catch {
    ctx.logger?.warn?.("[ds-peak-tint] colorizer.js unreadable — browser tint disabled");
  }

  ctx.effect(() => {
    const disposeRoute = ctx.webServer.register({
      kind: "exact",
      path: SCRIPT_PATH,
      handler(_req, res) {
        res.writeHead(200, {
          "Content-Type": "text/javascript; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(colorizer);
      },
    });

    const disposeTap = ctx.webServer.tapIndex((html) => {
      if (html.includes(SCRIPT_PATH)) return html;
      const tag = `<script src="${SCRIPT_PATH}"></script>`;
      return html.includes("</body>")
        ? html.replace("</body>", `${tag}</body>`)
        : html + tag;
    });

    return () => {
      disposeRoute();
      disposeTap();
    };
  });
}