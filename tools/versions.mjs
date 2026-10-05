import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import semver from 'semver';

const execFileAsync = promisify(execFile);
const dryRun = process.argv.includes('--dry-run');

console.log('dryRun:', dryRun);
console.log('Node version:', process.version);

// Используем npx для вызова локального или глобального Angular CLI
async function runNgUpdate(args) {
    try {
        // Добавляем --allow-dirty на случай, если скрипт запускается в CI или до коммита
        const { stdout, stderr } = await execFileAsync('npx', ['ng', 'update', ...args, '--allow-dirty']);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        return true;
    } catch (error) {
        console.error('ng update failed');
        console.error('stderr:', error.stderr || error.message);
        return false;
    }
}

async function getLatestVersionInRange(packageName, range) {
    const { stdout } = await execFileAsync('npm', ['view', packageName, 'versions', '--json']);
    const versions = JSON.parse(stdout);
    return semver.maxSatisfying(versions, range);
}

async function getInstalledVersion(packageName) {
    try {
        const packageJson = JSON.parse(
            await readFile(`node_modules/${packageName}/package.json`, 'utf-8')
        );
        return packageJson.version;
    } catch {
        return null; // Пакет может быть не установлен локально
    }
}

// Читаем package.json проекта
const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));
const allDeps = { ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) };

// Для Angular критически важно обновлять core и cli вместе
const coreRange = allDeps['@angular/core'];
const cliRange = allDeps['@angular/cli'];

if (!coreRange || !cliRange) {
    console.error('✕ Этот проект не похож на Angular-приложение (не найден @angular/core или @angular/cli)');
    process.exit(1);
}

const installedCore = await getInstalledVersion('@angular/core');
const latestCore = await getLatestVersionInRange('@angular/core', coreRange);

console.log(`@angular/core -> Installed: ${installedCore}, Range: ${coreRange}, Latest compatible: ${latestCore}`);

if (installedCore && latestCore && semver.lt(installedCore, latestCore)) {
    console.log(' An update for Angular is available!');

    if (dryRun) {
        console.log(`[Dry Run] Would execute: npx ng update @angular/core@${latestCore} @angular/cli@${latestCore}`);
    } else {
        console.log('Starting official Angular update procedure...');
        // Передаем конкретные версии в ng update, чтобы CLI выполнил миграции кода
        const success = await runNgUpdate([`@angular/core@${latestCore}`, `@angular/cli@${latestCore}`]);
        console.log('Update status success:', success);
    }
} else {
    console.log('✓ Angular packages are up to date within your package.json ranges.');
}
