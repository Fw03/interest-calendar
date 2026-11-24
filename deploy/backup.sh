#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo '用法: bash deploy/backup.sh <新的备份文件路径>' >&2
  exit 2
fi

output=$1
compose=${CALENDAR_COMPOSE_FILE:-deploy/compose.yaml}
env_file=${CALENDAR_ENV_FILE:-.env}
if [[ -e "$output" ]]; then
  echo '备份文件已存在，请选择新路径' >&2
  exit 2
fi

umask 077
temporary=$(mktemp "${output}.partial.XXXXXX")
trap 'rm -f -- "$temporary"' EXIT
docker compose --env-file "$env_file" -f "$compose" exec -T mysql sh -ec '
  MYSQL_PWD="$MYSQL_PASSWORD" exec mysqldump --single-transaction --skip-add-drop-table --no-tablespaces     --set-gtid-purged=OFF -u "$MYSQL_USER" "$MYSQL_DATABASE"
' > "$temporary"
test -s "$temporary"
ln -- "$temporary" "$output"
