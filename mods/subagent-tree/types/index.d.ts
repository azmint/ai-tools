export type AgentRecord = {
  id: string
  parentId?: string
  description: string
  type: string
  status: string
  startedAt: number
  endedAt?: number
}

declare module 'claude-code' {
  interface PluginState {
    'subagent-tree': { agents: AgentRecord[]; dismissed: string[] }
  }
}
