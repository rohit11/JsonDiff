function normalizeEnv(env) {
    return env.replace(/^local_/, '').replace(/^remote_/, '');
  }
  
  module.exports = { normalizeEnv };
  