# 日有所喜｜微信小程序 V1.0 Codex 自动开发任务书

> 文档版本：1.0  | 目标：让 Codex 在 VS Code 工作区中分阶段创建、检查并交付**可运行**的原生微信小程序和 Spring Boot 后端。
>
> 使用方法：将本文档与 `AGENTS.md` 放在项目根目录，打开 VS Code 的 Codex，粘贴文末「启动指令」。Codex 应按任务清单逐项开发并运行可用的验证命令。

## 0. Codex 执行约束（必须遵守）

1. **先检查、后修改**：阅读仓库结构与本文件，检查已有代码。不得无提示覆盖、删除现有功能或业务数据。发现已有项目时采用增量开发。
2. **真正创建文件**：不只解释实现方式，要实际创建文件、实现页面、联通 API、运行检查，并在每个阶段汇报「完成项 / 命令及结果 / 遗留问题 / 下一步」。
3. **依赖优先**：优先稳定、维护活跃的开源组件；不假设任何未经核实的 API 或 npm 包存在。版本由实际依赖解析及兼容性决定，锁定版本并提交 lockfile。
4. **分阶段落地**：先跑通离线可演示的微信小程序，再接 Spring Boot/MySQL/Redis；外部内容接口没有凭证时使用清晰标记的演示数据，不得伪造实时天气、黄历宜忌或星座来源。
5. **能运行才算完成**：每阶段运行对应 lint/typecheck/test/build 或可行的替代检查；如缺微信开发者工具/AppID/数据库等外部条件，应说明阻塞并提供本地运行步骤，不能宣称已通过真机测试。
6. **保护隐私**：用户备注、待办、生日、偏好默认私有。分享仅允许白名单公开内容；不能把 token、AppSecret、数据库密码写进前端或提交仓库。
7. **不做诱导分享**：允许用户自愿转发好友或制作海报；禁止转发解锁、强制邀请、虚构运势结果或未经授权的数据抓取。
8. **不擅自部署/付费**：不创建真实收费云资源、不上传生产环境、不提交应用商店、不购买接口、不执行破坏性数据库命令，除非用户明确批准。
9. **必要时选择默认方案**：对于无安全风险的未定事项使用本文档默认值并记录假设；只有遇到不可逆、付费、账号授权或生产操作才请求批准。
10. **维护进度**：在仓库根目录生成并更新 `IMPLEMENTATION_STATUS.md`，标记每个阶段的完成情况、测试记录与下一步，不要把未完成事项标成完成。

## 1. 产品定义

**名称**：日有所喜（工作名）  
**标语**：每天，都有一点你喜欢的。  
**平台**：微信小程序优先，手机竖屏体验。  
**核心价值**：用户可多选兴趣、自由排序兴趣卡片、切换整体主题；按日期查看公共内容并维护个人日程；将公开内容生成海报或微信小程序分享卡片。

### 1.1 功能范围（MVP）

**必须实现**
- 首页：公历月视图、上月/下月/返回今天、日期选择、当日兴趣内容卡片、简短日程概览。
- 日期：星期计算准确、跨年跨月准确；农历和二十四节气通过经过测试的开源库或可信算法提供，无法准确获得时不显示错误值。
- 兴趣配置：星座、传统黄历、每日名言、日程备注；音乐、电影、历史上的今天、天气为预留模块，可开关；首批无内容源时显示「即将上线」，不呈现假推荐。
- 多选：启用/停用、排序、保存；初次打开提供默认兴趣，进入兴趣页可修改。
- 四套主题：奶油治愈 `cream`、东方国风 `ink`、星空梦幻 `night`、清新简约 `mint`；主题影响全局背景、文本、卡片、选中态、导航栏，暗色保证可读性。
- 日程：按日期创建、编辑、删除备注/待办；不共享给别人；本地版先用 Storage，联网后以账号数据为主并处理同步冲突。
- 分享：用户主动创建「每日精选」或「极简语录」公开卡片；好友分享页面使用可追踪但不暴露用户私密信息的随机 token；海报生成时有真实可用的小程序码或明确处于开发占位模式。
- 我的：兴趣数量、已记录天数、主题设置、星座设置、隐私与反馈入口。
- 发现：兴趣列表和添加入口，公共内容专题可以留空态。
- 无障碍/易用性：点击区域适中、文本对比度、加载/空数据/异常状态、网络失败提示。

