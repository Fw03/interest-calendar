#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 || $1 != '--confirm-empty-database' || ! -s "$2" ]]; then
  echo '用法: bash deploy/restore.sh --confirm-empty-database <备份文件>' >&2
  exit 2
fi

compose=${CALENDAR_COMPOSE_FILE:-deploy/compose.yaml}
env_file=${CALENDAR_ENV_FILE:-.env}
docker compose --env-file "$env_file" -f "$compose" exec -T mysql sh -ec '
  table_count=$(MYSQL_PWD="$MYSQL_PASSWORD" mysql --batch --skip-column-names     -u "$MYSQL_USER" "$MYSQL_DATABASE"     -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE()")
  if [ "$table_count" != 0 ]; then
    echo "目标数据库非空，恢复已停止" >&2
    exit 2
  fi
  MYSQL_PWD="$MYSQL_PASSWORD" exec mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"
' < "$2"
