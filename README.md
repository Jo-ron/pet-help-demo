# 邻里宠帮 · 静态网页 Demo 与本机 API

社区养宠互助平台校园实践项目。页面仍是静态 HTML；仓库附带 Node.js + SQLite 本机 API，前端已实现 API 联调模式——从 `127.0.0.1:8080` 打开（或带 `?api`）自动调用 API 并把数据写入 SQLite；直接打开 HTML 或从其他端口访问则进入本机演示模式，使用浏览器 `localStorage`。

## 文件结构

```
pet-help-demo/
├── index.html              首页（轮播公告 + 四大入口）
├── login.html              本机演示身份入口（不连接微信）
├── publish.html            发布类型选择
├── find-pet.html           寻宠列表
├── find-detail.html        寻宠详情
├── publish-find.html       寻宠发布
├── help-list.html          邻里寄养互助列表
├── publish-help.html       互助需求发布
├── goods-list.html         二手闲置列表（含分类筛选）
├── publish-goods.html      二手商品发布
├── goods-detail.html       商品详情
├── mine.html               个人中心
├── favorites.html         我的收藏
├── css/
│   └── app.css             主题、轮播、提示条、占位图
├── js/
│   └── app.js              本机演示状态、表单、收藏、举报、风控流程和提示
├── server/
│   ├── index.mjs           Node.js HTTP API 与 SQLite 数据访问
│   └── seed.mjs            空库演示种子数据
├── tests/
│   ├── api.test.mjs        后端 API 集成测试
│   └── seed.test.mjs       种子数据幂等测试
├── package.json            启动与测试命令（无第三方运行依赖）
├── .env.example            本机配置模板
├── .gitignore
└── README.md
```

## 启动 API

需要 Node.js 22.13 或更高版本。项目使用 Node 内置 SQLite，不需要安装 npm 依赖。

1. 复制 `.env.example` 为 `.env`，本地维护者接口请将 `PET_HELP_ADMIN_TOKEN` 改成随机长字符串。
2. 在项目目录执行：

```bash
npm start
```

浏览器访问 `http://127.0.0.1:8080/` 由同一服务打开静态页面并自动进入 API 联调模式；健康检查为 `http://127.0.0.1:8080/api/v1/health`。默认 SQLite 文件为 `.data/pet-help.sqlite`，目录会自动创建；数据库为空时会自动注入演示种子数据（寻宠 3 / 互助 3 / 闲置 6）。

开发时可运行 `npm run dev`；运行集成测试使用 `npm test`。

## API 概览

开发环境默认启用 `POST /api/v1/auth/demo`，返回 Bearer token；设置 `NODE_ENV=production` 后禁用。真实微信登录通过 `POST /api/v1/auth/wechat` 接入，需配置 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`，未配置时接口返回 `503 wechat_auth_unconfigured`。

公开读取：

- `GET /api/v1/health`
- `GET /api/v1/posts/find|help|goods?limit=20&offset=0`
- `GET /api/v1/posts/{type}/{post_id}`

需要用户 Bearer token：

- `POST /api/v1/posts/{type}`：创建寻宠/互助/商品帖子；联系方式为必填，但不会出现在公开列表/详情响应。
- `PATCH /api/v1/posts/{type}/{post_id}`：所有者更新帖子状态；删除/寻回/下架支持 24 小时内恢复，过期帖子不可恢复。
- `PUT|DELETE /api/v1/favorites/{type}/{post_id}`、`GET /api/v1/me/favorites`、`GET /api/v1/me/posts`
- `POST /api/v1/posts/{type}/{post_id}/contact`：确认用途后获取 30 秒、一次性联系凭证；`POST /api/v1/contact-tickets/redeem` 兑换号码。不要记录或缓存兑换结果。
- `POST /api/v1/posts/{type}/{post_id}/reports`
- `POST /api/v1/events`：允许列表内的匿名/登录事件，拒绝手机号等敏感属性，并按 `event_id` 去重。

维护者接口同时要求用户 Bearer token 和 `X-Admin-Token: <PET_HELP_ADMIN_TOKEN>`：

- `GET /api/v1/admin/reports?status=pending`
- `PATCH /api/v1/admin/reports/{report_id}`：处理举报并可下架帖子。
- `POST /api/v1/admin/users/restrictions`：警告、限制发布、封禁或解除限制。

接口请求/响应字段以 [PRD-v1.1.md](PRD-v1.1.md) 和 `server/index.mjs` 为准。API 使用同源请求；当前默认只监听 `127.0.0.1`。

## 当前边界

- 前端已实现 API 联调模式：从 `127.0.0.1:8080` 打开（或带 `?api`）时数据经 API 写入 SQLite；直接打开 HTML 或其他端口访问时，数据仍来自浏览器 `localStorage`，不会写入 SQLite。空库会自动注入演示种子数据。
- 本项目适用于本机/校园实践验证，不是生产部署方案。默认没有 HTTPS、真实维护者后台、图片上传、备份或运行监控；不要在公网暴露维护者 token 或接收真实个人信息。
- 微信登录需真实小程序配置；开发演示身份不等同于微信授权，且未在微信环境验证。
- 联系接口只在经过鉴权与频控后发放一次性短时凭证，兑换时返回联系方式；API 模式兑换后调起系统拨号（`tel:`），不显示、持久化或记录号码。
- API 模式上报的 `post_list_view`、`post_detail_view` 尚未加入服务端事件允许清单，会被 400 拒绝（见 PRD 8.4）。

## 静态页面预览（本机演示模式）

以下方式打开的是本机演示模式：数据保存在浏览器 `localStorage`，不写入 SQLite。需要真实持久化时请改用 `npm start` 并从 `http://127.0.0.1:8080/` 打开。

任选一种方式：

1. **直接打开**  
   用浏览器打开 `index.html`。若部分浏览器限制本地脚本，请改用下面的本地服务。

2. **VS Code / Cursor Live Server**  
   安装 Live Server 后，右键 `index.html` → Open with Live Server。

3. **Python 本地服务**（在项目根目录执行，使用与 API 不同的端口）

```bash
python -m http.server 8081
```

浏览器访问：http://127.0.0.1:8081/

4. **Node.js**

```bash
npx --yes serve . -l 8081
```

手机预览：电脑与手机同一局域网，用电脑局域网 IP 加端口访问，例如 `http://192.168.1.8:8080/`。

## 技术说明

- HTML + Tailwind CSS（CDN）+ 原生 JavaScript
- 配色：奶油底、薄荷绿、珊瑚橙，浅色宠物主题
- 图片均为占位框，不依赖真实素材
- 登录：API 模式调用 `POST /api/v1/auth/demo` 创建开发账号（token 存 sessionStorage）；本机演示模式创建本机身份；均不连接微信
- 发布、收藏、举报、状态变更、联系与埋点事件：API 模式下经 REST API 写入 SQLite；本机演示模式下仅保存在当前浏览器
- 联系方式：API 模式下随帖写入服务端私有字段，仅经一次性凭证兑换后调起系统拨号（`tel:`），不显示或持久化号码；本机演示模式不保存、不拨号
- 关键词过滤、重复发布、帖子过期和举报处置：API 模式由服务端执行并落库；本机演示模式为前端模拟，不能替代真实审核
- 空库自动注入演示种子数据（寻宠 3 / 互助 3 / 闲置 6），使用合成联系方式
- 演示时请勿填写真实手机号、精确住址或其他个人信息
