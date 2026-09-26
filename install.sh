#!/bin/sh
# Engly installer: installs the `engly` CLI globally without cloning the repository.
#
#   sh -c "$(curl -fsSL https://raw.githubusercontent.com/victorcastro/engly/main/install.sh)"
#
# It downloads the source, builds it in a temporary folder and installs it with npm.
#
# Environment variables:
#   ENGLY_REF      Branch, tag or commit to install (default: main).
#   ENGLY_TARBALL  Source tarball URL (default: the GitHub tarball for ENGLY_REF).

set -eu

# Everything runs inside main so a truncated download never runs half a script.
main() {
  ENGLY_REF="${ENGLY_REF:-main}"
  ENGLY_TARBALL="${ENGLY_TARBALL:-https://codeload.github.com/victorcastro/engly/tar.gz/$ENGLY_REF}"
  MIN_NODE="22.12.0"

  say() { printf '%s\n' "$*"; }
  fail() {
    printf 'engly: %s\n' "$*" >&2
    exit 1
  }
  need() {
    command -v "$1" >/dev/null 2>&1 || fail "$1 is required. $2"
  }

  need node "Install Node.js $MIN_NODE or later: https://nodejs.org"
  need npm "It usually comes with Node.js: https://nodejs.org"
  need tar "Install tar and try again."

  node_version="$(node -p 'process.versions.node')"
  if ! node -e '
    const [a, b] = process.argv.slice(1).map((v) => v.split(".").map(Number));
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) process.exit(a[i] > b[i] ? 0 : 1);
  ' "$node_version" "$MIN_NODE"; then
    fail "Node.js $MIN_NODE or later is required, found $node_version."
  fi

  tmp="$(mktemp -d 2>/dev/null || mktemp -d -t engly)"
  trap 'rm -rf "$tmp"' EXIT INT TERM

  say "🗣️  Downloading Engly ($ENGLY_REF)..."
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$ENGLY_TARBALL" -o "$tmp/source.tar.gz" || fail "Could not download $ENGLY_TARBALL"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$tmp/source.tar.gz" "$ENGLY_TARBALL" || fail "Could not download $ENGLY_TARBALL"
  else
    fail "curl or wget is required."
  fi

  mkdir "$tmp/src"
  tar -xzf "$tmp/source.tar.gz" -C "$tmp/src" --strip-components=1

  say "🔨 Building..."
  (
    cd "$tmp/src"
    npm ci --no-audit --no-fund --loglevel=error >/dev/null
    npm run build --silent >/dev/null
    npm pack --silent --pack-destination "$tmp" >/dev/null
  ) || fail "The build failed. Run it again, or report it at https://github.com/victorcastro/engly/issues"

  say "📦 Installing..."
  set -- "$tmp"/engly-*.tgz
  npm install --global --no-audit --no-fund --loglevel=error "$1" >/dev/null ||
    fail "npm install failed. For permission errors, see https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally"

  say ""
  if command -v engly >/dev/null 2>&1; then
    say "✅ Engly $(engly --version) is installed."
    say "   Next: cd your-project && engly init"
  else
    say "✅ Engly is installed, but 'engly' is not on your PATH."
    say "   Add $(npm prefix --global)/bin to your PATH, then run: engly init"
  fi
}

main "$@"
