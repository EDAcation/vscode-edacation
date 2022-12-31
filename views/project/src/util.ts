export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export const keysForEnum = <M extends Record<string, unknown>>(map: M): [keyof M, ...(keyof M)[]] => Object.keys(map) as unknown as [keyof M, ...(keyof M)[]];
