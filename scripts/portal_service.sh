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

stop() {
  echo "Stopping frontend..."
  if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE" 2>/dev/null || true)
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_FILE"
  fi
  pkill -f "vite" || true

  for i in {1..15}; do
    if pgrep -f "vite" >/dev/null; then
      sleep 1
    else
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
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Frontend started (pid $(cat "$PID_FILE")) on http://$HOST:$PORT"
    echo "HMR polling: CHOKIDAR_USEPOLLING=$CHOKIDAR_USEPOLLING, interval=${CHOKIDAR_INTERVAL}ms"
    if [ -n "$HMR_HOST" ]; then
      echo "HMR websocket endpoint: ${HMR_HOST}:${HMR_PORT}"
    fi
  else
    echo "Error: Frontend failed to start. Check $OUT_FILE" >&2
    return 1
  fi
}

status() {
  if pgrep -f "vite" >/dev/null; then
    echo "Frontend: running"
  else
    echo "Frontend: stopped"
  fi
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
