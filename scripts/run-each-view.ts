import {spawnSync} from 'child_process';
import {readdir} from 'fs/promises';
import path from 'path';

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
    const command = process.argv.slice(2);
    const commandName = ['npm'].concat(command).join(' ');

    const currentDirectory = path.dirname(__filename);
    const viewsDirectory = path.resolve(currentDirectory, '..', 'views');
    const failedDirectories: string[] = [];

    console.log(`Executing command "${commandName}" for all views.`);
    console.log();

    for (const directory of await readdir(viewsDirectory)) {
        const directoryName = `./views/${directory}`;

        console.log(`Executing command "${commandName}" in views "${directoryName}"`);

        const {status} = spawnSync('npm', command, {
            cwd: path.resolve(viewsDirectory, directory),
            stdio: ['inherit', 'inherit', 'inherit']
        });
        console.log();

        if (status !== 0) {
            failedDirectories.push(directoryName);
        }
    }

    if (failedDirectories.length === 0) {
        console.log(`Executing command "${commandName}" was successful for all views.`);
    } else {
        console.log(`Executing command "${commandName}" failed for these views:`);
        console.log(failedDirectories.map((directory) => `  - ${directory}`).join('\n'));
        console.log('See the logs above for more details.');
    }
})();
