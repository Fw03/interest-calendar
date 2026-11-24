# REST API

所有业务接口以 `/api/v1` 开头。成功响应为 `{"code":0,"message":"ok","data":...}`，错误响应的 HTTP 状态码和 `code` 一致，`data` 为 null。登录接口返回 token，后续私有请求发送 `Authorization: Bearer <token>`。日期使用 `YYYY-MM-DD`，支持 1900–2099 年。

| 方法和路径 | 权限 | 参数或用途 |
|---|---|---|
| GET /calendar/month | 公开 | year、month，返回月内每一天的星期、农历和节气 |
| GET /calendar/daily | 公开或登录 | date，返回公共内容，登录时按已选兴趣排序 |
| GET /interests | 公开 | 兴趣定义 |
| POST /auth/wechat/login | 公开 | JSON `{code}`，返回 token、accountId、expiresAt |
| POST /auth/logout | 登录 | 撤销当前会话 |
| GET、PUT /users/me/preferences | 登录 | PUT 携带 themeId、zodiacSign、version |
| GET、PUT /users/me/interests | 登录 | PUT 携带 selectedInterests 字符串数组、version |
| GET /events | 登录 | 可传 date，省略时用于拉取本账号的日程 |
| POST /events | 登录 | date、title、content、kind、completed，可指定 id 和 mutationId |
| PUT /events/{id} | 所有者 | 同创建，另携带当前 version |
| DELETE /events/{id} | 所有者 | 可传 version 做并发保护 |
| POST /shares | 登录 | date、templateId（daily 或 quote）、themeId，返回一周有效的 token |
| GET /shares/{token} | 公开 | 可传 ref（friend、timeline、poster），返回公开快照 |

`weekday` 从星期日 0 到星期六 6。日程 `kind` 可为 `note` 或 `todo`。两个偏好接口共享版本号。日程有独立版本号。409 表示版本过期，客户端保留本地编辑并由用户选择冲突处理方式。属于其他账号的日程 ID 返回 404。无效或过期分享也返回 404。

## 分享码和支持接口

| 方法和路径 | 权限 | 用途 |
|---|---|---|
| GET /shares/poster/{scene} | 公开 | 使用 32 位十六进制标识读取公开分享并统计扫码 |
| GET /shares/{token}/code | 分享所有者 | 返回微信官方小程序码图片，微信未配置时返回 503 |
| POST /shares/{token}/reports | 公开 | reason 允许 content、copyright、other |
| POST /feedback | 登录 | message 长度 1–500 |
| DELETE /users/me | 登录 | 提交 `{"confirm":"DELETE"}` 后删除当前账号可关联数据 |
