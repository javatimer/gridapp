import { readFile, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const dryRun = process.argv.includes('--dry-run');

console.log('🦾 ТЕРМИНАТОР v2: Зачистка и Апгрейд учебных проектов');

async function getAbsoluteLatestVersion(packageName) {
    try {
        const { stdout } = await execFileAsync('npm', ['view', packageName, 'version']);
        return stdout.trim();
    } catch {
        return null;
    }
}

async function runCommand(cmd, args) {
    console.log(`🚀 Выполняю: ${cmd} ${args.join(' ')}`);
    try {
        const { stdout, stderr } = await execFileAsync(cmd, args);
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);
        return true;
    } catch (error) {
        console.error(`⚠️ Команда ${cmd} завершилась с предупреждением/ошибкой`);
        console.error(error.stderr || error.message);
        return false;
    }
}

async function patchAngularJson() {
    try {
        const angularJsonRaw = await readFile('angular.json', 'utf-8');
        const angularJson = JSON.parse(angularJsonRaw);

        // Безопасно находим имя первого проекта в файле
        const projectName = angularJson.projects ? Object.keys(angularJson.projects)[0] : null;

        if (projectName) {
            const project = angularJson.projects[projectName];
            const buildTarget = project.architect?.build;

            // 1. Модернизируем основной билдер приложения
            if (buildTarget) {
                // Переводим на новый application билдер
                buildTarget.builder = '@angular/build:application';

                // Мигрируем опции
                if (buildTarget.options) {
                    if (buildTarget.options.main) {
                        buildTarget.options.browser = buildTarget.options.main;
                        delete buildTarget.options.main;
                    }
                    buildTarget.options.polyfills = [];
                }

                // Чистим development конфигурацию
                if (buildTarget.configurations?.development) {
                    buildTarget.configurations.development = {
                        optimization: false,
                        sourceMap: true
                    };
                }
            }

            // 2. Обновляем dev-server для команды serve и чиним target-свойства
            if (project.architect?.serve) {
                project.architect.serve.builder = '@angular/build:dev-server';

                // Фикс для serve: старый browserTarget превращаем в buildTarget
                if (project.architect.serve.options?.browserTarget) {
                    project.architect.serve.options.buildTarget = project.architect.serve.options.browserTarget;
                    delete project.architect.serve.options.browserTarget;
                }

                // Проходимся по конфигурациям serve (production/development)
                if (project.architect.serve.configurations) {
                    for (const config of Object.values(project.architect.serve.configurations)) {
                        if (config.browserTarget) {
                            config.buildTarget = config.browserTarget;
                            delete config.browserTarget;
                        }
                    }
                }
            }

            // 3. ФИКС ОШИБКИ СХЕМЫ: Исправляем extract-i18n (переводим с browserTarget на buildTarget)
            if (project.architect?.['extract-i18n']) {
                const i18n = project.architect['extract-i18n'];
                if (i18n.options?.browserTarget) {
                    i18n.options.buildTarget = i18n.options.browserTarget;
                    delete i18n.options.browserTarget;
                }
            }

            // 4. Сносим старый блок тестов Jest/Karma, так как мы используем нативный Vitest
            if (project.architect?.test) {
                delete project.architect.test;
            }

            // Очищаем старые схемы, они в v22 дефолтные
            project.schematics = {};

            await writeFile('angular.json', JSON.stringify(angularJson, null, 2) + '\n', 'utf-8');
            console.log(`💾 Файл angular.json для проекта "${projectName}" успешно модернизирован под Angular 22 Zoneless (включая buildTarget)!`);
        }
    } catch (e) {
        console.log('ℹ️ Файл angular.json не найден или при его патче произошла ошибка:', e.message);
    }
}

