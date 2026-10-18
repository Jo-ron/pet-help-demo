# 邻里宠帮 · 静态网页 Demo

社区养宠互助平台作品集演示，纯前端静态页面，无后端服务。部分交互状态保存在当前浏览器的 `localStorage`，不代表服务端持久化或真实用户数据。

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
└── README.md
```

## 本地预览

任选一种方式：

1. **直接打开**  
   用浏览器打开 `index.html`。若部分浏览器限制本地脚本，请改用下面的本地服务。

2. **VS Code / Cursor Live Server**  
   安装 Live Server 后，右键 `index.html` → Open with Live Server。

3. **Python 本地服务**（在项目根目录执行）

```bash
python -m http.server 8080
```

浏览器访问：http://127.0.0.1:8080/

4. **Node.js**

```bash
npx --yes serve .
```

手机预览：电脑与手机同一局域网，用电脑局域网 IP 加端口访问，例如 `http://192.168.1.8:8080/`。

## 技术说明

- HTML + Tailwind CSS（CDN）+ 原生 JavaScript
- 配色：奶油底、薄荷绿、珊瑚橙，浅色宠物主题
- 图片均为占位框，不依赖真实素材
- 登录仅创建本机演示身份，不进行微信授权或账号鉴权
- 发布、收藏、举报、状态变更、联系次数及埋点事件仅保存在当前浏览器；清理站点数据会清除
- 联系方式字段仅用于演示表单校验，不保存号码；联系按钮不会显示号码或拨打电话
- 关键词过滤、重复发布提醒、帖子过期和举报处置均为前端模拟，不能替代服务端校验、权限控制或人工审核
- 演示时请勿填写真实手机号、精确住址或其他个人信息
