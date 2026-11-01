# 6pg-practices

業務に必要で、具体的すぎないプラクティスをスキル化して集めた Claude Code プラグイン。特定のプロジェクトや道具に寄らず、どの業務にも持ち込める型だけを置く。

名前の 6pg は六本木の略。

## 収録スキル

| スキル | 呼び方 | 概要 |
|--------|--------|------|
| retro（ふりかえり） | `/6pg-practices:retro` | 期待と現実の差分（Bad と Good）を深掘りし、仕組みを変える次の行動に落とす。始まりに期待を書き残す場面（目標設定・プレモーテム）にも使う |
| prioritize（優先度付け） | `/6pg-practices:prioritize` | 問題・機会・タスクを軸ごとに高・中・低で見て判定表で絞り込み、同じ帯の中で 1 列に並べる。retro は深掘りの深さを決めるときにこのスキルの判定を使う |

スラッシュコマンドで呼ばなくても、「ふりかえりして」「優先度を付けて」などの依頼で自動的に使われる。

今後もスキルを追加していく。

## 読み込み方

次のいずれかで読み込む。

- 1 セッションだけ試す: `claude --plugin-dir /path/to/ai-tools/plugins/6pg-practices`
- 自分のプロジェクトで常に使う: `plugins/6pg-practices` をそのプロジェクトの `.claude/skills/6pg-practices/` にコピーする（プロジェクトの `.claude/skills/` のプラグインは、そのプロジェクトのセッションで自動で読み込まれる）
- Desktop アプリを含め全セッションで使う: `~/.claude/settings.json` の `env` に `CLAUDE_CODE_PLUGIN_DIRS`（絶対パス）を設定する

## 検証

```bash
claude plugin validate --strict plugins/6pg-practices
```
