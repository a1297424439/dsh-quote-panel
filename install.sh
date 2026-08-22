#!/usr/bin/env bash
# ============================================================
# dsh-quote-panel 安装脚本（幂等，可重复执行）
#   用法: bash install.sh
#   可选环境变量:
#     DSH_PROFILE_DIR   web profile 目录，默认 $HOME/.dsh/profiles/web
#     DSH_PLUGIN_DIR    插件安装目录，默认 $HOME/dsh-plugin-download
# ============================================================
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_SRC="$HERE"

PROFILE_DIR="${DSH_PROFILE_DIR:-$HOME/.dsh/profiles/web}"
PLUGIN_PARENT="${DSH_PLUGIN_DIR:-$HOME/dsh-plugin-download}"
INSTALL_DIR="$PLUGIN_PARENT/dsh-quote-panel"
PKG_JSON="$PROFILE_DIR/package.json"

if [ ! -f "$PLUGIN_SRC/package.json" ]; then
  echo "错误: 找不到插件源码 $PLUGIN_SRC （请从仓库根目录运行 install.sh）" >&2
  exit 1
fi
if [ ! -f "$PKG_JSON" ]; then
  echo "错误: 找不到 $PKG_JSON" >&2
  echo "  请确认 DSH 装在当前用户下；若 profile 在别处，用 DSH_PROFILE_DIR=/实际路径 bash install.sh" >&2
  exit 1
fi

echo "[1/4] 复制插件 -> $INSTALL_DIR"
mkdir -p "$PLUGIN_PARENT"
rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
# 复制源码（跳过 .git 与打包产物）
cp -r "$PLUGIN_SRC"/lib "$INSTALL_DIR"/
cp -r "$PLUGIN_SRC"/docs "$INSTALL_DIR"/ 2>/dev/null || true
cp "$PLUGIN_SRC"/package.json "$PLUGIN_SRC"/cordis.patch.yml "$PLUGIN_SRC"/README.md "$PLUGIN_SRC"/README.en.md "$PLUGIN_SRC"/CHANGELOG.md "$PLUGIN_SRC"/LICENSE "$INSTALL_DIR"/ 2>/dev/null || true

echo "[2/4] 写入依赖与 bundle -> $PKG_JSON"
cp "$PKG_JSON" "$PKG_JSON.bak-quote-$(date +%Y%m%d%H%M%S)"
node - "$INSTALL_DIR" "$PKG_JSON" <<'NODE'
const fs = require('fs')
const [installDir, pkgPath] = process.argv.slice(2)
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
let changed = false
pkg.dependencies = pkg.dependencies || {}
if (pkg.dependencies['dsh-quote-panel'] !== 'link:' + installDir) {
  pkg.dependencies['dsh-quote-panel'] = 'link:' + installDir
  changed = true
}
pkg.dsh = pkg.dsh || {}
pkg.dsh.profile = pkg.dsh.profile || {}
pkg.dsh.profile.bundles = pkg.dsh.profile.bundles || []
if (!pkg.dsh.profile.bundles.includes('dsh-quote-panel')) {
  pkg.dsh.profile.bundles.push('dsh-quote-panel')
  changed = true
}
if (changed) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log('  已添加: dependencies + dsh.profile.bundles')
} else {
  console.log('  已存在，无需修改')
}
NODE

echo "[3/4] pnpm install（profile 目录）"
cd "$PROFILE_DIR"
run_pnpm_install() {
  if command -v corepack >/dev/null 2>&1; then
    corepack pnpm install --no-frozen-lockfile
  elif command -v pnpm >/dev/null 2>&1; then
    pnpm install --no-frozen-lockfile
  else
    echo "错误: 找不到 corepack/pnpm。DSH 一般自带 corepack，请检查 PATH。" >&2
    exit 1
  fi
}
LOG="$PROFILE_DIR/.pnpm-install-quote.log"
if run_pnpm_install 2>&1 | tee "$LOG"; then
  echo "  pnpm install 成功"
else
  if grep -qi "IGNORED_BUILDS\|ignored build scripts" "$LOG"; then
    # 依赖链接已完成；非零只是 pnpm 的构建脚本审批策略（与行情插件无关，本插件零依赖）
    echo "  [注意] pnpm 提示「未审批的构建脚本」并返回非零，但依赖已链接成功，插件可正常使用。"
    echo "  消除提示: corepack pnpm -C \"$PROFILE_DIR\" approve-builds"
  else
    echo "  pnpm install 失败，完整日志: $LOG" >&2
    exit 1
  fi
fi
rm -f "$LOG"

echo "[4/4] 安装完成。"
echo
echo "  下一步：重启 dsh web（在你的启动脚本目录执行 ./start-dsh.sh 或等价命令）。"
echo "  重启后打开 DSH 网页，会话顶栏右侧应出现「📈 行情」按钮。"
echo
echo "  验证取数（可选）: curl 'http://127.0.0.1:3080/dshq/quotes?market=cn&symbols=sh000001'"
echo "  卸载方法: 从 $PKG_JSON 移除 dsh-quote-panel 依赖与 bundle 条目后重新 pnpm install 并重启。"
