#!/usr/bin/env bash
set -euo pipefail

# Start/stop/restart frontend dev server with Vite HMR enabled.
# Uses polling so file edits under WSL/NTFS mounts are picked up reliably.
# Logs are stored under quantmate-portal/logs.

BASE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$BASE_DIR"
LOG_DIR="$BASE_DIR/logs"
mkdir -p "$LOG_DIR"
PID_FILE="$LOG_DIR/frontend.pid"
OUT_FILE="$LOG_DIR/frontend.out"
HOST="${PORTAL_HOST:-0.0.0.0}"
PORT="${PORTAL_PORT:-5173}"
STRICT_PORT="${PORTAL_STRICT_PORT:-true}"
HMR_HOST="${PORTAL_HMR_HOST:-}"
HMR_PORT="${PORTAL_HMR_PORT:-$PORT}"
WATCH_INTERVAL="${PORTAL_WATCH_INTERVAL:-300}"
PROCESS_MATCH="node $BASE_DIR/node_modules/vite/bin/vite.js"

read_pid() {
  if [ -f "$PID_FILE" ]; then
    cat "$PID_FILE" 2>/dev/null || true
  fi
}

pid_is_running() {
  local pid="$1"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

list_matching_pids() {
  ps ax -o pid= -o command= 2>/dev/null | awk -v pattern="$PROCESS_MATCH" 'index($0, pattern) { print $1 }' || true
}

show_recent_log() {
  if [ -f "$OUT_FILE" ]; then
    echo "Recent frontend log:" >&2
    tail -n 20 "$OUT_FILE" >&2 || true
  fi
}

ensure_frontend_runtime() {
  if ! command -v node >/dev/null 2>&1; then
    echo "Error: node is not installed or not in PATH" >&2
    return 1
  fi

  if [ ! -f "$BASE_DIR/node_modules/vite/bin/vite.js" ]; then
    echo "Error: frontend dependencies are missing. Run: cd \"$BASE_DIR\" && npm install" >&2
    return 1
  fi

  local native_pkg=""
  native_pkg="$(node - <<'NODE'
const { arch, platform, report } = process

const isMusl = () => {
  if (platform !== 'linux') return false
  try {
    return !report.getReport().header.glibcVersionRuntime
  } catch {
    return false
  }
}

const bindings = {
  android: {
    arm: { base: 'android-arm-eabi' },
    arm64: { base: 'android-arm64' },
  },
  darwin: {
    arm64: { base: 'darwin-arm64' },
    x64: { base: 'darwin-x64' },
  },
  freebsd: {
    arm64: { base: 'freebsd-arm64' },
    x64: { base: 'freebsd-x64' },
  },
  linux: {
    arm: { base: 'linux-arm-gnueabihf', musl: 'linux-arm-musleabihf' },
    arm64: { base: 'linux-arm64-gnu', musl: 'linux-arm64-musl' },
    loong64: { base: 'linux-loong64-gnu', musl: 'linux-loong64-musl' },
    ppc64: { base: 'linux-ppc64-gnu', musl: 'linux-ppc64-musl' },
    riscv64: { base: 'linux-riscv64-gnu', musl: 'linux-riscv64-musl' },
    s390x: { base: 'linux-s390x-gnu', musl: null },
    x64: { base: 'linux-x64-gnu', musl: 'linux-x64-musl' },
  },
  openbsd: {
    x64: { base: 'openbsd-x64' },
  },
  openharmony: {
    arm64: { base: 'openharmony-arm64' },
  },
  win32: {
    arm64: { base: 'win32-arm64-msvc' },
    ia32: { base: 'win32-ia32-msvc' },
    x64: { base: 'win32-x64-msvc' },
  },
}

const target = bindings[platform]?.[arch]
if (!target) process.exit(0)
const base = 'musl' in target && isMusl() ? target.musl : target.base
if (!base) process.exit(0)
process.stdout.write(`@rollup/rollup-${base}`)
NODE
)"

  if [ -z "$native_pkg" ]; then
    return 0
  fi

  if node -e "require.resolve('$native_pkg')" >/dev/null 2>&1; then
    return 0
  fi

  echo "Error: missing Rollup native package $native_pkg for this machine" >&2
  echo "node_modules may have been installed on another OS, or npm skipped optional dependencies." >&2
  echo "Run: cd \"$BASE_DIR\" && npm install" >&2
  echo "If npm is pinned to a dead local proxy, rerun with: NPM_CONFIG_USERCONFIG=/dev/null npm install" >&2
  return 1
}

