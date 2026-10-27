<p align="center">
  <img src="public/favicon.svg" alt="Open Resume" width="88" height="88">
</p>

<h1 align="center">Open Resume</h1>

<p align="center">开源简历制作工具。模板全部开放，导出免费，数据自己掌握。</p>

<p align="center">
  <a href="README.md">English</a> · 简体中文<br>
  <a href="#开始使用">自部署</a> · <a href="#功能">功能</a> · <a href="#演示">演示</a> · <a href="https://justcv.org">在线版</a> · <a href="LICENSE">MIT 许可证</a>
</p>

**不要为你不常用的功能持续付费。** 简历通常只在需要时修改。Open Resume 免费开源，全部模板开放，简历数量不限，导出没有付费门槛或水印。自己部署，随时使用，数据由自己掌握。

**不想折腾部署？** 可以付费使用 **[justcv.org 在线版](https://justcv.org)**，省去部署和维护，也支持项目继续开发。需要方便时选择托管，想自己掌握时就使用开源版。

![Open Resume — 英文编辑器与简历实时预览](docs/images/editor.png)

## 功能

- **156 款模板，全部开放** — 浏览、筛选、预览和切换样式，无需解锁会员。
- **专注内容的编辑器** — A4 实时预览、自动保存、撤销重做、照片、模块排序、字体和主题色。
- **简历数量不限，导出免费** — 支持 PDF、PNG 和 JSON 备份，无水印。
- **查找和管理简历** — 按标题、姓名或目标职位搜索，按更新时间或标题排序，直接在工作空间重命名或复制。
- **本地简历检查** — 检查内容、联系方式和日期范围，并跳转到对应编辑位置。完全在浏览器中运行，无需 API Key。
- **历史版本** — 自动保留检查点，为当前编辑内容保存命名快照，比较内容与样式，并恢复为新副本。
- **导入已有简历** — 在本机读取文字版 PDF、DOCX、TXT、Markdown 或粘贴的文本，检查后导入为新简历；JSON 备份可恢复内容与样式。
- **本地岗位匹配** — 将岗位描述与简历可见内容对照，补充自选关键词并定位匹配证据，无需 API Key。
- **七种界面语言** — 英语、简体中文、繁体中文、日语、韩语、法语和俄语。
- **自己的工作空间** — 本地 SQLite 存储、服务端会话、内置字体，不带分析追踪或遥测。
- **可选 AI 岗位优化** — 自带 API Key，根据职位描述生成新副本。应用不设每日次数或冷却限制；服务商费用及限制由使用者承担。
- **容易部署，也容易修改** — 支持 Docker 或 Node.js 24+，前后端均为严格检查的 TypeScript，无需云数据库、OAuth 或支付配置。

![Open Resume — 英文模板库](docs/images/templates.png)

## 演示

选择模板、修改内容、调整样式，再导出自己的简历。

[![Open Resume — 英文操作演示](docs/images/demo.gif)](https://github.com/AniChikage/open-resume/raw/refs/heads/main/docs/media/open-resume-demo.mp4)

**[下载 30 秒演示短视频（MP4）](https://github.com/AniChikage/open-resume/raw/refs/heads/main/docs/media/open-resume-demo.mp4)** · [文字步骤](docs/media/README.md)

截图和演示均来自实际运行的应用，使用虚构的英文示例资料。

## 开始使用

以下命令固定使用首个稳定版本 [v1.0.0](https://github.com/AniChikage/open-resume/releases/tag/v1.0.0)，版本记录见 [CHANGELOG.md](CHANGELOG.md)。

### Docker

```sh
git clone --branch v1.0.0 --depth 1 https://github.com/AniChikage/open-resume.git
cd open-resume
docker compose up -d --build
```

打开 **[http://localhost:3000](http://localhost:3000)**，使用 **`admin` / `admin`** 登录，测试账号已自动填写。

数据保存在命名卷 `resumes` 中，容器重建后仍保留。停止用 `docker compose down`；加 `-v` 会删除数据卷。

### Node.js

需要 **Node.js 24 或以上**。

```sh
git clone --branch v1.0.0 --depth 1 https://github.com/AniChikage/open-resume.git
cd open-resume
npm ci
npm run build
npm start
```

打开 **[http://localhost:3000](http://localhost:3000)**，使用 **`admin` / `admin`** 登录。开发时运行 `npm run dev`，在同一个端口使用本地 API 和 Vite 热更新。

## 工作空间与数据

每个安装实例使用**一个共享工作空间**，共用账号的人可以访问同一批简历。如需替换公开的测试账号，将 `.env.example` 复制为 `.env`，同时设置以下两个值并重启：

```dotenv
LOCAL_USERNAME=yourname
LOCAL_PASSWORD=your-own-password
```

界面不会展示自定义密码。变更凭据后，旧会话失效。此版本不提供独立用户注册或租户隔离。

Node 模式默认把数据保存在 `.data/open-resume.sqlite`，可以通过 `DATA_DIR` 指定其他目录。备份时先停止应用，再复制整个数据目录，包含存在的 `-wal` 和 `-shm` 文件；Docker 模式停止服务后备份命名卷。删除数据前请先备份。

历史版本同样保存在 SQLite 中。每份简历保留初始版本、最近 20 个自动版本和 30 个手动快照；一分钟内的自动修改会合并。命名快照可包含当前尚未保存的编辑内容。恢复前可以比较内容与样式，恢复后生成新简历，原简历保留。

导入在本机解析文件，检查识别字段和可编辑原文后，才将新简历保存到工作空间。原有排版、照片和日期可能需要调整。扫描 PDF 和图片不提供内置 OCR，请先提取文字或手动粘贴。

岗位匹配将岗位描述和自选关键词保存在当前浏览器中，与对应简历关联。结果表示关键词覆盖情况，不是 ATS 评分或录用预测。也可将岗位描述带入可选 AI 优化，向配置的服务商发送内容前仍需同意。

通过 `PORT` 修改端口。服务端和 Compose 端口默认仅绑定本机；局域网访问可设置 `HOST=0.0.0.0`。公网部署请使用自己的账号、HTTPS 反向代理和 `SECURE_COOKIE=true`。

分享链接将简历内容编码在 URL 片段中，无需第三方存储。接收者需要能访问你的部署地址，上传的头像不会自动包含在分享中。分享快照支持最多 1 MiB 的未压缩内容；更大的简历请导出 PDF 或 JSON 备份。

## 可选 AI 岗位优化

不配置 AI 也能正常编辑、保存和导出。如需启用岗位优化，在 `.env` 中配置兼容 Chat Completions 的服务并重启：

```dotenv
AI_API_KEY=your-own-key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=your-provider-model-id
```

选择支持 `response_format: json_object` 的模型。Key 仅保存在服务端，不要添加 `VITE_` 前缀。API 使用由服务商计费，项目不附带免费模型额度。

点击同意后才会发送简历正文和职位描述；联系方式、照片和隐藏模块不会发送，正文中的隐私请自行移除。逐条检查建议后另存为新副本，原简历保留。职位描述和未接受的建议不写入数据库。

## 开发

```sh
npm run dev          # 本地 API 与前端热更新
npm run typecheck    # 严格 TypeScript 类型检查
npm test             # 独立 HTTP、持久化和文档测试
npm run build        # 类型检查与生产构建
```

Node.js 24 直接运行服务端 `.ts` 文件，浏览器代码由 Vite 构建。共享类型位于 `src/types.ts`，外部 JSON 校验位于 `src/lib/validation.ts`。GitHub Actions 和 Docker 构建也执行测试与类型检查。AI 测试使用模拟提供商，不消耗真实额度。

已验证行为和适用范围见[验收记录](docs/verification.md)及 [Docker 验收](docs/docker-acceptance.md)。欢迎在 [Issues](https://github.com/AniChikage/open-resume/issues) 反馈问题，或提交文档改进和范围明确的 PR。

## 许可证

[MIT](LICENSE) — 允许使用、修改、分发和商业使用。第三方字体与依赖保留各自许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
