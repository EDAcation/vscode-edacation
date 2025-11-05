import {type ProjectTarget, type WorkerStep} from 'edacation';
import path from 'path';
import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile} from '../../common/messages.js';
import * as node from '../../common/node-modules.js';
import {UniversalWorker} from '../../common/universal-worker.js';
import {type Project} from '../projects/index.js';
import {type NativeToolExecutionOptions, ToolRepository} from '../tools';

import {type TaskOutputFile, TerminalMessageEmitter} from './messaging.js';
import type {TaskIOFile} from './task.js';

interface ToolInfoStatusOk {
    status: 'ok';
    execOptions: NativeToolExecutionOptions;
}

interface ToolInfoStatusMissing {
    status: 'missing';
    tool: string;
}

type ToolInfoStatus = ToolInfoStatusOk | ToolInfoStatusMissing;

interface Context {
    project: Project;
    target: ProjectTarget;
    steps: WorkerStep[];

    inputFiles: TaskIOFile[];
    outputFiles: TaskIOFile[];
}

type ToolConfigOption = 'auto' | 'native-managed' | 'native-host' | 'web';

type ToolStepCallback = (event: 'start' | 'end', step: WorkerStep) => Promise<void>;

export abstract class ToolProvider extends TerminalMessageEmitter {
    protected readonly extensionContext: vscode.ExtensionContext;
    protected ctx: Context | null = null;

    constructor(extensionContext: vscode.ExtensionContext) {
        super();

        this.extensionContext = extensionContext;
    }

    abstract getName(): Promise<string>;

    protected abstract run(ctx: Context, stepCallback: ToolStepCallback): Promise<void>;

    setRunContext(ctx: Context) {
        this.ctx = ctx;
    }

    async execute(stepCallback: ToolStepCallback): Promise<void> {
        if (!this.ctx) throw new Error('No run context available!');
        return await this.run(this.ctx, stepCallback);
    }
}

export class WebAssemblyToolProvider extends ToolProvider {
    async getName(): Promise<string> {
        return 'WebAssembly';
    }

    async run(ctx: Context, _stepCallback: ToolStepCallback): Promise<void> {
        const inFiles = await this.readFiles(ctx.project, ctx.inputFiles);

        // Create & start worker
        const worker = this.createWorker();
        worker.sendMessage(
            {
                type: 'input',
                steps: ctx.steps,
                inputFiles: inFiles
            },
            inFiles.map(({data}) => data.buffer)
        );
    }

    private async readFiles(project: Project, inputFiles: TaskIOFile[]): Promise<MessageFile[]> {
        const files: MessageFile[] = [];
        for (const file of inputFiles) {
            if (file.data) {
                files.push({path: file.path, data: file.data});
            } else {
                const data = await vscode.workspace.fs.readFile(project.getFileUri(file.path));

                files.push({
                    path: file.path,
                    data
                });
            }
        }

        return files;
    }

    private createWorker(): UniversalWorker {
        const worker = new UniversalWorker(
            vscode.Uri.joinPath(this.extensionContext.extensionUri, 'dist', 'workers', 'tool.js').toString(true)
        );

        worker.onEvent('message', this.handleMessage.bind(this));
        worker.onEvent('messageerror', this.handleMessageError.bind(this));
        worker.onEvent('error', this.handleError.bind(this));

        return worker;
    }

    private handleMessage(message: ExtensionMessage) {
        try {
            switch (message.type) {
                case 'terminal': {
                    this.println(message.data, message.stream);

                    break;
                }
                case 'output': {
                    const outputFiles = message.files as TaskOutputFile[];
                    this.done(outputFiles);

                    break;
                }
                case 'error': {
                    const error = message.error;
                    this.error(typeof error === 'string' ? new Error(error) : error);

                    break;
                }
            }
        } catch (err) {
            this.error(err);
        }
    }

    private handleMessageError(event: Error) {
        console.error('Message error:', event);

        this.error(new Error('Message error'));
    }

    private handleError(event: Error) {
        console.log(event);

        this.error(event);
    }
}

abstract class NativeToolProvider extends ToolProvider {
    private lineBuffer: Record<'stdout' | 'stderr', string>;

    constructor(extensionContext: vscode.ExtensionContext) {
        super(extensionContext);

        this.lineBuffer = {
            stdout: '',
            stderr: ''
        };
    }

    protected abstract getToolInfoStatus(command: string): Promise<ToolInfoStatus>;

    async getToolStatuses(ctx: Context): Promise<ToolInfoStatus[]> {
        return await Promise.all(ctx.steps.map((step) => this.getToolInfoStatus(step.tool)));
    }

