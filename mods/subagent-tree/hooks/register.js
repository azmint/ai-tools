// サブエージェントを親子ツリーで表示する。
// サブエージェントがいる間は入力欄の上の帯に枠付きで出し、/subagent-tree でペインにも開ける。
// 実行中はスピナーが回り、終わると ✅ に変わる。

import { atom, read, update } from 'claude-code'

const PANE = 'subagent-tree'
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const TICK_MS = 100
// 罫線 1 段とアイコンの表示幅 (セル数)
const GUIDE_WIDTH = 3
const ICON_WIDTH = 3
// $.agent.list() で状態を突き合わせる間隔 (tick 数)
const SYNC_EVERY = 5

// 記録はリロードで消えないよう $.state に置く (types/index.d.ts の AgentRecord[])
const agents = atom({ plugin: 'subagent-tree', key: 'agents' }, [])
// 片付け済みの agentId
const dismissed = atom({ plugin: 'subagent-tree', key: 'dismissed' }, [])
// ユーザー自身の入力 (ターミナル / Remote Control / Desktop などの SDK ホスト)
const USER_ORIGINS = new Set(['composer', 'bridge', 'sdk'])
// スピナーのコマ。消えても困らないのでモジュール変数
let frame = 0
let ticks = 0

// waiting は子の完了待ちで、まだ進行中
const isRunning = (a) => a.status === 'running' || a.status === 'pending' || a.status === 'waiting'

function iconOf(a) {
  if (isRunning(a)) return { text: SPINNER[frame % SPINNER.length], color: 'cyan' }
  if (a.status === 'completed' || a.status === 'idle') return { text: '✅', color: undefined }
  if (a.status === 'killed') return { text: '⏹', color: 'yellow' }
  return { text: '❌', color: 'red' }
}

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000))
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s`
}

// 1 件を追加・更新する
const upsert = ($, record) =>
  update($, agents, (list) => [...list.filter((a) => a.id !== record.id), record])

// エンジンが持つ一覧 ($.agent.list) を正として記録を更新する
async function sync($) {
  const list = await $.agent.list()
  if (list.length === 0) return
  const now = await $.clock.now()
  const skip = new Set(await read($, dismissed))
  await update($, agents, (current) => {
    const byId = new Map(current.map((a) => [a.id, a]))
    for (const info of list) {
      if (skip.has(info.id)) continue
      const prev = byId.get(info.id)
      const running = isRunning(info)
      byId.set(info.id, {
        id: info.id,
        parentId: info.parentId ?? prev?.parentId,
        description: info.description || prev?.description || info.type,
        type: info.type,
        status: info.status,
        startedAt: prev?.startedAt ?? now,
        endedAt: running ? undefined : (prev?.endedAt ?? now),
      })
    }
    return [...byId.values()]
  })
}

// 親子関係から、罫線つきの表示行を開始順に作る。
// guides は字下げ 1 段ごとの罫線 ('│' か ''、最後が '├─' か '└─')
function buildRows(list) {
  const ids = new Set(list.map((a) => a.id))
  const children = new Map()
  const roots = []
  for (const a of list) {
    if (a.parentId && ids.has(a.parentId)) {
      if (!children.has(a.parentId)) children.set(a.parentId, [])
      children.get(a.parentId).push(a)
    } else {
      roots.push(a)
    }
  }
  const byStart = (x, y) => x.startedAt - y.startedAt
  const rows = []
  const walk = (nodes, guides) => {
    nodes.sort(byStart).forEach((node, i) => {
      const isLast = i === nodes.length - 1
      rows.push({ node, guides: [...guides.map((g) => (g ? '' : '│')), isLast ? '└─' : '├─'] })
      walk(children.get(node.id) ?? [], [...guides, isLast])
    })
  }
  walk(roots, [])
  return rows
}

// Desktop 用: 1 行分の罫線を SVG で描く。行の高さいっぱいに線を引くので上下の行とつながる
const SVG_STEP = 16
const SVG_ROW_HEIGHT = 20
function guidesSvg(guides) {
  const mid = SVG_ROW_HEIGHT / 2
  const lines = guides.map((g, i) => {
    const x = i * SVG_STEP + SVG_STEP / 2
    if (g === '│') return `<line x1="${x}" y1="0" x2="${x}" y2="${SVG_ROW_HEIGHT}"/>`
    if (g === '') return ''
    // ├─ は下へ続け、└─ は中央で止める
    const bottom = g === '├─' ? SVG_ROW_HEIGHT : mid
    return `<line x1="${x}" y1="0" x2="${x}" y2="${bottom}"/><line x1="${x}" y1="${mid}" x2="${(i + 1) * SVG_STEP}" y2="${mid}"/>`
  })
  const width = guides.length * SVG_STEP
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${SVG_ROW_HEIGHT}" viewBox="0 0 ${width} ${SVG_ROW_HEIGHT}"><g stroke="#8a8a8a" stroke-opacity="0.7" stroke-width="1" fill="none">${lines.join('')}</g></svg>`
}