**暂不实现（第二阶段）**
- AI 实时生成个人运势；音乐内播放；电影在线播放；付费会员；复杂社交关系、情侣协作；强制登录；复杂算法推荐；后台推送轰炸。

### 1.2 非功能要求
- 微信开发者工具中可运行，无初次打开白屏。
- 小程序分包/资源优化，避免首包体积过大；列表、日历切换无明显卡顿。
- 不申请与功能无关的权限；系统权限只在使用相关功能时请求。
- 数据正确性：日期、本地时区（默认 `Asia/Shanghai`，支持用户系统本地日期）和分享日期一致。
- 可测试：日期算法、兴趣排序、主题读写、权限过滤、分享 token 具备自动化测试。

## 2. 页面与导航

底部 tabBar（三个）：

1. `pages/calendar/index` **日历**：顶部年月与主题入口；7 列日历；点击日期下面展示对应日期的兴趣内容卡片；添加备注入口；分享入口。
2. `pages/discover/index` **发现**：各兴趣简介、未订阅兴趣「添加」、常见内容专题卡片。
3. `pages/profile/index` **我的**：个人设置、兴趣入口、主题入口、日程统计、隐私与反馈。

其他页面：
- `pages/interests/index`：多选兴趣、排序（首版可用上移/下移按钮，优于不可用的拖拽）、保存；系统原生返回不丢失设置。
- `pages/themes/index`：主题预览、选中、立即应用并持久化。
- `pages/day-detail/index`：日期信息、完整兴趣卡片、事件列表。
- `pages/note-editor/index`：新建/编辑事件表单，包含标题、正文、日期、待办状态。
- `pages/share-card/index`：两种模板预览、保存图片、微信好友分享。
- `pages/share-landing/index`：只展示授权公开分享数据；无效/过期 token 友好提示；引导体验个人日历。

### 2.1 首页交互顺序
1. 启动读取本地 `themeId` 和 `selectedInterests`，立即展示静态日历。
2. 根据用户选择的日期计算对应星期、月份公历，读取缓存或请求当日公共内容。
3. 根据用户兴趣顺序渲染；个人日程只给自己看。
4. 点顶部主题图标跳转主题页面；点兴趣管理按钮进入兴趣页面。
5. 点日期切换详细内容；点击添加日程进入编辑页面。
6. 点分享进入公开内容预览，**不得默认包含用户日程/备注**。

### 2.2 主题定义（建议 tokens）

| id | 背景 | 卡片 | 主要文字 | 品牌色 | 浅装饰底色 |
|---|---|---|---|---|---|
| cream | `#FFF9F1` | `#FFFFFF` | `#453B35` | `#C68F6C` | `#F4E7DA` |
| ink | `#F5F0E6` | `#FFFDF7` | `#382E27` | `#A34336` | `#EADFD1` |
| night | `#18182F` | `#272640` | `#F7EFFD` | `#B59CF4` | `#373653` |
| mint | `#F0F8F5` | `#FFFFFF` | `#2A5148` | `#3C9C81` | `#DEF1E9` |

主题系统以 Token 驱动，不复制 4 套独立页面；组件使用同一逻辑渲染。

## 3. 推荐项目目录

```text
interest-calendar/
├── AGENTS.md
├── CODEX_DEVELOPMENT_PLAN.md
├── IMPLEMENTATION_STATUS.md
├── README.md
├── .gitignore
├── docs/
│   ├── api.md
│   ├── data-model.md
│   └── testing.md
├── miniprogram/
│   ├── app.ts
│   ├── app.json
│   ├── app.wxss
│   ├── project.config.json
│   ├── tsconfig.json
│   ├── package.json
│   ├── pages/
│   │   ├── calendar/{index.ts,index.json,index.wxml,index.wxss}
│   │   ├── discover/
│   │   ├── profile/
│   │   ├── interests/
│   │   ├── themes/
│   │   ├── day-detail/
│   │   ├── note-editor/
│   │   ├── share-card/
│   │   └── share-landing/
│   ├── components/{calendar-grid,interest-card,theme-preview}/
│   ├── services/{request,calendar,interests,share}.ts
│   ├── stores/{preferences,events}.ts
│   ├── themes/{tokens,apply}.ts
│   ├── utils/{date,storage}.ts
│   ├── mock/{contents,modules}.ts
│   └── assets/icons/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/youdian/calendar/
│       │   ├── CalendarApplication.java
│       │   ├── common/
│       │   └── modules/{auth,user,calendar,preference,content,event,share}/
│       ├── main/resources/{application.yml,db/migration/}
│       └── test/
├── admin-web/                   # 运营后台后置，可先建 README
└── deploy/
    ├── compose.yaml
    └── nginx/
```