    async run(ctx: Context, stepCallback: ToolStepCallback): Promise<void> {
        // Write generated input files so the native process can load them
        for (const file of ctx.inputFiles) {
            if (!file.data) continue;

            const destUri = ctx.project.getFileUri(file.path);
            await vscode.workspace.fs.writeFile(destUri, file.data);
        }

        // Prepare output directories so the tools don't have to create them
        for (const file of ctx.outputFiles) {
            const outDir = ctx.project.getFileUri(path.dirname(file.path));
            await vscode.workspace.fs.createDirectory(outDir);
        }

        if (!node.isAvailable()) {
            this.error(
                'Required dependencies are unavailable. Please note that native tools are unavailable in a web environment.'
            );
            return;
        }

        const toolsInfo = await this.getToolStatuses(ctx);
        const dispatchStep = async (i: number) => {
            const info = toolsInfo[i];
            if (info.status === 'missing') {
                this.error(`Native tool for '${ctx.steps[i].tool}' is unavailable. Aborting.`);
                return;
            }

            const step = await this.preStep(ctx, ctx.steps[i]);
            await stepCallback('start', step);

            this.runStep(ctx, step, info.execOptions, async (code, signal) => {
                await this.postStep(ctx, step);
                await stepCallback('end', step);

                const isLastStep = i >= ctx.steps.length - 1;
                const isOk = this.onProcessExit(ctx, code, signal, isLastStep); // only emit done signal if last step
                if (isOk && !isLastStep) await dispatchStep(i + 1); // only run next step if no error and not last
            });
        };

        await dispatchStep(0);
    }

    private async preStep(ctx: Context, step: WorkerStep): Promise<WorkerStep> {
        // some tools require generated input files to function
        // that need to be written to a file somewhere for the tool to work.
        // however, the step config only specifies file names, not absolute paths.
        // so we need to update the file paths

        if (!step.generatedInputFiles) return step;

        const pathMap = new Map<string, string>();
        for (let i = 0; i < step.generatedInputFiles.length; i++) {
            const file = step.generatedInputFiles[i];

            // ensure dir
            const dir = ctx.project.getFileUri(ctx.target.getFile('temp'));
            await vscode.workspace.fs.createDirectory(dir);

            // write file
            await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(dir, file.name), file.content);

            const newPath = ctx.target.getFile('temp', file.name);
            pathMap.set(file.name, newPath);
            step.generatedInputFiles[i].name = newPath;
        }

        // rewrite tool arguments: if exact match with previous name, replace with new path
        for (let i = 0; i < step.arguments.length; i++) {
            const replace = pathMap.get(step.arguments[i]);
            if (replace !== undefined) {
                step.arguments[i] = replace;
            }
        }

        return step;
    }

    private async postStep(ctx: Context, _step: WorkerStep): Promise<void> {
        // Post-step execution: remove the directory we created earlier
        const dir = ctx.project.getFileUri(ctx.target.getFile('temp'));
        await vscode.workspace.fs.delete(dir, {recursive: true, useTrash: false});
    }

    private runStep(
        ctx: Context,
        step: WorkerStep,
        options: NativeToolExecutionOptions,
        onComplete: (code: number | null, signal: string | null) => Promise<void>
    ): void {
        const spawnArgs = {
            cwd: ctx.project.getRoot().fsPath,
            env: process.env
        };
        if (options.path) {
            spawnArgs['env']['PATH'] = options.path;
        }

        const proc = node.childProcess().spawn(options.entrypoint, step.arguments, spawnArgs);

        proc.stdout.on('data', (data) => this.onProcessData(data as string, 'stdout'));
        proc.stderr.on('data', (data) => this.onProcessData(data as string, 'stderr'));
        proc.on('error', this.onProcessError.bind(this));
        proc.on('exit', (code, signal) => void onComplete(code, signal));
    }

    private onProcessError(error: unknown) {
        if (error instanceof Error) {
            if ((error as Error & {code: string}).code === 'ENOENT') {
                this.error(
                    'Could not find host tool entrypoint. Are Yosys/Nextpnr installed on your system and available in PATH?'
                );
                return;
            }
        }

        this.error(error);
    }

    private onProcessData(data: string, stream: 'stdout' | 'stderr') {
        this.lineBuffer[stream] += data;

        const lines = this.lineBuffer[stream].split('\n');
        this.lineBuffer[stream] = lines[lines.length - 1];

        for (const line of lines.slice(0, -1)) {
            this.println(line, stream);
        }
    }

    private onProcessExit(ctx: Context, code: number | null, signal: string | null, emitDone = true): boolean {
        // flush buffers to get all output on the terminal
        if (this.lineBuffer['stdout'].length > 0) {
            this.println(this.lineBuffer['stdout'], 'stdout');
        }
        if (this.lineBuffer['stderr'].length > 0) {
            this.println(this.lineBuffer['stderr'], 'stderr');
        }

        const isOk = code === 0;
        if (isOk && !emitDone) {
            return true;
        } else if (isOk) {
            const outputFiles = ctx.outputFiles;
            const writtenInputFiles = ctx.inputFiles.filter((file) => file.data);

            this.done(outputFiles.concat(writtenInputFiles).map((file) => ({path: file.path})));
            return true;
        } else if (code !== null) {
            this.error(new Error(`Process exited with code ${code}`));
            return false;
        } else {
            this.error(new Error(`Process was killed with signal: ${signal}`));
            return false;
        }
    }
}

