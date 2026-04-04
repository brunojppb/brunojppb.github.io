#!/usr/bin/env bash
set -euo pipefail

# Install Rust if not available (e.g. on Cloudflare Pages)
if ! command -v cargo &> /dev/null; then
  echo "Installing Rust..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi

# Install maudit-cli if not available
if ! command -v maudit &> /dev/null; then
  echo "Installing maudit-cli..."
  cargo install maudit-cli
fi

# Build the site
maudit build
