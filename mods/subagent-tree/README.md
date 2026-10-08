# subagent-tree

サブエージェントを親子ツリーで枠付きペインに表示する Claude Code mod。

入力欄の上に、次のツリーを角丸の枠で囲んで表示する（ターミナルでの例）。

```
Subagents 2 running · 2 done
├─ ✅ 認証まわりを調査 Explore · 12s
└─ ⠹  実装プランを作る general-purpose · 20s
   ├─ ✅ 型定義を読む Explore · 3s
   └─ ⠹  テストを確認 Explore · 8s
```

Desktop アプリでは、罫線を SVG の線で描く。

- サブエージェントがいる間は、入力欄の上の帯に枠付きで表示する（`/subagent-tree` でペインにも開ける）
- 実行中はスピナーが回り、完了で ✅、失敗で ❌、中断で ⏹
- ユーザーが次の指示を送ると、終わったものだけのツリーは片付ける（サブエージェントの完了通知では片付けない）

## 必要なもの

Claude Code v2.1.287 以上（Desktop アプリは同梱版が v2.1.286 以上）。

## 読み込み方

次のいずれかで読み込む。

- 1 セッションだけ試す: `claude --plugin-dir /path/to/ai-tools/mods/subagent-tree`
- 自分のプロジェクトで常に使う: `mods/subagent-tree` をそのプロジェクトの `.claude/skills/subagent-tree/` にコピーする（プロジェクトの `.claude/skills/` のプラグインは、そのプロジェクトのセッションで自動で読み込まれる）
- Desktop アプリを含め全セッションで使う: `~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS`（絶対パス）を設定する

## 検証・テスト

```bash
claude plugin validate --strict mods/subagent-tree
(cd mods/subagent-tree && claude plugin test)
```
