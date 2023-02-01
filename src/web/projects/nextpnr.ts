export const generateNextpnrArguments = (inputFile: string) => {
    // ice40 args:
    // '--lp384',
    // '--package', 'qn32',

    return [
        // ECP5
        '--25k',
        '--package', 'CABGA381',
        '--json', inputFile ? inputFile : 'missing.json',
        '--write', 'routed.nextpnr.json',
        '--placed-svg', 'placed.svg',
        '--routed-svg', 'routed.svg'
    ];
};
