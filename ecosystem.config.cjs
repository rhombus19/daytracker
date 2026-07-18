module.exports = {
  apps: [
    {
      name: "daymark",
      script: "server.mjs",
      cwd: __dirname,
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 4173,
      },
    },
  ],
}
