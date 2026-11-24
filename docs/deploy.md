# 部署与运维

生产部署需要获得项目所有者批准，并提前准备 Docker Compose v2、域名、TLS 证书、安全的凭证配置以及独立的数据备份位置。

## 生产配置

1. 从 `.env.example` 建立仅运维可读的 `.env.prod`，配置独立数据库、Redis 密码和小程序凭证。生产数据库和 Redis 仅在 Compose 内部网络接收连接。
2. 配置 `CALENDAR_DOMAIN` 和宿主机绝对路径 `TLS_DIR`。该路径包含 `fullchain.pem` 与 `privkey.pem`。
3. 检查编排配置并从项目根目录启动服务。配置检查使用 quiet，避免打印展开后的环境变量。

```bash
docker compose --env-file .env.prod -f deploy/compose.prod.yaml config --quiet
docker compose --env-file .env.prod -f deploy/compose.prod.yaml up -d --build
```

检查 `https://<域名>/health` 和公开月历 API。小程序 `apiBase` 使用此域名下的 `/api/v1`。证书续期由部署环境负责，更新后重载 Nginx。重新构建后端前先备份，升级遵循 Flyway 版本顺序。回滚代码前确认该版兼容已应用的迁移。

## 备份与恢复

从项目根目录在 Bash 中执行以下命令。备份文件包含私人数据，应加密保存并限制读取。根据业务保留策略管理备份，不把备份上传到未经授权的位置。

```bash
CALENDAR_COMPOSE_FILE=deploy/compose.prod.yaml CALENDAR_ENV_FILE=.env.prod \
  bash deploy/backup.sh /secure-backups/calendar-2026-11-21.sql
```

恢复前创建独立实例或新空卷，只启动 MySQL。脚本检查目标库为空。恢复完成后先验证表、行数与健康检查，再考虑切流量。若恢复中断，使用新的空目标重试。恢复通过信任的已审核备份文件进行。

```bash
CALENDAR_COMPOSE_FILE=deploy/compose.prod.yaml CALENDAR_ENV_FILE=.env.restore \
  bash deploy/restore.sh --confirm-empty-database /secure-backups/calendar-2026-11-21.sql
```

别给恢复环境启动后端或开放写入，直到恢复结束。使用另一个 Compose 项目名称及专用卷与生产隔离，例如在恢复脚本进程中设 `COMPOSE_PROJECT_NAME=calendar-restore`。

## 监控与运营

- 监控 `/health`、API 5xx、请求耗时、数据库容量、备份成功率和证书到期。Redis 故障可降级，关注缓存延迟和后端负载。
- 日志仅保留诊断所需字段。Nginx 访问日志记录时间、方法、状态、字节数和耗时。不得打印原始 URI 或请求体、授权头、微信凭证、日程和分享标识。
- 有权限的运营人员可查看 `user_feedback` 与 `share_reports`。举报按分享、日期和类别去重。公开分享过期后不可访问。按已公示的保留策略清理备份和历史数据，实际执行前取得相应授权。
