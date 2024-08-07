import * as vscode from 'vscode';

import type {ExtensionMessage, MessageFile} from '../../common/messages.js';
import * as node from '../../common/node-modules.js';
import {UniversalWorker} from '../../common/universal-worker.js';
import {type Project} from '../projects/index.js';

import {ManagedTool, type NativeToolExecutionOptions} from './managedtool.js';
import {type TaskOutputFile, TerminalMessageEmitter} from './messaging.js';
import type {TaskIOFile} from './task.js';

interface Context {
    project: Project;
    command: string;
    args: string[];

    inputFiles: TaskIOFile[];
    outputFiles: TaskIOFile[];
}

type ToolConfigOption = 'auto' | 'native-managed' | 'native-host' | 'web';

export abstract class ToolProvider extends TerminalMessageEmitter {
    protected readonly extensionContext: vscode.ExtensionContext;
    protected ctx: Context | null = null;

    constructor(extensionContext: vscode.ExtensionContext) {
        super();

        this.extensionContext = extensionContext;
    }

    abstract getName(): Promise<string>;

    protected abstract run(ctx: Context): Promise<void>;

    setRunContext(ctx: Context) {
        this.ctx = ctx;
    }

    async execute(): Promise<void> {
        if (!this.ctx) throw new Error('No run context available!');
        return await this.run(this.ctx);
    }
}

export class WebAssemblyToolProvider extends ToolProvider {
    async getName(): Promise<string> {
        return 'WebAssembly';
    }

    async run(ctx: Context): Promise<void> {
        const inFiles = await this.readFiles(ctx.project, ctx.inputFiles);

        // Create & start worker
        const worker = this.createWorker();
        worker.sendMessage(
            {
                type: 'input',
                command: ctx.command,
                args: ctx.args,
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
                const data = await vscode.workspace.fs.readFile(vscode.Uri.joinPath(project.getRoot(), file.path));

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

    protected abstract getExecutionOptions(command: string): Promise<NativeToolExecutionOptions | null>;

    async run(ctx: Context): Promise<void> {
        // Write generated input files so the native process can load them
        for (const file of ctx.inputFiles) {
            if (!file.data) continue;

            const destUri = vscode.Uri.joinPath(ctx.project.getRoot(), file.path);
            await vscode.workspace.fs.writeFile(destUri, file.data);
        }

        if (!node.isAvailable()) {
            this.error(
                'Required dependencies are unavailable. Please note that native tools are unavailable in a web environment.'
            );
            return;
        }

        const execOptions = await this.getExecutionOptions(ctx.command);
        if (!execOptions) {
            this.error('Native tool is unavailable. Aborting.');
            return;
        }

        const spawnArgs = {
            cwd: ctx.project.getRoot().fsPath,
            env: process.env
        };
        if (execOptions.path) {
            spawnArgs['env']['PATH'] = execOptions.path;
        }

        const proc = node.childProcess().spawn(execOptions.entrypoint, ctx.args, spawnArgs);

        proc.on('exit', this.onProcessExit.bind(this, ctx));
        proc.on('error', this.onProcessError.bind(this));

        proc.stdout.on('data', (data) => this.onProcessData(data as string, 'stdout'));
        proc.stderr.on('data', (data) => this.onProcessData(data as string, 'stderr'));
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

    private onProcessExit(ctx: Context, code: number | null, signal: string | null) {
        // flush buffers to get all output on the terminal
        if (this.lineBuffer['stdout'].length > 0) {
            this.println(this.lineBuffer['stdout'], 'stdout');
        }
        if (this.lineBuffer['stderr'].length > 0) {
            this.println(this.lineBuffer['stderr'], 'stderr');
        }

        if (code === 0) {
            const outputFiles = ctx.outputFiles;
            const writtenInputFiles = ctx.inputFiles.filter((file) => file.data);

            this.done(outputFiles.concat(writtenInputFiles).map((file) => ({path: file.path})));
        } else if (code !== null) {
            this.error(new Error(`Process exited with code ${code}`));
        } else {
            this.error(new Error(`Process was killed with signal: ${signal}`));
        }
    }
}

export class ManagedToolProvider extends NativeToolProvider {
    async getName(): Promise<string> {
        return 'Native - Managed';
    }

    async getExecutionOptions(command: string): Promise<NativeToolExecutionOptions | null> {
        const tool = new ManagedTool(this.extensionContext, command);
        const options = await tool.getExecutionOptions();

        // If already installed & valid, just return here
        if (options) return options;

        this.println('Installing native tool...\n');

        await vscode.commands.executeCommand('edacation.installTool', tool.getId());

        return await tool.getExecutionOptions();
    }
}

export class HostToolProvider extends NativeToolProvider {
    async getName(): Promise<string> {
        return 'Native - Host';
    }

    async getExecutionOptions(command: string): Promise<NativeToolExecutionOptions | null> {
        const entrypoint = await node.which()(command, {nothrow: true});
        if (!entrypoint) return null;

        return {entrypoint};
    }
}

export class AutomaticToolProvider extends ToolProvider {
    private toolProvider: ToolProvider | null = null;

    async getName(): Promise<string> {
        if (!this.ctx) return 'Automatic';

        const provider = await this.getToolProvider(this.ctx.command);
        return `Automatic [${await provider.getName()}]`;
    }

    private async getToolProvider(command: string): Promise<ToolProvider> {
        if (this.toolProvider) return this.toolProvider;

        // Always use Web provider in non-node environments
        const webProvider = new WebAssemblyToolProvider(this.extensionContext);
        if (!node.isAvailable()) return webProvider;

        // Use host provider if tool is installed
        const hostProvider = new HostToolProvider(this.extensionContext);
        if (await hostProvider.getExecutionOptions(command)) return hostProvider;

        // Use managed provider, unless installation somehow fails
        const managedProvider = new ManagedToolProvider(this.extensionContext);
        if (await managedProvider.getExecutionOptions(command)) return managedProvider;

        // Fall back to web provider
        return webProvider;
    }

    async run(ctx: Context): Promise<void> {
        const provider = await this.getToolProvider(ctx.command);
        provider.onMessage(this.fire.bind(this));

        provider.setRunContext(ctx);
        return await provider.execute();
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
        throw new Error(`Unrecognized tool provider option: ${provider}`);
    }
};