**注意**：目录中的 `{...}` 是结构说明，不代表真实的包含花括号的目录。所有被 `app.json` 注册的页面必须有真实对应文件。tabBar `iconPath` 必须指向真实存在的 PNG 文件；无法生成图标时改用合法可用的占位图标并注明，不可留死路径。

## 4. 技术栈与工程约定

| 层 | 方案 |
|---|---|
| 客户端 | 原生微信小程序、TypeScript、WXML/WXSS |
| CSS/组件 | 原生样式优先；可选 TDesign 微信小程序，确认兼容后再引入 |
| 后端 | Java 17、Spring Boot 3.x、Maven、REST API |
| 数据库 | MySQL 8.x、Flyway 数据库迁移 |
| 缓存 | Redis（开发环境可降级，不阻止客户端单机演示） |
| 测试 | TypeScript 工具函数单测、Java JUnit、接口集成测试 |
| 部署 | Docker Compose + Nginx + HTTPS |

**配置原则**：区分 `dev`、`test`、`prod`；`AppSecret`、数据库密码在环境变量或安全密钥管理中，仓库只提交 `.env.example`。微信小程序合法域名需在微信后台配置，正式请求使用 HTTPS，不能假设所有开发者都已配置域名。开发工具中本地请求限制的任何临时放开都不得当作正式上线方案。

## 5. 数据模型

至少实现：

1. `users(id, openid, created_at, updated_at)`；`openid` 唯一、不可返回给客户端作为鉴权凭据。
2. `user_preferences(user_id, theme_id, zodiac_sign, version, updated_at)`；`user_id` 唯一。
3. `interest_modules(code, name, description, sort_order, enabled, created_at)`；模块定义，如 `zodiac`, `almanac`, `music`, `film`, `quote`, `note`, `history`, `weather`。
4. `user_interests(user_id, module_code, enabled, sort_order, updated_at)`； `(user_id,module_code)` 唯一。
5. `daily_contents(id, date, module_code, variant_key, title, content_json, source_name, source_url, license_note, published, created_at)`； `(date,module_code,variant_key)` 唯一；源内容必须可追溯。
6. `user_events(id, user_id, event_date, title, content, kind, completed, created_at, updated_at)`；默认私有；接口必须按当前登录用户过滤。
7. `share_records(id, share_token, creator_user_id, date, template_id, public_payload_json, expires_at, created_at)`；`share_token` 使用密码学安全随机数、足够长且不可枚举。公开 payload 不得包含隐私字段。
8. `share_visits(id, share_record_id, occurred_at, visitor_hash, referrer_type)`；统计访问遵循最小化原则，不跨站追踪，不采集不必要的个人信息。

所有表使用合适的唯一索引和按用户/date 的查询索引；数据库结构通过版本化迁移创建，测试使用可重复的迁移和种子数据。

## 6. REST API 契约

统一前缀：`/api/v1`；成功结构一致 `{ "code": 0, "message": "ok", "data": ... }`，错误使用正确 HTTP 状态码，不返回堆栈或敏感配置。

| 方法 | 接口 | 权限 | 说明 |
|---|---|---|---|
| GET | `/calendar/month?year=2026&month=11` | 公开 | 月历日期/节气/农历基础信息 |
| GET | `/calendar/daily?date=2026-11-21` | 公开或登录 | 公共内容，登录后按偏好排序；个人事件独立请求 |
| GET | `/interests` | 公开 | 模块定义 |
| POST | `/auth/wechat/login` | 公开 | `wx.login` 的 code 交给后端换取会话并签发本系统令牌 |
| GET | `/users/me/preferences` | 登录 | 主题与星座 |
| PUT | `/users/me/preferences` | 登录 | 更新个人偏好 |
| GET | `/users/me/interests` | 登录 | 用户兴趣排序 |
| PUT | `/users/me/interests` | 登录 | 批量更新、去重和校验 |
| GET | `/events?date=...` | 登录 | 当前用户日程 |
| POST | `/events` | 登录 | 创建日程 |
| PUT | `/events/{id}` | 登录 | 仅限所有者 |
| DELETE | `/events/{id}` | 登录 | 仅限所有者 |
| POST | `/shares` | 登录或受控匿名 | 创建仅含公开数据的分享 |
| GET | `/shares/{token}` | 公开 | 打开公开分享 |

