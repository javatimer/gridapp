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
    const latestAngular = await getAbsoluteLatestVersion('@angular/core');
    // Актуальные версии
    const targetRxjs = '~7.8.2';
    const targetTslib = '^2.8.1';
    const targetTypescript = '~6.0.3';
    const targetJsdom = '^30.1.2';
    const targetVitest = '^5.0.3';

    if (!latestAngular) {
        console.error('✕ Не удалось связаться с реестром NPM.');
        process.exit(1);
    }

    console.log(`🎯 Целевая версия Angular: ${latestAngular}\n`);

    if (dryRun) {
        console.log('🔍 [DRY RUN] Скрипт просто перепишет файлы без физического удаления node_modules.');
    }

    // Шаг 1: Читаем package.json
    const packageJson = JSON.parse(await readFile('package.json', 'utf-8'));

    // Шаг 2: Брутально вылавливаем И ВСЕ пакеты @angular/* и выравниваем их
    console.log('📝 Автоматически выравниваю ВСЕ пакеты @angular/* под версию', latestAngular);

    packageJson.dependencies = packageJson.dependencies || {};
    packageJson.devDependencies = packageJson.devDependencies || {};

    // Динамически обновляем все пакеты Angular в секции dependencies
    for (const pkg of Object.keys(packageJson.dependencies)) {
        // Если пакет начинается с @angular/, но это НЕ @angular/fire (у него своя ветка версий)
        if (pkg.startsWith('@angular/') && pkg !== '@angular/fire') {
            packageJson.dependencies[pkg] = `^${latestAngular}`;
            console.log(`   [dep] ${pkg} -> ^${latestAngular}`);
        }
    }

    // Динамически обновляем все пакеты Angular в секции devDependencies
    for (const pkg of Object.keys(packageJson.devDependencies)) {
        if (pkg.startsWith('@angular/')) {
            packageJson.devDependencies[pkg] = `^${latestAngular}`;
            console.log(`   [dev] ${pkg} -> ^${latestAngular}`);
        }
    }

    // Выравниваем сопутствующий стек (rxjs, vitest, tslib и т.д.)
    packageJson.dependencies['rxjs'] = targetRxjs;
    packageJson.dependencies['tslib'] = targetTslib;
    packageJson.devDependencies['typescript'] = targetTypescript;
    packageJson.devDependencies['jsdom'] = targetJsdom;
    packageJson.devDependencies['vitest'] = targetVitest;

    // Если в проекте были старые тесты на Карма/Жасмин, вычищаем их и даем современный Vitest + Jsdom
    if (packageJson.devDependencies['karma'] || packageJson.devDependencies['jasmine-core']) {
        console.log('🧹 Обнаружены старые тестовые пакеты (Karma/Jasmine). Заменяю на Vitest...');
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

    // 💥 ТОТАЛЬНЫЙ ZONELESS: Вырезаем zone.js из package.json навсегда!
    if (packageJson.dependencies['zone.js']) {
        console.log('🧹 Вычищаю zone.js из dependencies...');
        delete packageJson.dependencies['zone.js'];
    }

    if (packageJson.devDependencies['zone.js']) {
        console.log('🧹 Вычищаю zone.js из devDependencies...');
        delete packageJson.devDependencies['zone.js'];
    }

    if (!dryRun) {
        // Шаг 3: Полная аннигиляция старого кэша и блокировок
        console.log('🗑️ Уничтожаю node_modules, package-lock.json и кэш .angular...');
        await rm('node_modules', { recursive: true, force: true });
        await rm('.angular', { recursive: true, force: true });
        await rm('package-lock.json', { force: true });

        // Патчим angular.json под новую схему Angular
        await patchAngularJson();

        // Шаг 4: Сохраняем обновленный package.json
        await writeFile('package.json', JSON.stringify(packageJson, null, 2) + '\n', 'utf-8');
        console.log('💾 Файл package.json успешно переписан под Angular 22!');

        // Шаг 5: Жесткая чистая установка
        console.log('📥 Запускаю принудительную чистую установку пакетов...');
        const installSuccess = await runCommand('npm', ['install', '--force']);

        if (installSuccess) {
            console.log('\n🎉 БРУТАЛЬНОЕ ОБНОВЛЕНИЕ ЗАВЕРШЕНО!');
            console.log('👉 Попробуйте запустить проект: npm start');
        } else {
            console.log('\n❌ Пакеты установились с ошибками. Проверьте логи npm.');
        }
    } else {
        console.log('\n[Dry Run] Новый package.json выглядел бы так:');
        console.log(JSON.stringify(packageJson, null, 2));
    }
}

main();
