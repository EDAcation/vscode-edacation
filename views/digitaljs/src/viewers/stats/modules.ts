import type {YosysModuleStats} from '../../types';

export enum ModuleStatId {
    memoryCount = 'memoryCount',
    memoryBitCount = 'memoryBitCount',
    processCount = 'processCount',
    cellCount = 'cellCount'
}

type ModuleStats = Record<ModuleStatId, number>;

export const getModuleStatIds = (): ModuleStatId[] => {
    return Object.values(ModuleStatId);
};

export const getModuleStatName = (stat: ModuleStatId): string => {
    switch (stat) {
        case ModuleStatId.memoryCount:
            return 'Memories';
        case ModuleStatId.memoryBitCount:
            return 'Memory Bits';
        case ModuleStatId.processCount:
            return 'Processes';
        case ModuleStatId.cellCount:
            return 'Cells';
        default:
            return '';
    }
};

export class Module {
    private _children: Map<Module, number>;
    private parents: Set<Module>;
    private primitiveModules: Map<string, number>;

    public readonly name: string;
    public readonly localStats: ModuleStats;
    private _globalStats: ModuleStats | null;

    constructor(name: string, stats: YosysModuleStats) {
        this._children = new Map();
        this.parents = new Set();
        this.primitiveModules = new Map();

        this.name = name;
        this.localStats = {
            memoryCount: stats.num_memories,
            memoryBitCount: stats.num_memory_bits,
            processCount: stats.num_processes,
            cellCount: stats.num_cells
        };
        this._globalStats = null;
    }

    get primitives(): Map<string, number> {
        return this.primitiveModules;
    }

    get children(): Map<Module, number> {
        return this._children;
    }

    get isTopLevel(): boolean {
        return this.parents.size === 0;
    }

    get globalStats(): ModuleStats {
        if (this._globalStats) {
            return this._globalStats;
        }

        this._globalStats = structuredClone(this.localStats);
        for (const [module, count] of this._children) {
            const moduleStats = module.globalStats;
            this._globalStats.memoryCount += count * moduleStats.memoryCount;
            this._globalStats.memoryBitCount += count * moduleStats.memoryBitCount;
            this._globalStats.cellCount += count * moduleStats.cellCount;
        }

        return this._globalStats;
    }

    addPrimitive(prim: string, count: number) {
        const curCount = this.primitiveModules.get(prim) || 0;
        this.primitiveModules.set(prim, curCount + count);
    }

    addChild(module: Module, count: number) {
        const curCount = this._children.get(module) || 0;
        this._children.set(module, curCount + count);
        module.addParent(this);
    }

    protected addParent(module: Module) {
        this.parents.add(module);
    }
}

const resolveModuleDeps = (name: string, stats: YosysModuleStats, resolved: Map<string, Module>): Module | null => {
    const module = new Module(name, stats);
    for (const [depName, count] of Object.entries(stats.num_cells_by_type)) {
        if (depName.startsWith('$')) {
            module.addPrimitive(depName.slice(1), count);
            continue;
        }

        const childDep = resolved.get(depName);
        if (!childDep) {
            // Cannot fully be resolved yet
            return null;
        }
        module.addChild(childDep, count);
    }

    return module;
};

export const buildModuleTree = (modules: Record<string, YosysModuleStats>): Module[] => {
    const modEntries = Object.entries(modules);
    const modCount = modEntries.length;
    if (!modCount) {
        return [];
    }

    const resolved = new Map<string, Module>();
    while (resolved.size < modCount) {
        const oldSize = resolved.size;
        for (let i = modEntries.length - 1; i >= 0; i--) {
            const [modName, stats] = modEntries[i];
            const sanitizedName = modName.slice(1); // Strip leading "\"
            if (sanitizedName in resolved.keys()) {
                continue;
            }

            const module = resolveModuleDeps(sanitizedName, stats, resolved);
            if (!module) {
                continue;
            }
            resolved.set(sanitizedName, module);
            modEntries.splice(i, 1);
        }
        if (resolved.size <= oldSize) {
            throw new Error('Cyclic dependency loop detected; cannot resolve module dependency tree!');
        }
    }

    return Array.from(resolved.values()).reverse();
};