开发顺序：先由前端 `mock` 按上述数据形状提供数据，再实现后端并切换 `dev` 环境的 `baseURL`。不得为了「联通成功」绕过认证或默认展示他人的记录。

## 7. 数据内容与版权策略

- 公历/农历/节气：使用正确历法算法和测试用例。传统黄历宜忌与农历计算是不同数据，不要把自己推测的「宜/忌」当真实黄历。
- 星座：需要用户主动选择星座，固定文案可作为**娱乐演示**，明确标注；不可写「实时运势」而无实际数据来源。
- 名言：先用原创或明确可使用的短句，记录来源和授权说明，不能将不明出处的句子归于名人。
- 音乐/电影：第一版可显示「即将上线」，后续再接合法内容数据和平台链接；不抓取或盗用受版权保护的作品、海报、音频。
- 天气：用户同意后才使用位置相关功能；没有接口/权限时显示未配置，不编造温度。
- 分享：公开卡片只展示公开的日期、授权内容和主题；不包含私密备注、详细用户资料、生日等。

## 8. Codex 分阶段任务与验收标准

### P0 — 仓库初始化和验收基线
**交付**：项目目录、`README.md`、`.gitignore`、必要配置、`IMPLEMENTATION_STATUS.md`、说明如何导入微信开发者工具。

**验收**：真实文件存在；客户端可被微信开发者工具识别；无缺失图标/页面路径；不存在提交到仓库的密钥。

### P1 — 小程序离线可运行
**交付**：三 tab 页面，首页月份日历、跨月切换/返回今天、日期选择；静态/模拟兴趣卡片；兴趣多选和排序；四主题切换和持久化；本地备注创建编辑删除；日期详情；发现和我的页面。

**验收**：
- 2026-11-21 为星期六，2026-11-01 为星期日；2027-01 跨年切换正常。
- 选中 `night` 后关闭并重新进入仍为星空主题。
- 禁用音乐后首页不再出现音乐卡片；兴趣重排后首页顺序更新。
- 在 11 月 21 日创建备注，切到别的日期不显示该备注，返回仍能读取；删掉后正确消失。
- 加载/空内容/无网络均有友好界面，不崩溃。
- 客户端 TypeScript 的可运行检查、日期/偏好/存储相关自动化测试通过；微信模拟器可操作需实际验证，无法验证时明确说明。

### P2 — 后端与数据库
**交付**：Spring Boot 基础工程、Flyway SQL、上述 API、用户数据隔离、Java 单测/接口测试、MySQL/Redis 开发环境 Compose、配置示例。

**验收**：`mvn test`（或项目 Wrapper 等价命令）通过；接口按契约返回；任何用户无法获取或修改另一个用户的私有记录；Redis 不可用时非关键接口有可控退化；密码不出现在日志中。

### P3 — 前后端联通
**交付**：登录态管理、兴趣配置同步、用户日程云端存储、每日内容服务、缓存策略、异常重试及本地数据迁移说明。

**验收**：刷新后读取服务端已保存的兴趣和备注；未登录用户仍能浏览公共日历；登录后只看到自己的数据；网络断开时提示明确且不静默丢数据。

### P4 — 微信分享与海报
**交付**：分享预览、分享记录创建、带 token 的公开落地页、`onShareAppMessage`/`onShareTimeline`（按实际微信能力验证）、Canvas 海报生成、合法小程序码的后端生成流程及开发替代方案、分享统计。

**验收**：无效 token 不泄密；打开分享不要求强制转发；好友仅看到公开卡片；海报能保存到相册（必要权限按需申请）；分享访问数据没有混入私人日程；真实微信分享需要真机验证并记录结果。

### P5 — 质量、合规、上线文档
**交付**：使用指南、部署脚本、数据库备份/恢复说明、基础监控/日志策略、隐私与数据删除功能、审核提交清单、测试记录。

