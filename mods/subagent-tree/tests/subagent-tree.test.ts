import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'subagent-tree',
  component: 'Pane',
  requestId: 'subagent-tree',
  viewport: { columns: 120, rows: 40 },
  props: {
    title: 'Subagents',
    isFocused: false,
    bodyColumns: 80,
    placement: 'inline',
    scroll: { offset: 0, bodyRows: 12 },
    view: {},
  },
} as const

test('起動したサブエージェントを親子ツリーで表示し、終わると ✅ になる', async ($, on) => {
  let ids = ['parent', 'child']
  on('agent.spawn', () => ({ model: 'claude-sonnet-5', agentId: ids.shift() }))
  on('agent.list', () => ({ value: [] }))
  on('clock.now', () => ({ value: 1_000 }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.complete', () => ({ text: '' }))

  await $.agent.spawn({ prompt: 'p', description: '調査する', subagentType: 'Explore' })
  await $.agent.spawn({
    prompt: 'p',
    description: 'ファイルを読む',
    subagentType: 'general-purpose',
    parentAgentId: 'parent',
  } as never)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect(await ui.find({ type: 'Text', text: '2 running · 0 done' })).toBeDefined()
    // 親は 1 段、子は 2 段の罫線を持つ
    if (surface === 'terminal') {
      // 行の中身: 罫線の段 + アイコン + 説明 + 種類・時間
      expect((await ui.find({ key: 'agent-parent' }))?.children).toHaveLength(1 + 3)
      expect((await ui.find({ key: 'agent-child' }))?.children).toHaveLength(2 + 3)
      expect(await ui.find({ type: 'Text', text: '└─' })).toBeDefined()
    } else {
      // Desktop は罫線を 1 行 1 枚の SVG で描き、子は 2 段分の幅を持つ
      const svg = (await ui.find({ key: 'agent-child' }))?.children?.[0]
      expect(svg?.type).toBe('Svg')
      expect(svg?.props.width).toBe(2 * 16)
    }
    expect(await ui.find({ type: 'Text', text: /^[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]$/ })).toBeDefined()
    await ui.unmount()
  }

  await $.turn.complete({ agentId: 'child', answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect(await ui.find({ type: 'Text', text: '1 running · 1 done' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '✅' })).toBeDefined()
})

test('サブエージェントがいれば入力欄の上の帯にもツリーを出す', async ($, on) => {
  on('agent.spawn', () => ({ model: 'claude-sonnet-5', agentId: 'only' }))
  on('agent.list', () => ({ value: [] }))
  on('clock.now', () => ({ value: 1_000 }))

  await $.agent.spawn({ prompt: 'p', description: '調査する', subagentType: 'Explore' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({
      plugin: 'subagent-tree',
      component: 'AbovePrompt',
      surface,
      viewport: { columns: 120, rows: 40 },
      props: { hasSurvey: false, isWorking: true, maxRows: 8, bodyColumns: 100, scroll: { offset: 0, bodyRows: 8 }, view: {} },
    } as never)
    expect(await ui.find({ type: 'Text', text: '調査する' })).toBeDefined()
    await ui.unmount()
  }
})

test('子の完了待ち (waiting) の親は ❌ ではなくスピナーで表示する', async ($, on) => {
  on('agent.list', () => ({
    value: [
      { id: 'parent', description: '親', type: 'general-purpose', status: 'waiting' },
      { id: 'child', parentId: 'parent', description: '子', type: 'Explore', status: 'running' },
    ],
  }))
  on('clock.now', () => ({ value: 1_000 }))
  on('ui.open', () => ({ value: { isPlaced: true } }))

  await $.command.run({ command: 'subagent-tree', args: '' })

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: '2 running · 0 done' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '❌' })).toBeUndefined()
})

test('完了通知では片付けず、ユーザーの入力で片付けて、一覧から拾い直さない', async ($, on) => {
  let now = 1_000
  on('agent.spawn', () => ({ model: 'claude-sonnet-5', agentId: 'done-one' }))
  on('agent.list', () => ({
    value: [{ id: 'done-one', description: '調査する', type: 'Explore', status: 'completed' }],
  }))
  on('clock.now', () => ({ value: now }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('turn.complete', () => ({ text: '' }))
  on('prompt.submit', ($, e) => ({ text: e.text }))

  await $.agent.spawn({ prompt: 'p', description: '調査する', subagentType: 'Explore' })
  now = 6_000
  await $.turn.complete({ agentId: 'done-one', answer: 'ok', durationMs: 1, isAborted: false, turnId: 't', reason: 'answer' } as never)

  // 完了通知によるターンでは残り、経過時間も保たれる
  await $.prompt.submit({ text: '<task-notification>', origin: { kind: 'task-notification' } } as never)
  await $.command.run({ command: 'subagent-tree', args: '' })
  let ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: ' Explore · 5s' })).toBeDefined()
  await ui.unmount()

  // ユーザーの入力で片付き、$.agent.list() に残っていても戻らない
  await $.prompt.submit({ text: '次の指示', origin: { kind: 'sdk' } } as never)
  await $.command.run({ command: 'subagent-tree', args: '' })
  ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'サブエージェントはまだ起動していません' })).toBeDefined()
})
