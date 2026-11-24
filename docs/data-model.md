# 数据模型

Flyway 按 `backend/src/main/resources/db/migration/` 的版本创建表与内置内容。开发使用 MySQL 8.4，测试运行相同迁移并使用 H2 的 MySQL 兼容模式。

| 表 | 数据与约束 |
|---|---|
| users | 唯一的微信 openid 和客户端用于分区的随机 accountId |
| user_sessions | 会话令牌的 SHA-256 摘要、所有者与过期时间 |
| user_preferences、user_interests | 每用户一套主题、星座和兴趣顺序。写入共享版本，跨设备并发修改返回 409 |
| interest_modules | 可用兴趣的定义与默认排序 |
| daily_contents | 日期、模块和变体组合唯一。先采用项目原创短句，保留来源、授权与发布信息 |
| user_events | 记录 ID 按用户唯一，按用户和日期索引。编辑携带版本，客户端变更 ID 支持安全重试 |
| share_records | 随机 token、所有者、有效期、公开字段快照 |
| share_visits | 分享记录、访问时间与入口类型。访客散列列保留为空 |
| user_feedback | 用户主动填写的反馈，与账号一同删除 |
| share_reports | 公开分享举报，按分享、原因和日期去重 |

账号删除通过外键级联处理个人偏好、兴趣、日程、会话、分享、反馈及对应的访问记录和举报。公共内容和兴趣定义独立保存。
