module.exports = {
  apps: [
    {
      name: 'coral',
      script: 'npx',
      args: 'wrangler pages dev dist --kv=KV --local --ip 0.0.0.0 --port 3000',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    },
    {
      name: 'fileserver',
      script: 'fileserver.mjs',
      env: {
        FILE_SERVER_PORT: 8899,
        FILE_STORAGE_PATH: '/data/portal/files'
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork'
    }
  ]
}
