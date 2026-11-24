# 日有所喜

每天，都有一点你喜欢的。原生微信小程序按日期查看兴趣内容，管理个人日程和待办。支持兴趣多选排序、四套主题、微信账号同步和公开分享。

## 打开离线小程序

需要 **Node.js 22+** 和微信开发者工具。在 `D:\projects\interest-calendar` 或项目实际根目录执行以下命令。

```powershell
cd miniprogram
npm ci
npm run typecheck
npm test
```

`npm test` 会构建小程序。也可单独运行 `npm run build`。在微信开发者工具中点「导入项目」，**项目目录选择 `miniprogram/` 或仓库根目录**。两个入口均指向 `miniprogram/dist/`。离线体验可选择工具支持的测试模式，项目默认使用 `touristappid`。编辑 `src/` 后重新执行构建，再在工具中编译。

首页可切月、回到当天、切换主题或新建日程。兴趣调整会即时保存。「我的」可管理星座、主题、同步、隐私和反馈。离线模式支持导出带有开发占位标记的公开海报。

## 本地后端

需要 **JDK 17+、Maven 3.9+、Docker Compose v2**。单独执行后端测试只需要 JDK 和 Maven。

```powershell
cd backend
mvn test
mvn package
cd ..
```

复制 `.env.example` 为 `.env`，在本机配置开发数据库密码。启动本地 MySQL 和可选 Redis。开发 Compose 只绑定本机地址。

```powershell
docker compose -f deploy/compose.yaml up -d
$env:DB_PASSWORD = Read-Host '输入与 .env 一致的开发数据库密码'
cd backend
mvn spring-boot:run
```

访问 `http://127.0.0.1:8080/actuator/health` 查看启动状态。修改了 `DB_USER` 时也要为后端设置同名变量。Flyway 会在服务启动时应用迁移。

### 在开发工具联调

将 `miniprogram/local.config.example.json` 复制为同目录的 `local.config.json`，再执行 `npm run build`。该文件示例连向本机 HTTP。仅做本地联调时可在微信开发者工具里临时放开域名校验。使用公开的 HTTPS 域名联调真机，且在微信后台配置合法域名。

微信登录、小程序码和真机分享需要自己的 AppID。请在微信开发者工具内填写，并在有效的后端运行环境配置同一应用的 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`。AppSecret 仅在服务端使用。本地模式可始终访问日历和备注。

## 项目文档

- [开发进度与验证结果](IMPLEMENTATION_STATUS.md)
- [REST API](docs/api.md) 和 [数据模型](docs/data-model.md)
- [账号同步与本机迁移](docs/sync.md)
- [分享与海报](docs/share.md)
- [部署、监控、备份与恢复](docs/deploy.md)
- [测试和微信提审清单](docs/testing.md)
