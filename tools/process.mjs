import { execFile } from 'node:child_process';

execFile('npm', ['view', '@angular/core', 'version'],
    (error, stdout, stderr) => {
        console.log('error:', error);
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
    }
);


/*
execFile('node', ['--some-nonexistent-option'], (error, stdout, stderr) => {
    console.log('error:', error);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
});
*/