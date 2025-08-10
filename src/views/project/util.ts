export type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
    ? ElementType
    : never;

export type PotentialError<WorkerOptions> = {status: 'ok'; res: WorkerOptions} | {status: 'error'; err: Error};

export const keysForEnum = <M extends Record<string, unknown>>(map: M): [keyof M, ...(keyof M)[]] =>
    Object.keys(map) as unknown as [keyof M, ...(keyof M)[]];

export const firstLowerCase = (text: string): string => `${text.substring(0, 1).toLowerCase()}${text.substring(1)}`;
export const firstUpperCase = (text: string): string => `${text.substring(0, 1).toUpperCase()}${text.substring(1)}`;

export const FILE_EXTENSIONS_VERILOG = ['v', 'vh', 'sv', 'svh'];
export const FILE_EXTENSIONS_VHDL = ['vhd'];
