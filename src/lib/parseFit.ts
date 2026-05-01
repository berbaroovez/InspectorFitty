import FitParser from 'fit-file-parser'

export type ParsedFit = Awaited<ReturnType<FitParser['parseAsync']>>

export async function parseFitFile(file: File): Promise<ParsedFit> {
  const buffer = await file.arrayBuffer()
  const parser = new FitParser({ force: true, mode: 'list' })
  return parser.parseAsync(buffer)
}

/** Returns all message type keys that have at least one entry */
export function getMessageTypes(data: ParsedFit): Array<{ key: string; count: number }> {
  return Object.entries(data)
    .filter(([, value]) => Array.isArray(value) && value.length > 0)
    .map(([key, value]) => ({ key, count: (value as unknown[]).length }))
    .sort((a, b) => b.count - a.count)
}
