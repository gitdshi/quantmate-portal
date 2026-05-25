#!/bin/sh

set -eu

cd /opt/quantmate

ENV_FILE=.env
DISK_USAGE_THRESHOLD_PERCENT="80"

upsert_env_key() {
  key="$1"
  value="$2"
  if grep -q "^${key}=" "$ENV_FILE"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
  else
    printf "\n%s=%s\n" "$key" "$value" >> "$ENV_FILE"
  fi
}

read_env_key() {
  key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    return
  fi
  grep "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2-
}

print_disk_diagnostics() {
  echo "==> Filesystem usage"
  df -h / || true
  echo "==> Docker disk usage"
  docker system df || true
}

root_usage_percent() {
  df -P / | awk 'NR == 2 {gsub(/%/, "", $5); print $5}'
}

cleanup_docker_artifacts() {
  echo "==> Pruning unused Docker data to recover disk space"
  docker system prune -af || true
  docker builder prune -af || true
  print_disk_diagnostics
}

cleanup_if_root_usage_high() {
  reason="$1"
  usage=$(root_usage_percent)
  if [ -n "$usage" ] && [ "$usage" -ge "$DISK_USAGE_THRESHOLD_PERCENT" ]; then
    echo "==> Root filesystem usage is ${usage}% (${reason}); running Docker cleanup"
    cleanup_docker_artifacts
  else
    echo "==> Root filesystem usage is ${usage:-unknown}% (${reason}); cleanup not needed"
  fi
}

cleanup_repo_images() {
  repo="$1"
  keep_ref="$2"
  label="$3"
  image_refs=$(docker image ls "$repo" --format '{{.Repository}}:{{.Tag}}' | awk 'NF && $0 !~ /:<none>$/')

  if [ -z "$image_refs" ]; then
    echo "==> No local $label images found for cleanup"
    return
  fi

  current_images=$(docker ps -a --format '{{.Image}}')
  echo "==> Cleaning unused $label images (keeping $keep_ref)"
  for image_ref in $image_refs; do
    if [ "$image_ref" = "$keep_ref" ]; then
      continue
    fi
    if printf '%s\n' "$current_images" | grep -Fxq "$image_ref"; then
      echo "Keeping image still referenced by a container: $image_ref"
      continue
    fi
    echo "Removing unused image: $image_ref"
    docker image rm "$image_ref" >/dev/null 2>&1 || echo "Failed to remove $image_ref; skipping"
  done
}

cleanup_managed_images() {
  current_api_tag=$(read_env_key IMAGE_TAG)
  if [ -n "$current_api_tag" ]; then
    cleanup_repo_images "ghcr.io/$GITHUB_OWNER/quantmate-api" "ghcr.io/$GITHUB_OWNER/quantmate-api:$current_api_tag" "quantmate-api"
  fi
  cleanup_repo_images "ghcr.io/$GITHUB_OWNER/quantmate-portal" "ghcr.io/$GITHUB_OWNER/quantmate-portal:$PORTAL_IMAGE_TAG" "quantmate-portal"
}

print_disk_diagnostics
cleanup_if_root_usage_high "before portal pull"

echo "==> Pulling portal image tag: $PORTAL_IMAGE_TAG"
GITHUB_OWNER=$GITHUB_OWNER PORTAL_IMAGE_TAG=$PORTAL_IMAGE_TAG \
  docker compose -f docker-compose.staging.yml pull portal

echo "==> Restarting portal service"
GITHUB_OWNER=$GITHUB_OWNER PORTAL_IMAGE_TAG=$PORTAL_IMAGE_TAG \
  docker compose -f docker-compose.staging.yml up -d portal --remove-orphans

echo "==> Restarting nginx to refresh upstream container IPs"
docker restart quantmate_nginx >/dev/null

echo "==> Waiting for portal to start"
sleep 10
curl -sf http://localhost:80/ || curl -sf http://localhost:5173/ || exit 1

echo "==> Persisting deployed portal image tag into .env"
upsert_env_key GITHUB_OWNER "$GITHUB_OWNER"
upsert_env_key PORTAL_IMAGE_TAG "$PORTAL_IMAGE_TAG"

cleanup_managed_images
cleanup_if_root_usage_high "after managed image cleanup"

echo "Portal staging deploy successful: $PORTAL_IMAGE_TAG"