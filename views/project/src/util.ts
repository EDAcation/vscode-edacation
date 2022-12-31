export const keysForEnum = <M extends Record<string, unknown>>(map: M): [keyof M, ...(keyof M)[]] => Object.keys(map) as unknown as [keyof M, ...(keyof M)[]];