async function main() {
    // Шаг 0: Динамически получаем абсолютно свежие версии Angular
    const latestCompilerCli = await getAbsoluteLatestVersion('@angular/compiler-cli');
    const latestAngular = await getAbsoluteLatestVersion('@angular/core');
    const latestCli = await getAbsoluteLatestVersion('@angular/cli');
    const latestBuild = await getAbsoluteLatestVersion('@angular/build');

    const actualBuildVersion = latestBuild || latestAngular;
    const actualCliVersion = latestCli || latestAngular;

    if (!latestAngular) {
        console.error('✕ Не удалось связаться с реестром NPM.');
        process.exit(1);
    }

    // 🔥 ДИНАМИЧЕСКОЕ ВЫЧИСЛЕНИЕ ПЕРИФЕРИИ (Больше никакого хардкода!)
    console.log('🔍 Динамически вычисляю совместимый стек зависимостей...');
    const targetTypescript = '~6.0.3'; // безопасный дефолт

    // 2. Для тестового окружения берем абсолютный свежий LATEST из сети
    const latestVitest = await getAbsoluteLatestVersion('vitest');
    const latestJsdom = await getAbsoluteLatestVersion('jsdom');
    const targetVitest = latestVitest ? `^${latestVitest}` : '^5.0.3';
    const targetJsdom = latestJsdom ? `^${latestJsdom}` : '^30.1.2';

    // 3. Для rxjs и tslib берем стабильные мажорные latest
    const latestRxjs = await getAbsoluteLatestVersion('rxjs');
    const latestTslib = await getAbsoluteLatestVersion('tslib');
    const targetRxjs = latestRxjs ? `~${latestRxjs}` : '~7.8.2';
    const targetTslib = latestTslib ? `^${latestTslib}` : '^2.8.1';

    console.log(`\n🎯 Целевые версии ядра:`);
    console.log(`   @angular/core -> ${latestAngular}`);
    console.log(`   @angular/cli  -> ${actualCliVersion}`);
    console.log(`   @angular/build -> ${actualBuildVersion}`);
    console.log(`\n📦 Вычисленная периферия:`);
    console.log(`   typescript    -> ${targetTypescript}`);
    console.log(`   rxjs          -> ${targetRxjs}`);
    console.log(`   tslib         -> ${targetTslib}`);
    console.log(`   vitest        -> ${targetVitest}`);
    console.log(`   jsdom         -> ${targetJsdom}\n`);

    if (dryRun) {
        console.log('🔍 [DRY RUN] Скрипт просто перепишет файлы без физического удаления.');
    }

    // Шаг 1: Читаем package.json
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.devDependencies = packageJson.devDependencies || {};

    // Шаг 2: Обновляем dependencies
    for (const pkg of Object.keys(packageJson.dependencies)) {
        if (pkg.startsWith('@angular/') && pkg !== '@angular/fire') {
            let targetVersion = latestAngular;

            // Если это пакеты, склонные к задержкам релизов (ssr, server, localize)
            if (pkg === '@angular/ssr' || pkg === '@angular/platform-server' || pkg === '@angular/localize') {
                const realPackageLatest = await getAbsoluteLatestVersion(pkg);
                if (realPackageLatest) {
                    targetVersion = realPackageLatest;
                }
            }

            packageJson.dependencies[pkg] = `^${targetVersion}`;
            console.log(`   [dep] ${pkg} -> ^${targetVersion}`);
        }
    }

    console.log('📝 Выравниваю development зависимости...');
    for (const pkg of Object.keys(packageJson.devDependencies)) {
        if (pkg.startsWith('@angular/')) {
            let targetVersion = latestAngular;

            if (pkg === '@angular/cli') {
                targetVersion = actualCliVersion;
            } else if (pkg === '@angular/compiler-cli') {
                targetVersion = latestCompilerCli || latestAngular;
            } else if (pkg === '@angular/build') {
                targetVersion = actualBuildVersion;
            }

            packageJson.devDependencies[pkg] = `^${targetVersion}`;
            console.log(`   [dev] ${pkg} -> ^${targetVersion}`);
        }
    }

    // Записываем вычисленные динамические версии сопутствующего стека
    packageJson.dependencies['rxjs'] = targetRxjs;
    packageJson.dependencies['tslib'] = targetTslib;
    packageJson.devDependencies['typescript'] = targetTypescript;
    packageJson.devDependencies['jsdom'] = targetJsdom;
    packageJson.devDependencies['vitest'] = targetVitest;

    // Очистка старой Кармы/Жасмина
    if (packageJson.devDependencies['karma'] || packageJson.devDependencies['jasmine-core']) {
        console.log('🧹 Обнаружены старые тесты Karma/Jasmine. Мигрирую на Vitest...');
        delete packageJson.devDependencies['karma'];
        delete packageJson.devDependencies['karma-chrome-launcher'];
        delete packageJson.devDependencies['karma-coverage'];
        delete packageJson.devDependencies['karma-jasmine'];
        delete packageJson.devDependencies['karma-jasmine-html-reporter'];
        delete packageJson.devDependencies['jasmine-core'];
        delete packageJson.devDependencies['@types/jasmine'];

        packageJson.devDependencies['vitest'] = targetVitest;
        packageJson.devDependencies['jsdom'] = targetJsdom;
        if (packageJson.scripts && packageJson.scripts.test) {
            packageJson.scripts.test = 'vitest';
        }
    }

    // Тотальный Zoneless
    if (packageJson.dependencies['zone.js']) delete packageJson.dependencies['zone.js'];
    if (packageJson.devDependencies['zone.js']) delete packageJson.devDependencies['zone.js'];

    if (!dryRun) {
        console.log('🗑️ Очищаю кэш и блокировки...');
        await rm('node_modules', { recursive: true, force: true });
        await rm('.angular', { recursive: true, force: true });
        await rm('package-lock.json', { force: true });

        await patchAngularJson();

        await writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
        console.log('💾 Файл package.json успешно сохранен.');

        console.log('📥 Запускаю чистую установку пакетов...');
        const installSuccess = await runCommand('npm', ['install', '--legacy-peer-deps']);

        if (installSuccess) {
            console.log('\n🎉 АПГРЕЙД ЗАВЕРШЕН!');
            console.log('👉 Запуск проекта: npm start');
        } else {
            console.log('\n❌ Ошибка при установке пакетов.');
        }
    } else {
        console.log('\n[Dry Run] Результат package.json:');
        console.log(JSON.stringify(packageJson, null, 2));
    }
}

main();
