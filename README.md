# Cloudflare Pages 单页兑换站

这是一个原生 HTML/CSS/JavaScript 项目，包含一个参考站风格的落地页和一个极简后台。前台按钮会复制后台配置的客服 ID，后台通过 Cloudflare Pages Functions + KV 保存配置。

## 文件结构

- `public/index.html`：前台首页
- `public/admin.html`：后台配置页
- `public/admin/index.html`：后台 `/admin` 兼容入口
- `public/assets/styles.css`：前台样式
- `public/assets/main.js`：前台交互
- `public/assets/admin.css`：后台样式
- `public/assets/admin.js`：后台交互
- `public/images/`：Logo 等静态图片位置
- `functions/api/config.js`：Cloudflare Pages Functions API
- `wrangler.toml`：Cloudflare Pages 输出目录配置
- `.dev.vars.example`：本地环境变量示例

## 本地预览

推荐使用 Wrangler 预览 Cloudflare Pages Functions：

```bash
copy .dev.vars.example .dev.vars
```

把 `.dev.vars` 里的密码改成自己的后台密码：

```env
ADMIN_PASSWORD=your-admin-password
```

然后启动：

```bash
npm run dev
```

打开：

- 首页：`http://localhost:8788/`
- 后台：`http://localhost:8788/admin`

如果只是想快速本地看效果，也可以使用项目自带的零依赖模拟预览：

```bash
npm run preview:local
```

这个本地模拟预览的默认后台密码是 `admin123`，也可以启动前设置 `ADMIN_PASSWORD` 环境变量覆盖。

## Cloudflare Pages 部署

1. 在 Cloudflare 创建 Pages 项目，连接 Git 仓库或使用 Wrangler 上传。
2. 构建设置里将输出目录设置为 `public`；`wrangler.toml` 里也已经写好。
3. 创建 KV Namespace，例如 `SITE_CONFIG`。
4. 在 Pages 项目的 Settings → Functions → KV namespace bindings 里添加绑定：
   - Variable name：`SITE_CONFIG`
   - KV namespace：选择刚创建的 KV
5. 在 Pages 项目的 Settings → Environment variables 里添加：
   - `ADMIN_PASSWORD`：后台管理密码
6. 部署后访问：
   - 首页：`https://你的域名/`
   - 后台：`https://你的域名/admin`

KV 绑定建议直接在 Cloudflare Pages 网页后台配置，不要在 `wrangler.toml` 里保留示例 KV ID。占位 ID 会导致部署时报 `Invalid KV namespace ID`。

## 后台可配置项

- `customerServiceId`：客服 ID，前台按钮点击后复制这个值
- `contactUrl`：弹窗“联系客服”按钮跳转地址
- `downloadUrl`：顶部“泡泡下载”按钮跳转地址

## 验收方式

1. 打开首页，确认顶部导航、首屏、功能卡片、关于我们和页脚显示正常。
2. 点击“EG/CG币出售”或“账户报白”，确认出现“ID已复制！”弹窗。
3. 打开后台，输入 `ADMIN_PASSWORD`，修改客服 ID 并保存。
4. 刷新首页，再次点击按钮，确认弹窗中的客服 ID 已更新。
5. 在手机宽度下查看页面，确认没有横向滚动和文字遮挡。
