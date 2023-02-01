import path from 'path-browserify';

import {FILE_EXTENSIONS_VERILOG} from '../util';

export const generateYosysRTLCommands = (inputFiles: string[]): string[] => {
    const verilogFiles = inputFiles.filter((file) => FILE_EXTENSIONS_VERILOG.includes(path.extname(file).substring(1)));

    // Yosys commands taken from yosys2digitaljs (https://github.com/tilk/yosys2digitaljs/blob/1b4afeae61/src/index.ts#L1225)

    return [
        ...verilogFiles.map((file) => `read_verilog ${file}`),
        'hierarchy -auto-top',
        'proc;',
        'opt;',
        'memory -nomap;',
        'wreduce -memx;',
        'opt -full;',
        'write_json rtl.digitaljs.json',
        ''
    ];
};

export const generateYosysSynthCommands = (inputFiles: string[]): string[] => {
    const verilogFiles = inputFiles.filter((file) => FILE_EXTENSIONS_VERILOG.includes(path.extname(file).substring(1)));

    return [
        ...verilogFiles.map((file) => `read_verilog ${file}`),
        'proc;',
        'opt;',
        'write_json rtl.digitaljs.json',
        'synth -lut 4',
        'write_json luts.digitaljs.json',
        'design -reset',
        ...verilogFiles.map((file) => `read_verilog ${file}`),
        'proc;',
        'opt;',
        'synth_ecp5 -json ecp5.json;',
        ''
    ];
};