export class ManagedToolProvider extends NativeToolProvider {
    async getName(): Promise<string> {
        return 'Native - Managed';
    }

    protected async getToolInfoStatus(command: string): Promise<ToolInfoStatus> {
        const tool = await ToolRepository.get(this.extensionContext).getLocalToolFromCommand(command);
        if (!tool)
            return {
                status: 'missing',
                tool: command
            };
        const execOptions = await tool.getExecutionOptions(command);

        // If already installed & valid, return here
        if (execOptions)
            return {
                status: 'ok',
                execOptions
            };

        return {
            status: 'missing',
            tool: tool.id
        };
    }

    override async getToolStatuses(ctx: Context): Promise<ToolInfoStatus[]> {
        const statuses = await super.getToolStatuses(ctx);

        const missingTools = statuses.filter((info) => info.status === 'missing');
        if (missingTools.length) {
            const toolsStr = [...new Set(missingTools.map((tool) => tool.tool))].join(', ');
            this.println(`Installing missing tools: ${toolsStr}`);
            await vscode.commands.executeCommand('edacation.installTool', ...missingTools.map((info) => info.tool));
        }

        // Collect info again
        return super.getToolStatuses(ctx);
    }
}

export class HostToolProvider extends NativeToolProvider {
    async getName(): Promise<string> {
        return 'Native - Host';
    }

    protected async getToolInfoStatus(command: string): Promise<ToolInfoStatus> {
        const entrypoint = await node.which()(command, {nothrow: true});
        if (!entrypoint)
            return {
                status: 'missing',
                tool: command
            };

        return {
            status: 'ok',
            execOptions: {
                entrypoint
            }
        };
    }
}

export class AutomaticToolProvider extends ToolProvider {
    private toolProvider: ToolProvider | null = null;

    async getName(): Promise<string> {
        if (!this.ctx) return 'Automatic';

        const provider = await this.getToolProvider(this.ctx);
        return `Automatic [${await provider.getName()}]`;
    }

    private async getToolProvider(ctx: Context): Promise<ToolProvider> {
        if (this.toolProvider) return this.toolProvider;

        // Always use Web provider in non-node environments
        const webProvider = new WebAssemblyToolProvider(this.extensionContext);
        if (!node.isAvailable()) return webProvider;

        // Use host provider if all tools are installed
        const hostProvider = new HostToolProvider(this.extensionContext);
        const hostToolStatuses = await hostProvider.getToolStatuses(ctx);
        if (hostToolStatuses.every((tool) => tool.status === 'ok')) return hostProvider;

        // Use managed provider, unless installation somehow fails for any of the tools
        const managedProvider = new ManagedToolProvider(this.extensionContext);
        const managedToolStatuses = await managedProvider.getToolStatuses(ctx);
        if (managedToolStatuses.every((tool) => tool.status === 'ok')) return managedProvider;

        // Fall back to web provider
        return webProvider;
    }

    async run(ctx: Context, stepCallback: ToolStepCallback): Promise<void> {
        const provider = await this.getToolProvider(ctx);
        provider.onMessage(this.fire.bind(this));

        provider.setRunContext(ctx);
        return await provider.execute(stepCallback);
    }
}

export const getConfiguredProvider = (context: vscode.ExtensionContext): ToolProvider => {
    const provider = vscode.workspace.getConfiguration('edacation').get('toolProvider') as ToolConfigOption;

    if (provider === 'auto') {
        return new AutomaticToolProvider(context);
    } else if (provider === 'native-managed') {
        return new ManagedToolProvider(context);
    } else if (provider === 'native-host') {
        return new HostToolProvider(context);
    } else if (provider === 'web') {
        return new WebAssemblyToolProvider(context);
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new Error(`Unrecognized tool provider option: ${provider}`);
    }
};
