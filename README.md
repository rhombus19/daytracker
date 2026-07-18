# Daymark

Daymark stores one shared JSON document on the application server.

## Development

```sh
npm run dev
```

Open <http://localhost:4173>. The server creates and persists the shared data at
`data/daytracker.json`. Browser `localStorage` is not used.

## Production with PM2

```sh
npm ci
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

Deploy `data/daytracker.json` separately if you need to preserve it while replacing
the application directory. Keep PM2 at one instance: multiple Node processes must
not write to the same JSON file.

The host needs a persistent, writable filesystem. `PORT`, `HOST`, and
`DAYMARK_DATA_FILE` can override the server defaults when not using the ecosystem
file.
