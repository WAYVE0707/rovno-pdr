# 07. Перенос на VPS (когда появится первый клиент)

Render free годится для показа и первых заявок, но у него две беды:
сервис засыпает через 15 минут (первый заход — 30–50 секунд) и диск эфемерный
(заявки и фото исчезают при перезапуске). Для боевого клиента нужен VPS.

Минимум: 1 ядро, 1 ГБ RAM, 10 ГБ SSD — хватает с запасом. Цена ~300 ₽/мес
(Timeweb, Aeza, Beget). ОС: Ubuntu 24.04.

## 1. Подготовка сервера

```bash
ssh root@<IP>
apt update && apt upgrade -y
apt install -y curl git caddy
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v   # v22.x
```

## 2. Код и сборка

```bash
mkdir -p /srv && cd /srv
git clone https://github.com/WAYVE0707/rovno-pdr.git
cd rovno-pdr
npm ci
npm run build          # tsc --noEmit + vite build → dist/
```

## 3. Переменные окружения

```bash
nano /srv/rovno-pdr/.env
```

```
PORT=8787
ADMIN_PASSWORD=<новый пароль, не тот, что на демо>
TOKEN_SECRET=<32 случайных символа>
TELEGRAM_BOT_TOKEN=<токен @BotFather>
TELEGRAM_CHAT_ID=<chat_id мастера>
PUBLIC_URL=https://<домен>
BOT_POLLING=1
```

`TOKEN_SECRET` можно сгенерировать: `openssl rand -hex 32`.

## 4. systemd

```bash
nano /etc/systemd/system/rovno.service
```

```ini
[Unit]
Description=Rovno PDR site
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/rovno-pdr
ExecStart=/usr/bin/node --env-file-if-exists=.env server/index.mjs
Restart=always
RestartSec=3
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Права на данные, иначе не запишет заявки:

```bash
mkdir -p /srv/rovno-pdr/data/photos
chown -R www-data:www-data /srv/rovno-pdr/data
systemctl daemon-reload
systemctl enable --now rovno
systemctl status rovno --no-pager
curl -s localhost:8787/api/health   # {"ok":true}
```

## 5. Домен и HTTPS (Caddy сам получит сертификат)

A-запись домена → IP сервера. Затем:

```bash
nano /etc/caddy/Caddyfile
```

```
pdr.example.ru {
    encode zstd gzip
    reverse_proxy 127.0.0.1:8787
}
```

```bash
systemctl reload caddy
```

Через минуту сайт открывается по `https://pdr.example.ru`.

## 6. Бэкап заявок

Заявки — это деньги клиента. Раз в сутки копия в архив:

```bash
cat > /etc/cron.daily/rovno-backup <<'EOF'
#!/bin/sh
cd /srv/rovno-pdr
tar czf /var/backups/rovno-$(date +%F).tar.gz data
find /var/backups -name 'rovno-*.tar.gz' -mtime +14 -delete
EOF
chmod +x /etc/cron.daily/rovno-backup
```

Восстановление: распаковать архив в `/srv/rovno-pdr/`, `chown -R www-data:www-data data`,
`systemctl restart rovno`.

## 7. Обновление версии

```bash
cd /srv/rovno-pdr
git pull
npm ci
npm run build
systemctl restart rovno
```

## 8. Чек-лист приёмки

- [ ] `https://<домен>` открывается, шрифты и фото на месте
- [ ] калькулятор считает вилку, фото загружается
- [ ] заявка приходит в Telegram с фото
- [ ] `/admin` пускает по паролю, заявка видна в списке
- [ ] бот отвечает на `/leads` и `/today`
- [ ] после `systemctl restart rovno` заявки на месте (диск постоянный)
- [ ] бэкап создаётся: `ls /var/backups/rovno-*`

## Важно

- `BOT_POLLING=1` должен быть только на одном сервере. Если локальная копия
  тоже опрашивает Telegram, обе получают `409 Conflict` и часть команд теряется.
- Демо на Render можно оставить как витрину для продаж, но заявки клиента — только на VPS.
