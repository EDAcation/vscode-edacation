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
    private parents: Set<Module>;
    private _primitives: Map<string, number>;

    public readonly name: string;

    private _children: Map<Module, number>;
    private _globalChildren: Map<Module, number>;

    private _stats: ModuleStats;
    private _globalStats: ModuleStats;

    constructor(name: string, stats: YosysModuleStats) {
        this.name = name;
        this._stats = {
            memoryCount: stats.num_memories,
            memoryBitCount: stats.num_memory_bits,
            processCount: stats.num_processes,
            cellCount: stats.num_cells
        };
        this._globalStats = structuredClone(this._stats);

        this._children = new Map();
        this._globalChildren = new Map();

        this._primitives = new Map();

        this.parents = new Set();
    }

    get isTopLevel(): boolean {
        return this.parents.size === 0;
    }

    get primitives(): Map<string, number> {
        return this._primitives;
    }

    get children(): Map<Module, number> {
        return this._children;
    }

    get globalChildren(): Map<Module, number> {
        return this._globalChildren;
    }

    get stats(): ModuleStats {
        return this._stats;
    }

    get globalStats(): ModuleStats {
        return this._globalStats;
    }

    addPrimitive(prim: string, count: number) {
        this._primitives.set(prim, (this._primitives.get(prim) ?? 0) + count);
    }

    addChild(module: Module, count: number) {
        console.log(`Add ${module.name} to ${this.name} - x${count}`);
        this._children.set(module, (this._children.get(module) ?? 0) + count);
        module.addParent(this);

        // Update global stats
        this._globalStats.memoryCount += count * module.globalStats.memoryCount;
        this._globalStats.memoryBitCount += count * module.globalStats.memoryBitCount;
        this._globalStats.cellCount += count * module.globalStats.cellCount;

        // Update global children
        this._globalChildren.set(module, (this._globalChildren.get(module) ?? 0) + count);
        for (const [gloModule, gloCount] of module.globalChildren.entries()) {
            this._globalChildren.set(gloModule, (this._globalChildren.get(gloModule) ?? 0) + count * gloCount);
        }
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
