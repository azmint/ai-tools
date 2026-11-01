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

## 必要なもの

Claude Code v2.1.239 で動作を確認した。`CLAUDE_CODE_PLUGIN_DIRS` での読み込みは v2.1.280 以上が必要（公式ドキュメントによる。未確認）。

## 読み込み方

### marketplace からインストールする（常に使う）

このリポジトリは marketplace `azmint-ai-tools` を兼ねている。marketplace を一度追加し、そこからインストールする。

Claude Code のセッション内で:

```text
/plugin marketplace add azmint/ai-tools
/plugin install 6pg-practices@azmint-ai-tools
```

`/plugin install` はすぐにはインストールせず、プラグインの詳細画面を開く。そこでスコープ（自分の全プロジェクト / このリポジトリの全員 / このリポジトリの自分だけ）を選ぶ。

シェルから:

```bash
claude plugin marketplace add azmint/ai-tools
claude plugin install 6pg-practices@azmint-ai-tools
```

シェルの `claude plugin install` は既定でユーザースコープに入る。`--scope project` か `--scope local` で変えられる。開いているセッションには `/reload-plugins` で反映する。

version を固定していないので、main への変更がそのまま更新として届く（コミットが変わると新しい版として扱われる）。自動更新を有効にしていなければ、`/plugin marketplace update azmint-ai-tools` か `claude plugin update 6pg-practices@azmint-ai-tools` で取り込む。

### 1 セッションだけ試す

```bash
claude --plugin-dir /path/to/ai-tools/plugins/6pg-practices
```

`--plugin-dir` を付けられない起動方法では、環境変数 `CLAUDE_CODE_PLUGIN_DIRS` に絶対パスを入れても同じように読み込まれる（v2.1.280 以上。プロジェクト・ローカルの settings の `env` では設定できない）。

### リポジトリに同梱する

`plugins/6pg-practices` を、使いたいリポジトリの `.claude/skills/6pg-practices/` にコピーする（`.claude-plugin/plugin.json` ごと）。そのリポジトリのルートで起動し、ワークスペースの信頼ダイアログを承認したセッションで読み込まれる。管理者が skills-directory のプラグインを止めている環境（managed settings の `strictKnownMarketplaces` に `skills-dir` がない、または `strictPluginOnlyCustomization` を設定している）では読み込まれない。

## 検証

```bash
claude plugin validate plugins/6pg-practices
claude plugin validate .   # marketplace（リポジトリのルートで）
```

version を固定しない方針のため、version 未指定の warning が 1 件出る（`--strict` では失敗扱いになる）。
