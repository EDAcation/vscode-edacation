import type {yosys2digitaljs} from 'yosys2digitaljs';

export interface YosysModuleStats {
    num_wires: number;
    num_wire_bits: number;
    num_pub_wires: number;
    num_pub_wire_bits: number;
    num_memories: number;
    num_memory_bits: number;
    num_processes: number;
    num_cells: number;
    num_cells_by_type: Record<string, number>;
}

export type YosysRTL = Parameters<typeof yosys2digitaljs>[0];

interface YosysFileRTL {
    type: 'rtl';
    data: YosysRTL;
}

export interface YosysStats {
    creator: string;
    invocation: string;
    modules: Record<string, YosysModuleStats>;
}

interface YosysFileStats {
    type: 'stats';
    data: YosysStats;
}

interface YosysFileLuts {
    type: 'luts';
    data: YosysRTL;
}

export type YosysFile = YosysFileRTL | YosysFileStats | YosysFileLuts;
