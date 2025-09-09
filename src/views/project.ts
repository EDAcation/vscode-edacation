import {reactive} from 'vue';

import {type Project, createOpenProjectsExchange, createProjectEventExchange} from '../exchange';

import {vscode} from './vscode-wrapper';

interface ProjectState {
    project?: Project;
}

const projectEventExchange = createProjectEventExchange({isPrimary: false});
const openProjectsExchange = createOpenProjectsExchange({isPrimary: false}, projectEventExchange);

// Register portals to communicate with main extension
const projectEventPortal = projectEventExchange.attachPortal((value) => vscode.postMessage(value));
const openProjectsPortal = openProjectsExchange.attachPortal((value) => vscode.postMessage(value));

// Put received messages on the local exchanges
addEventListener('message', (event: MessageEvent) => {
    projectEventPortal.handleMessage(event.data);
    openProjectsPortal.handleMessage(event.data);
});

// Channels for internal use (exported to prevent GC)
export const projectEventChannel = projectEventExchange.createChannel();
export const openProjectsChannel = openProjectsExchange.createChannel();

// State management
export const syncedState: ProjectState = reactive({
    project: undefined
});

projectEventChannel.subscribe((project) => {
    console.log('[VIEW] Project update event');
    console.log(project);

    // only update if the update concerns the current project
    // note that we need to reassign in order to trigger Vue reactivity,
    // even though the project instance itself is already subscribed to the channel.
    if (syncedState.project && syncedState.project.isUri(project.getUri())) {
        syncedState.project = project;
    }
});
openProjectsChannel.subscribe((message) => {
    console.log('[VIEW] Open projects event');
    console.log(message.currentProject);
    syncedState.project = message.currentProject;
});
