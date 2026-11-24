#!/usr/bin/env bash
# Установка сайта на чистый Ubuntu 22.04/24.04 одной командой.
# Запуск (от root):  bash install.sh ДОМЕН [BOT_TOKEN] [CHAT_ID] [ADMIN_PASSWORD]
# Пример:            bash install.sh vmyatiny-net.site 123456:AA... 1227620433 MojParol123
set -euo pipefail

DOMAIN="${1:?укажи домен: bash install.sh домен [bot_token] [chat_id] [пароль]}"
BOT_TOKEN="${2:-}"
CHAT_ID="${3:-}"
ADMIN_PASSWORD="${4:-$(head -c 12 /dev/urandom | base64 | tr -d '/+=' | head -c 12)}"
APP_DIR="/opt/rovno"
REPO="https://github.com/WAYVE0707/rovno-pdr.git"

say() { printf '\n\033[1;33m== %s\033[0m\n' "$*"; }

say "1/8 система и пакеты"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ca-certificates ufw >/dev/null

say "2/8 Node.js 22"
if ! command -v node >/dev/null || [ "$(node -v | cut -c2-3)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

say "3/8 Caddy (HTTPS сам)"
if ! command -v caddy >/dev/null; then
  apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq && apt-get install -y -qq caddy >/dev/null
fi
caddy version

say "4/8 код"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"

say "5/8 сборка"
npm ci --no-audit --no-fund
npm run build

say "6/8 настройки (.env)"
mkdir -p "$APP_DIR/data"
cat > "$APP_DIR/.env" <<ENV
PORT=8787
ADMIN_PASSWORD=$ADMIN_PASSWORD
TOKEN_SECRET=$(head -c 24 /dev/urandom | base64 | tr -d '/+=')
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
PUBLIC_URL=https://$DOMAIN
BOT_POLLING=1
ENV
chmod 600 "$APP_DIR/.env"

say "7/8 автозапуск"
cat > /etc/systemd/system/rovno.service <<UNIT
[Unit]
Description=ROVNO site
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node --env-file-if-exists=.env server/index.mjs
Restart=always
RestartSec=3
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now rovno >/dev/null
systemctl restart rovno

say "8/8 домен и HTTPS"
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAIN {
    encode gzip
    reverse_proxy 127.0.0.1:8787
}
CADDY
systemctl reload caddy || systemctl restart caddy

ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 80/tcp >/dev/null 2>&1 || true
ufw allow 443/tcp >/dev/null 2>&1 || true

sleep 3
say "проверка"
curl -fsS "http://127.0.0.1:8787/api/health" && echo
printf '\n\033[1;32mГотово.\033[0m Сайт: https://%s\n' "$DOMAIN"
printf 'Админка: https://%s/admin  пароль: %s\n' "$DOMAIN" "$ADMIN_PASSWORD"
printf 'Если HTTPS не открылся сразу — подожди 1–2 минуты, Caddy получает сертификат.\n'
printf 'Логи: journalctl -u rovno -n 50 --no-pager\n'