stop() {
  echo "Stopping frontend..."
  pid="$(read_pid)"
  if pid_is_running "$pid"; then
    kill -TERM "$pid" 2>/dev/null || true
  fi

  for i in {1..15}; do
    if pid_is_running "$pid"; then
      sleep 1
    else
      rm -f "$PID_FILE"
      echo "Frontend stopped"
      return 0
    fi
  done
  echo "Warning: Frontend did not stop within timeout" >&2
  return 1
}

start() {
  stop || true
  echo "Starting frontend (vite dev with HMR)..."
  ensure_frontend_runtime

  # WSL + NTFS workaround: the esbuild ELF binary under node_modules on an
  # NTFS mount may fail. Point to a native-FS copy instead when available.
  ESBUILD_NATIVE="$HOME/esbuild-fix/node_modules/@esbuild/linux-x64/bin/esbuild"
  if [ -x "$ESBUILD_NATIVE" ]; then
    export ESBUILD_BINARY_PATH="$ESBUILD_NATIVE"
  fi

  # Make Vite hot updates reliable when the project lives on /mnt/*.
  export CHOKIDAR_USEPOLLING="${CHOKIDAR_USEPOLLING:-true}"
  export CHOKIDAR_INTERVAL="${CHOKIDAR_INTERVAL:-$WATCH_INTERVAL}"
  export WATCHPACK_POLLING="${WATCHPACK_POLLING:-true}"

  export PORTAL_HOST="$HOST"
  export PORTAL_PORT="$PORT"
  export PORTAL_HMR_HOST="$HMR_HOST"
  export PORTAL_HMR_PORT="$HMR_PORT"

  VITE_ARGS=(
    "--host" "$HOST"
    "--port" "$PORT"
  )
  if [ "$STRICT_PORT" = "true" ]; then
    VITE_ARGS+=("--strictPort")
  fi

  # Run vite via node directly because WSL on NTFS can have trouble with
  # the node_modules/.bin symlinks that npm/npx rely on.
  nohup node "$BASE_DIR/node_modules/vite/bin/vite.js" "${VITE_ARGS[@]}" >>"$OUT_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 3
  pid="$(read_pid)"
  if pid_is_running "$pid"; then
    echo "Frontend started (pid $pid) on http://$HOST:$PORT"
    echo "HMR polling: CHOKIDAR_USEPOLLING=$CHOKIDAR_USEPOLLING, interval=${CHOKIDAR_INTERVAL}ms"
    if [ -n "$HMR_HOST" ]; then
      echo "HMR websocket endpoint: ${HMR_HOST}:${HMR_PORT}"
    fi
  else
    echo "Error: Frontend failed to start. Check $OUT_FILE" >&2
    show_recent_log
    return 1
  fi
}

status() {
  local pid
  pid="$(read_pid)"
  if pid_is_running "$pid"; then
    echo "Frontend: running (pid $pid)"
    return 0
  fi

  local matched_pids
  matched_pids="$(list_matching_pids | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
  if [ -n "$matched_pids" ]; then
    echo "Frontend: running (pid $matched_pids)"
    return 0
  fi

  echo "Frontend: stopped"
}

case "${1-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop && start
    ;;
  status)
    status
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}"
    exit 2
    ;;
esac
