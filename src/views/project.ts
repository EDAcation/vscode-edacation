import {reactive} from 'vue';

import {Project, createOpenProjectsExchange, createProjectEventExchange} from '../exchange';

import {vscode} from './vscode-wrapper';

interface ProjectState {
    project?: Project;
}

const projectEventExchange = createProjectEventExchange();
const openProjectsExchange = createOpenProjectsExchange();

// Register portals to communicate with main extension
const projectEventPortal = projectEventExchange.attachPortal((value) => vscode.postMessage(value));
const openProjectsPortal = openProjectsExchange.attachPortal((value) => vscode.postMessage(value));

// Put received messages on the local exchanges
addEventListener('message', (event: MessageEvent) => {
    projectEventPortal.handleMessage(event.data);
    openProjectsPortal.handleMessage(event.data);
});

// Channels for internal use
const projectEventChannel = projectEventExchange.createChannel();
const openProjectsChannel = openProjectsExchange.createChannel();

// State management
export const syncedState: ProjectState = reactive({
    project: undefined
});

projectEventChannel.subscribe((project) => {
    console.log('[VIEW] Project update event');
    console.log(project);
    syncedState.project = project;
});
openProjectsChannel.subscribe((message) => {
    console.log('[VIEW] Open projects event');
    console.log(message.currentProject);
    syncedState.project = message.currentProject;
});
