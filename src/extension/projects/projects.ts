import * as vscode from 'vscode';

import {
    type ExchangeCommand,
    type OpenProjectsChannel,
    type OpenProjectsExchange,
    type ProjectEventChannel,
    type SerializedProjectEvent,
    type SerializedProjectsState,
    createOpenProjectsExchange,
    createProjectEventExchange
} from '../../exchange.js';

import {Project} from './project.js';

interface SavedProjects {
    curOpen: number | null;
    paths: string[];
}

export class Projects {
    protected readonly context: vscode.ExtensionContext;

    private projectEventExchange = createProjectEventExchange({isPrimary: true});
    private projectEventChannel: ProjectEventChannel = this.projectEventExchange.createChannel();

    private openProjectsExchange: OpenProjectsExchange = createOpenProjectsExchange(
        {isPrimary: true},
        this.projectEventExchange
    );
    private openProjectsChannel: OpenProjectsChannel = this.openProjectsExchange.createChannel();

    private projects: Project[];
    private currentProject?: Project;
    private ignoreSave = false;

    private disposables: vscode.Disposable[];

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.projects = [];

        this.disposables = [vscode.tasks.onDidEndTask(this.handleTaskEnd.bind(this))];

        // Subscribe to project changes and ensure they are saved to disk
        // Make sure to ignore change events triggered by ourselves
        this.projectEventChannel.subscribe((project) => {
            if (this.ignoreSave) return;
            void project.save();
        });

        // Watch for project file changes
        const projectConfigWatcher = vscode.workspace.createFileSystemWatcher('**/*.edaproject', true, false, false);
        projectConfigWatcher.onDidChange((uri) => {
            this.ignoreSave = true;
            void this.reload(uri).finally(() => {
                this.ignoreSave = false;
            });
        });
        projectConfigWatcher.onDidDelete(async (uri) => {
            if (!this.has(uri)) return;

            await this.remove(uri);
            void vscode.window.showWarningMessage(`Project deleted: ${uri.fsPath}`);
        });
        this.disposables.push(projectConfigWatcher);
    }

    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    createProjectEventChannel() {
        return this.projectEventExchange.createChannel();
    }

    attachProjectEventPortal(sendCallback: (value: ExchangeCommand<SerializedProjectEvent>) => void) {
        return this.projectEventExchange.attachPortal(sendCallback);
    }

    createOpenProjectsChannel() {
        return this.openProjectsExchange.createChannel();
    }

    attachOpenProjectsPortal(sendCallback: (value: ExchangeCommand<SerializedProjectsState>) => void) {
        return this.openProjectsExchange.attachPortal(sendCallback);
    }

    getAll() {
        return this.projects;
    }

    has(uri: vscode.Uri) {
        return this.projects.some((project) => project.isUri(uri));
    }

    get(uri: vscode.Uri) {
        return this.projects.find((project) => project.isUri(uri));
    }

    async add(uri: vscode.Uri, shouldSetCurrent: boolean, shouldCreate: boolean): Promise<Project> {
        let project: Project | undefined;

        if (!this.has(uri)) {
            if (shouldCreate) {
                project = this.createProject(uri);
                await Project.store(project);
            } else {
                project = await this.loadProject(uri);
            }

            this.projects.push(project);
        } else {
            project = this.get(uri);
        }

        await this.store();

        if (!project) {
            throw new Error(`Failed to open project "${uri.toString()}".`);
        }

        if (shouldSetCurrent) {
            await this.setCurrent(project);
        }

        return project;
    }

    async remove(uri: vscode.Uri) {
        this.projects = this.projects.filter((project) => !project.isUri(uri));

        await this.store();

        if (this.currentProject && this.currentProject.getUri().toString() === uri.toString()) {
            if (this.projects.length > 0) {
                await this.setCurrent(this.projects[0]);
            } else {
                await this.setCurrent(undefined);
            }
        }

        this.emitState();
    }

    async load() {
        try {
            let projectsConf = this.context.workspaceState.get<SavedProjects | string[] | undefined>('projects');
            if (!projectsConf) {
                projectsConf = {curOpen: null, paths: []};
            } else if (Array.isArray(projectsConf)) {
                // Older versions of the extension (<= 0.5.3) simply stored an array of paths instead,
                // so if we find that value we need to migrate the config value.
                projectsConf = {curOpen: null, paths: projectsConf};
            }

            this.projects = [];
            for (const projectUri of projectsConf.paths) {
                const project = await this.loadProject(vscode.Uri.parse(projectUri));

                this.projects.push(project);
            }

            const openInd = projectsConf.curOpen;
            if (openInd != null && openInd >= 0 && openInd < this.projects.length) {
                await this.setCurrent(this.projects[openInd]);
            }
        } catch (err) {
            await this.context.workspaceState.update('projects', undefined);

            throw err;
        }

        if (!this.currentProject && this.projects.length > 0) {
            await this.setCurrent(this.projects[0]);
        }

        this.emitState();
    }

    async store() {
        const projectUris: vscode.Uri[] = [];
        for (const project of this.projects) {
            const projectUri = project.getUri();
            projectUris.push(projectUri);
        }

        let openIndex: number | null = null;
        if (this.currentProject) {
            openIndex = this.projects.indexOf(this.currentProject);
        }

        const data: SavedProjects = {
            curOpen: openIndex,
            paths: projectUris.map((uri) => uri.toString())
        };

        await this.context.workspaceState.update('projects', data);
    }

    async reload(uri: vscode.Uri) {
        const project = this.projects.find((project) => project.isUri(uri));
        await project?.reloadFromDisk();
    }

    getCurrent() {
        return this.currentProject;
    }

    async setCurrent(project?: Project) {
        this.currentProject = project;

        await this.store();

        this.emitState();
    }

    async handleTaskEnd(event: vscode.TaskEndEvent) {
        const task = event.execution.task;

        if (['yosys-rtl', 'yosys-synth', 'nextpnr'].includes(task.definition.type)) {
            if (
                task.scope === undefined ||
                task.scope === vscode.TaskScope.Global ||
                task.scope === vscode.TaskScope.Workspace
            ) {
                return;
            }

            const uri = vscode.Uri.joinPath(task.scope.uri, task.definition.project as string);
            await this.reload(uri);
        }
    }

    private async loadProject(uri: vscode.Uri): Promise<Project> {
        return Project.load(uri, this.createProjectEventChannel());
    }

    private createProject(uri: vscode.Uri): Project {
        return new Project(uri, undefined, undefined, undefined, undefined, this.createProjectEventChannel());
    }

    private emitState() {
        if (this.currentProject) this.projectEventChannel.submit(this.currentProject);
        this.openProjectsChannel.submit({projects: this.projects, currentProject: this.currentProject});
    }
}