// 枠付きのツリー。maxRows を超える分は古い行から省く
async function drawTree($, e, list, maxRows) {
  const { Box, Text, Svg } = $.ui.resolve(e)
  const now = await $.clock.now()
  const running = list.filter(isRunning).length
  const done = list.length - running

  const header = Box({
    flexDirection: 'row',
    columnGap: 1,
    children: [
      Text({ bold: true, children: ['Subagents'] }),
      Text({ dimColor: true, children: [`${running} running · ${done} done`] }),
    ],
  })

  let rows = buildRows([...list])
  let hidden = 0
  if (maxRows !== undefined && rows.length > maxRows) {
    hidden = rows.length - maxRows
    rows = rows.slice(hidden)
  }
  const body = rows.length === 0
    ? [Text({ dimColor: true, children: ['サブエージェントはまだ起動していません'] })]
    : rows.map(({ node, guides }) => {
        const icon = iconOf(node)
        const elapsed = formatElapsed((node.endedAt ?? now) - node.startedAt)
        // Desktop は等幅フォントではないため、罫線は SVG、アイコンは幅を固定した Box に入れて縦をそろえる
        const cell = (key, width, text) =>
          Box({ key, width, flexShrink: 0, children: [Text(text)] })
        return Box({
          key: 'agent-' + node.id,
          flexDirection: 'row',
          alignItems: 'center',
          children: [
            ...(e.surface === 'desktop'
              ? [Svg({ source: guidesSvg(guides), alt: guides.join(''), width: guides.length * SVG_STEP, height: SVG_ROW_HEIGHT })]
              : guides.map((g, i) => cell(`guide-${i}`, GUIDE_WIDTH, { dimColor: true, children: [g || ' '] }))),
            cell('icon', ICON_WIDTH, icon.color ? { color: icon.color, children: [icon.text] } : { children: [icon.text] }),
            Text({ wrap: 'truncate-end', children: [node.description] }),
            Text({ dimColor: true, children: [` ${node.type} · ${elapsed}`] }),
          ],
        })
      })
  if (hidden > 0) body.unshift(Text({ dimColor: true, children: [`… ほか ${hidden} 件`] }))

  return Box({
    flexDirection: 'column',
    borderStyle: 'round',
    paddingX: 1,
    children: [header, ...body],
  })
}

export function register(on) {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'subagent-tree',
      description: 'サブエージェントのツリー表示ペインを開く',
      immediate: true,
    })
    $.clock.every(TICK_MS, async () => {
      ticks += 1
      const running = (await read($, agents)).some(isRunning)
      if (running) {
        frame += 1
        $.ui.invalidate('ui.render')
      }
      // 実行中はこまめに、待機中はゆっくり状態を突き合わせる
      if (ticks % (running ? SYNC_EVERY : SYNC_EVERY * 4) === 0) void sync($)
    })
    return next(e)
  })

  on('command.run', { command: 'subagent-tree' }, async ($) => {
    await $.ui.open({ id: PANE, title: 'Subagents' })
    await sync($)
    return {}
  })

  // サブエージェントが起動した瞬間にツリーへ追加する
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.agentId) {
      await upsert($, {
        id: result.agentId,
        parentId: e.parentAgentId,
        description: e.description || e.subagentType,
        type: e.subagentType,
        status: 'running',
        startedAt: await $.clock.now(),
      })
    }
    return result
  })

  // サブエージェントのターン終了で即座に ✅ にする (list の反映を待たない)
  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const now = await $.clock.now()
      const status = e.isAborted ? 'killed' : e.reason === 'error' ? 'failed' : 'completed'
      await update($, agents, (list) =>
        list.map((a) => (a.id === e.agentId && isRunning(a) ? { ...a, status, endedAt: now } : a)),
      )
    }
    return next(e)
  })

  // ユーザーが次の指示を送ったら、終わったものだけのツリーを片付ける。
  // サブエージェントの完了通知もターンを始めるので、turn.start ではなく入力の種類で判断する
  on('prompt.submit', async ($, e, next) => {
    if (!USER_ORIGINS.has(e.origin?.kind)) return next(e)
    const list = await read($, agents)
    const byId = new Map(list.map((a) => [a.id, a]))
    const keep = new Set()
    for (const a of list) {
      if (!isRunning(a)) continue
      // 実行中のものとその祖先は残す
      for (let cur = a; cur && !keep.has(cur.id); cur = cur.parentId ? byId.get(cur.parentId) : undefined) {
        keep.add(cur.id)
      }
    }
    const removed = list.filter((a) => !keep.has(a.id)).map((a) => a.id)
    if (removed.length > 0) {
      // 片付けたものを $.agent.list() から拾い直さないよう覚えておく
      await update($, dismissed, (ids) => [...ids, ...removed].slice(-500))
      await update($, agents, (current) => current.filter((a) => keep.has(a.id)))
    }
    return next(e)
  })

  // 入力欄の上の帯: サブエージェントがいる間だけ表示する
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const list = await read($, agents)
    if (list.length === 0) return next(e)
    // 枠の上下 2 行と見出し 1 行を除いた行数までツリーを出す
    const maxRows = typeof e.props.maxRows === 'number' ? Math.max(1, e.props.maxRows - 3) : undefined
    return drawTree($, e, list, maxRows)
  })

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.requestId !== PANE) return next(e)
    return drawTree($, e, await read($, agents))
  })
}
