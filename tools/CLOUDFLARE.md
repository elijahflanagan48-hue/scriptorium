# Личный кабинет: Cloudflare Worker + D1

База D1 `scriptorium` с таблицами уже создана. Остаётся поставить сервер (Worker):

1. dash.cloudflare.com → Workers & Pages → Create → Create Worker → имя `scriptorium-api` → Deploy.
2. Edit code → удалить всё, вставить содержимое `worker/worker.js` → Deploy.
3. Settings → Bindings → Add → D1 database → Variable name `DB`, база `scriptorium` → Deploy.
4. Settings → Variables and Secrets → Add → тип Secret, имя `JWT_SECRET`, значение — длинная случайная строка → Deploy.
5. Адрес воркера (`https://scriptorium-api.<ваш-поддомен>.workers.dev`) вписать в `config.js`: `window.SCRIPT_CFG={api:'https://…'};`

После создания своего аккаунта регистрацию можно закрыть: Variables → добавить `SIGNUP` = `closed`.
Пароли хранятся только в виде хэша PBKDF2. Восстановления пароля по почте нет: письма сервер не шлёт.
