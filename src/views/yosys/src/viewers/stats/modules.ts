import type {YosysModuleStats} from '../../types';

export enum ModuleStatId {
    memoryCount = 'memoryCount',
    memoryBitCount = 'memoryBitCount',
    processCount = 'processCount',
    cellCount = 'cellCount',
    wireCount = 'wireCount',
    wireCountPub = 'wireCountPub'
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
        case ModuleStatId.wireCount:
            return 'Wires';
        case ModuleStatId.wireCountPub:
            return 'Wires (Pub.)';
    }
};

export const getTotalPrimCounts = (primitives: Primitive[]): {cells: number; bits: number} => {
    const counts = {cells: 0, bits: 0};

    for (const prim of primitives) {
        counts.cells += prim.count;
        counts.bits += prim.count * (prim.bitWidth || 0);
    }

    return counts;
};

export class Primitive {
    public readonly name: string;
    public readonly bitWidth: number | null;
    public count: number;

    constructor(name: string, bitWidth: number | null, count: number) {
        this.name = name.toLowerCase();
        this.bitWidth = bitWidth;
        this.count = count;
    }

    static fromFQN(fqn: string, count: number): Primitive {
        fqn = fqn.replace('$', '');
        const bitWidthStr = fqn.split('_').reverse()[0] ?? '';
        const bitWidth = parseInt(bitWidthStr) || null;

        let name = fqn;
        if (bitWidth != null) {
            // If we actually have a bit width, slice off the last section of the fqn
            name = fqn.slice(0, fqn.length - bitWidthStr.length - 1);
        }

        return new Primitive(name, bitWidth, count);
    }

    get fqn() {
        return `$${this.name}_${this.bitWidth}`;
    }
}

export class Module {
    private parents: Set<Module>;

    public readonly name: string;

    private _primitives: Primitive[];
    private _globalPrimitives: Primitive[];

    private _children: Map<Module, number>;
    private _globalChildren: Map<Module, number>;

    private _stats: ModuleStats;
    private _globalStats: ModuleStats;

    constructor(name: string, stats: YosysModuleStats) {
        this.name = name;

        this._primitives = [];
        this._globalPrimitives = [];

        this._children = new Map();
        this._globalChildren = new Map();

        this._stats = {
            memoryCount: stats.num_memories,
            memoryBitCount: stats.num_memory_bits,
            processCount: stats.num_processes,
            cellCount: stats.num_cells,
            wireCount: stats.num_wires,
            wireCountPub: stats.num_pub_wires
        };
        this._globalStats = Object.assign({}, this._stats);

        this.parents = new Set();
    }

    get isTopLevel(): boolean {
        return this.parents.size === 0;
    }

    get primitives(): Primitive[] {
        return this._primitives;
    }

    get globalPrimitives(): Primitive[] {
        return this._globalPrimitives;
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

    findPrimitives({name, width}: {name?: string; width?: number}, isGlobal: boolean): Primitive[] {
        const arr = isGlobal ? this._globalPrimitives : this._primitives;

        const results = [];
        for (const prim of arr) {
            if ((!name || prim.name === name) && (!width || prim.bitWidth === width)) {
                results.push(prim);
            }
        }
        return results;
    }

    addPrimitive(prim: Primitive) {
        const oldPrim = this.findPrimitives({name: prim.name, width: prim.bitWidth || undefined}, false)[0];
        if (oldPrim) {
            oldPrim.count += prim.count;
        } else {
            this._primitives.push(prim);
        }

        const oldGloPrim = this.findPrimitives({name: prim.name, width: prim.bitWidth || undefined}, true)[0];
        if (oldGloPrim) {
            oldGloPrim.count += prim.count;
        } else {
            this._globalPrimitives.push(prim);
        }
    }

    addChild(module: Module, count: number) {
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

        // Update global primitives
        for (const gloPrim of module.globalPrimitives) {
            const prim = this.findPrimitives({name: gloPrim.name, width: gloPrim.bitWidth || undefined}, true)[0];
            if (prim) {
                prim.count += count * gloPrim.count;
            } else {
                this._globalPrimitives.push(new Primitive(gloPrim.name, gloPrim.bitWidth, count * gloPrim.count));
            }
        }
    }

    protected addParent(module: Module) {
        this.parents.add(module);
    }
}

const resolveModuleDeps = (
    name: string,
    stats: YosysModuleStats,
    resolved: Map<string, Module>,
    moduleNames: string[]
): Module | null => {
    const module = new Module(name, stats);
    for (const [depName, count] of Object.entries(stats.num_cells_by_type)) {
        // Cell is a primitive if it starts with $ and is not the name of a custom module
        if (depName.startsWith('$') && moduleNames.indexOf(depName) === -1) {
            module.addPrimitive(Primitive.fromFQN(depName, count));
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
    const modNames = modEntries.map((e) => e[0]);
    const modCount = modEntries.length;
    if (!modCount) {
        return [];
    }

    const resolved = new Map<string, Module>();
    while (resolved.size < modCount) {
        const oldSize = resolved.size;
        for (let i = modEntries.length - 1; i >= 0; i--) {
            const [modName, stats] = modEntries[i];

            // Strip leading "/"
            const sanitizedName = modName.startsWith('\\') ? modName.slice(1) : modName;
            if (sanitizedName in resolved.keys()) {
                continue;
            }

            const module = resolveModuleDeps(sanitizedName, stats, resolved, modNames);
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
