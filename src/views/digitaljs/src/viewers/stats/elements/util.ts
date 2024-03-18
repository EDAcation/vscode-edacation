export const getPercentage = (val1: number, val2: number): number => {
    if (val1 === 0 || val2 === 0) {
        return 0;
    }

    return Math.floor((val1 / val2) * 10_000) / 100;
};
