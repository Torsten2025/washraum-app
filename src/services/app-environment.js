'use strict';

function resolveAppEnvironment(env = {}) {
  const appEnvironment = String(env.APP_ENV || '').trim().toLowerCase();
  const nodeEnvironment = String(env.NODE_ENV || '').trim().toLowerCase();
  const production = appEnvironment === 'production' && nodeEnvironment === 'production';
  return {
    environment: production ? 'production' : 'test',
    displayName: production ? 'WaschZeit' : 'WaschZeit Test'
  };
}

module.exports = { resolveAppEnvironment };
