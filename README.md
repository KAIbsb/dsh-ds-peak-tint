# dsh-ds-peak-tint

DeepSeek 系模型名峰谷着色插件，为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) Web UI 提供按官方峰谷时段的价格提醒：

- **峰（peak）**：UTC 01:00-04:00、06:00-10:00（= 北京时间 09:00-12:00、14:00-18:00）
  → 模型名显示 **浅红** `#ff9d9d`（贵）
- **谷（off-peak）**：其余时间 → 模型名显示 **浅绿** `#9dffb0`（便宜）

模型名/ID 含 `deepseek`（不区分大小写）即染色，**与供应商无关**；只改颜色不改文本，每分钟自动重判，跨峰谷边界自动换色。

## 安装

```sh
dsh plugin --profile web add github:KAIbsb/dsh-ds-peak-tint#v0.1.0
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