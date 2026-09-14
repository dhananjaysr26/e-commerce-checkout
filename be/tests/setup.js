const { execSync } = require('child_process');
execSync('npm run db:reset', { stdio: 'ignore' });
