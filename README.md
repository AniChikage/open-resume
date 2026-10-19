# Open Resume

**免费、自部署的简历制作工具。全部模板开放，简历数量不限，导出免费。**

不想折腾部署？欢迎使用 **[justcv.org](https://justcv.org)** 在线版，支持项目继续维护。托管版按官网公布的方案提供服务；本项目的自部署功能不受托管版付费方案约束。

> 本项目源自 [AniChikage/justcv](https://github.com/AniChikage/justcv)，与 xitanggg/open-resume 没有从属关系。

## 一分钟启动

需要 **Node.js 24 或以上**，不需要数据库账号、Cloudflare、Google OAuth 或支付配置。

```bash
git clone https://github.com/AniChikage/open-resume.git
cd open-resume
npm ci
npm run build
npm start
```

打开 [http://localhost:3000](http://localhost:3000)。默认测试账号：**`admin` / `admin`**，登录框已自动填写。

开发模式：`npm run dev`，同样使用 3000 端口，并提供本地 API 和热更新。

## Docker 部署

克隆本仓库并进入 `open-resume` 目录后运行：

```bash
docker compose up -d --build
```

打开 [http://localhost:3000](http://localhost:3000)。SQLite 数据保存在命名卷 `resumes` 中，容器重建后仍保留。停止用 `docker compose down`；加 `-v` 会删除数据卷。

也可直接构建运行：

```bash
docker build -t open-resume .
docker run -d --name open-resume -p 127.0.0.1:3000:3000 -v open-resume-data:/data open-resume
```

## 包含什么

- 156 款简历模板，全部开放，无会员校验。
- 简历数量不限、编辑和自动保存、撤销重做、照片、模块排序、实时预览。
- PDF、PNG、Word（`.doc`）和 JSON 导出，无付费导出或水印。
- 英语、简体中文、繁体中文、日语、韩语、法语和俄语界面。
- 本地 SQLite 持久化和服务器端会话；一个安装实例使用一个共享工作空间。
- 可选的 AI 职位润色，自带 API Key，应用不设每日次数或冷却限制。
- 不带 Google Analytics、遥测、支付服务、生产数据库连接或远程登录依赖。字体随应用提供。

默认 `admin/admin` 适合本机使用。共用该账号的人可以访问同一批简历。如需给自己设置私密登录，把 `.env.example` 复制为 `.env` 并设置下面两个值，重启即可：

```dotenv
LOCAL_USERNAME=yourname
LOCAL_PASSWORD=your-own-password
```

自定义账号会替换默认测试账号，界面不会展示自定义密码。变更凭据后旧会话失效。此版本不提供多用户注册或租户隔离。

## 数据与备份

Node 模式默认将 SQLite 保存到项目的 `.data/open-resume.sqlite`，可以用 `DATA_DIR` 指向其他目录。`.data`、`.env` 和导出/测试产物都已加入 Git 忽略规则。

备份时先停止应用，再复制整个数据目录（包含存在的 `-wal`/`-shm` 文件）。恢复时把该目录放回 `DATA_DIR`。容器模式可在停止服务后备份命名卷。删除工作空间数据前请自行备份。

可通过 `PORT` 改端口；默认只监听 `127.0.0.1`。如需局域网访问，配置 `HOST=0.0.0.0`；Docker Compose 默认端口也只绑定本机。公网部署应改用自己的账号，配置 HTTPS 反向代理并设置 `SECURE_COOKIE=true`。每次 HTTP 请求的大小和 AI 输入长度有保护边界，不影响模板、简历数量和导出权限。

分享链接把简历内容编码在 URL 的片段中，无需第三方存储。其他人必须能访问你的部署地址才可打开；自部署站点不是公开托管服务。分享不会自动包含上传的头像。

## 可选 AI 润色

在 `.env` 中配置一个兼容 Chat Completions 的服务：

```dotenv
AI_API_KEY=your-own-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=your-provider-model-id
```

重启后即可使用编辑器中的职位润色功能。选择支持 `response_format: json_object` 的模型，模型 ID 以你的服务商为准。服务端保存 Key，不要添加 `VITE_` 前缀。未配置时，编辑、保存和导出照常可用，AI 对话框显示配置说明。

AI 服务商费用、余额和自身速率限制由部署者承担；应用不附带免费模型额度。点击同意后才会发送简历正文和职位描述；联系方式、照片和隐藏模块不会发送，但正文中的隐私需要自行移除。建议经过验证后再保存为新副本，原简历保留。岗位描述和未接受的建议不写入数据库。

## 开发与验证

```bash
npm test
npm run build
```

HTTP 测试使用独立临时数据库；AI 测试使用模拟提供商，不消费真实额度。实际验收情况见 [docs/verification.md](docs/verification.md)。

## License

应用代码采用 [MIT](LICENSE)，允许使用、修改、分发和商业使用。第三方字体及依赖保留各自许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

---

**A free, self-hosted resume builder.** All templates, unlimited resumes, and free exports. Run `npm ci && npm run build && npm start`, or `docker compose up -d --build`, then open http://localhost:3000 and sign in with **admin / admin**. Requires Node.js 24+. Data lives in local SQLite, and each installation has one shared workspace. Optional AI uses your own key and provider account. Prefer a hosted service? Visit **[justcv.org](https://justcv.org)** to support the project.
