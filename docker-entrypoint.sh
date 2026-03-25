#!/bin/sh
set -eu

read_file_or_default() {
  file_path="$1"
  default_value="$2"
  if [ -f "$file_path" ]; then
    cat "$file_path"
  else
    echo "$default_value"
  fi
}

escape_js() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

portal_version_default="$(read_file_or_default /opt/quantmate-build/portal_version 0.0.0)"
portal_build_time_default="$(read_file_or_default /opt/quantmate-build/build_time unknown)"

PORTAL_VERSION="${PORTAL_VERSION:-$portal_version_default}"
PORTAL_BUILD_TIME="${PORTAL_BUILD_TIME:-$portal_build_time_default}"

portal_version_escaped="$(escape_js "$PORTAL_VERSION")"
portal_build_time_escaped="$(escape_js "$PORTAL_BUILD_TIME")"

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  PORTAL_VERSION: "$portal_version_escaped",
  PORTAL_BUILD_TIME: "$portal_build_time_escaped"
};
EOF

exec nginx -g "daemon off;"
