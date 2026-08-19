# 发布说明（给发布 Agent 的操作指引）

本目录是 `dsh-quote-panel` 1.0.0 的完整开源源码。按下面步骤发布。

## 0. 发布前必须替换的占位符

| 文件 | 位置 | 替换为 |
|---|---|---|
| `package.json` | `repository.url` 中的 `<your-github-name>` | 你的 GitHub 用户名 |
| `package.json` | `author`（可选） | 你的名字 / 邮箱 |
| `README.md` / `README.zh-CN.md` | 引用的 `docs/screenshot.svg` | （可选）替换为真实面板截图 |

检查命令：`grep -rn "your-github-name" .`

## 1. 发布到 GitHub（推荐）

```bash
# 在仓库根目录（本目录）执行
git init -b main
git add -A
git commit -m "feat: dsh-quote-panel 1.0.0 — A-share & US real-time quote panel"
git branch -M main
git remote add origin git@github.com:<你的用户名>/dsh-quote-panel.git
git push -u origin main
```

发布后在 GitHub 仓库设置里：
- **Topics** 添加：`deepseek-harness`、`dsh-plugin`、`dsh`、`stock`、`kline`
- **License** 页面确认显示 MIT
- 可选：打 tag `v1.0.0`（`git tag v1.0.0 && git push --tags`），并勾选 "Create a release" 附上 `dsh-quote-panel-install.tar.gz` 安装包

## 2. 发布到 npm（可选）

```bash
npm login
npm publish --access public
```

> 注意：`files` 白名单已包含 `lib`、`cordis.patch.yml`、README×2、CHANGELOG、LICENSE，发布前可 `npm pack --dry-run` 核对内容。

## 3. 发布后自检

- 仓库首页 README 渲染正常（徽章、截图）
- 有用户想安装时，能按 README「Installation」章节的 link 方式安装

## 4. 仓库已知事项

- 数据源：腾讯财经免费公开接口（行情 `qt.gtimg.cn`、K线 `ifzq.gtimg.cn`），零 Key 零配置
- 美股无分时（腾讯免费接口不提供），README 已如实说明
- 无第三方运行时依赖，纯 JS（Node host + 浏览器 client）
