# webos-tvheadend

A WebOS TV client for TVHeadend. Built with React, Enact Sandstone, and the Luna service API.

- Designed for WebOS TV 26
- Modern glassmorphism UI with React DOM components
- GPU-accelerated scrolling via CSS transforms

## Features

- Live TV playback via TVHeadend streaming
- Electronic Program Guide (EPG) with full grid navigation
- Channel list with current/next event info
- Recording management: view, play, schedule, cancel, delete
- Audio/text track selection
- User authentication (basic and digest: MD5, SHA256)

## Build

```sh
npm install
npm run build
```

## Deploy

Requires [webOS TV CLI (ares-tools)](https://webostv.developer.lge.com/develop/tools/cli-introduction).

### Emulator
```sh
npm run webos:emu
```

### TV
```sh
npm run webos:tv
```

### Debug
```sh
npm run inspect:emu
npm run inspect:tv
```

## Development

```sh
npm start
```

## Project Structure

- `src/` — application source (React, TypeScript)
- `service/` — `com.tvh.app.proxy` Luna service for TVHeadend communication
- `build/` — output directory for `ares-package`
- `vite.config.ts` — bundler config with es2015 target and ilib compatibility transforms

## License

GNU General Public License v3