**验收**：项目存在明确的本地运行及生产配置步骤；测试说明完整；未获用户批准不能自行上线、购买服务、接入付费 API 或提交审核。

### 阶段完成的标准
每阶段 Codex 必须：
1. 列出真实创建/修改文件；
2. 列出执行的命令和结果（无工具能力时如实说明）；
3. 修复可复现错误；
4. 更新 `IMPLEMENTATION_STATUS.md`；
5. 继续下一个无阻塞且无破坏性阶段，不必每创建一个文件就询问用户。

## 9. 优先实现的数据结构（TypeScript）

```typescript
export type InterestCode =
  | 'zodiac' | 'almanac' | 'music' | 'film'
  | 'quote' | 'note' | 'history' | 'weather';

export type ThemeId = 'cream' | 'ink' | 'night' | 'mint';

export interface UserPreferences {
  themeId: ThemeId;
  zodiacSign?: string;
  selectedInterests: InterestCode[]; // 顺序即首页显示顺序
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD, 本地日期字符串
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  lunarLabel?: string;
  solarTerm?: string;
}

export interface UserEvent {
  id: string;
  date: string;
  title: string;
  content: string;
  completed: boolean;
}

export interface DailyContent {
  code: InterestCode;
  title: string;
  payload: Record<string, unknown>;
  isDemo: boolean;
  sourceName?: string;
}
```

请将日期计算与 UI 解耦；不要用 `new Date('YYYY-MM-DD')` 作为唯一日期解析机制，因为不同时区解释可能出现偏差。建议对年月日显式解析并测试跨月、闰年、星期及时区边界。

## 10. 文档与实际运行命令

Codex 必须在 README 中给出**真实适用的**命令，不得虚构已安装环境。预期运行方式：

```bash
# 进入微信小程序目录并安装依赖（如果项目使用 npm）
cd miniprogram
npm install
npm run typecheck
npm test

# 进入后端目录
cd ../backend
mvn test

# 进入项目根目录，启动开发环境数据库与缓存
cd ..
docker compose -f deploy/compose.yaml up -d
```

如果实际项目没有某个脚本，**先创建对应脚本并使其有效**；如果 Java/npm/Docker/微信开发者工具未安装，明确列出必要版本与配置，不得假称执行成功。

微信开发者工具中打开 `miniprogram/` 所在项目（根据实际 `project.config.json` 根目录配置），填入用户自己的小程序 AppID；无法提供 AppID 时使用开发工具支持的测试模式（如适用）验证界面，涉及登录和小程序码的功能需真实 AppID。

## 11. 启动指令（复制到 Codex）

> 请先阅读工作区根目录的 `AGENTS.md` 和 `CODEX_DEVELOPMENT_PLAN.md`，将其作为本项目开发规范和唯一需求基线。先扫描现有文件，不要覆盖已有成果。然后从 P0 开始，依次执行 P1、P2、P3、P4、P5。每个阶段实际创建和修改源代码、运行可运行的测试与编译检查、修复发现的问题，并更新 `IMPLEMENTATION_STATUS.md`。遇到缺失的 AppID/密钥/云资源时使用明确的开发模式和 mock，不要停掉其余可执行工作；不要虚构接口结果，不要在没有授权的情况下部署生产或执行付费操作。优先保证 P1 的小程序在微信开发者工具中可导入并正常运行。请先简述现有仓库情况与第一阶段工作计划，然后直接动手创建文件。

## 12. 交付验收清单（总体）

- [ ] 三个 tab 页面可以打开、切换
- [ ] 月历日期正确，跨月跨年可用
- [ ] 日期选择后加载对应日期内容
- [ ] 兴趣开关、排序本地可持久化
- [ ] 四套主题一键切换并持久化
- [ ] 备注可创建、编辑、删除且按日期隔离
- [ ] 真实微信小程序开发者工具导入说明齐全
- [ ] Spring Boot 后端启动与自动化测试通过
- [ ] MySQL 数据表由迁移创建，用户权限隔离
- [ ] 客户端可接后端，匿名公共内容和登录私人内容分离
- [ ] 微信好友分享和海报开发完成，真实设备测试记录明确
- [ ] 无效分享链接不暴露个人信息
- [ ] 私密备注不会进入公开分享
- [ ] 隐私、举报、反馈、数据删除及上线清单齐全
- [ ] README、API 文档、部署文档和进度文件齐全
