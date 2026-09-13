# dsh-ds-peak-tint

DeepSeek 系模型名峰谷着色插件，为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 提供按官方峰谷时段的价格提醒：

- **峰（peak）**：北京时间 **周一至周五** 09:00-12:00、14:00-18:00
  → 模型名显示**主题错误色**（语义 token `--dsw-alias-state-error-primary`，随明暗主题自动取值）（贵）
- **谷（off-peak）**：其余时间（含**周末全天**）→ 模型名显示**主题成功色混入前景色**（语义 token `--dsw-alias-state-success-primary` 混 25% `--dsw-alias-label-primary`，亮色主题下对比度约 3.7:1；引擎不支持 `color-mix` 时回退为纯成功色）（便宜）

模型名/ID 含 `deepseek`（不区分大小写）即染色，**与供应商无关**；只改颜色不改文本，每分钟自动重判，跨峰谷边界自动换色。颜色取自主题语义 token（峰 = 错误色，谷 = 成功色），**随明暗主题自动适配**，不写死色值。

## 安装

```sh
dsh plugin --profile web add github:KAIbsb/dsh-ds-peak-tint#v0.1.2
```

若尚未安装 DSH，先执行 `npm i -g @deepseek-ai/dsh`。安装后**重启 DSH** 生效。

## 验证

```sh
dsh --profile web --dump-config
```

配置树中出现 `ds-peak-tint` 层即安装成功。重启后在模型选择器 / composer 中查看模型名颜色。

## 卸载

```sh
dsh plugin --profile web remove dsh-ds-peak-tint
```

## 说明

- 峰谷规则与 [models.dev](https://models.dev) / DeepSeek 官方 API 定价一致；具体价格以你实际使用渠道为准
- 无任何网络请求，本地纯前端逻辑

## License

MIT