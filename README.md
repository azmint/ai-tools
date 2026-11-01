# ai-tools

AI ツール（Claude Code の mod・プラグインなど）の置き場です。

## mods

| 名前 | 説明 |
|------|------|
| [subagent-tree](mods/subagent-tree/) | サブエージェントを親子ツリーで入力欄の上に表示する。実行中はスピナー、完了は ✅ |

## plugins

| 名前 | 説明 |
|------|------|
| [6pg-practices](plugins/6pg-practices/) | 業務で使える、具体的すぎないプラクティスをまとめたスキル集（retro: ふりかえり、prioritize: 優先度付け） |

## インストール

このリポジトリは Claude Code のプラグイン marketplace（`azmint-ai-tools`）になっている。marketplace を追加してから、プラグインを `<プラグイン名>@azmint-ai-tools` でインストールする。

```bash
claude plugin marketplace add azmint/ai-tools
claude plugin install 6pg-practices@azmint-ai-tools
```

セッション内では `/plugin marketplace add azmint/ai-tools` と `/plugin install 6pg-practices@azmint-ai-tools`。mod（subagent-tree）は marketplace にまだ載せていないので、各 README の読み込み方に従う。

## ライセンス

[MIT](LICENSE)

## 注意

mod はユーザーの権限で動くコードです。自分の環境で使う前に、必ず中身を確認してください。
