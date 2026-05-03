export interface WebSocketMessage {
  command: string
}

export type ValidCommand = 'F' | 'B' | 'L' | 'R' | 'S'

export const VALID_COMMANDS: Set<ValidCommand> = new Set(['F', 'B', 'L', 'R', 'S'])

export interface SerialPortConfig {
  path: string
  baudRate: number
}

export interface ServerConfig {
  port: number
  host: string
}
