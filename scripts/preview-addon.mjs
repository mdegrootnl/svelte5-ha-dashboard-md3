import { spawnSync } from 'node:child_process';

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const build = spawnSync(npmCmd, ['run', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

if (build.status !== 0) {
    if (build.error) console.error(build.error);
    process.exit(build.status ?? 1);
}

process.env.DASHBOARD_DEPLOYMENT = 'ha-addon';
process.env.DASHBOARD_DATA_DIR ||= 'data';
process.env.SUPERVISOR_TOKEN ||= 'playwright-supervisor-token';
process.env.PORT ||= '3000';

await import('../server.js');
