# Личный кабинет: подключение Supabase (один раз, бесплатно)

1. Зайти на supabase.com → Sign in → **New project** (любое имя, регион поближе, пароль базы сохранить).
2. Слева **SQL Editor → New query**, вставить содержимое `tools/supabase.sql`, нажать **Run**.
3. **Authentication → Sign In / Providers → Email**: для личного пользования выключить **Confirm email** (иначе будет требоваться подтверждение письмом).
4. **Authentication → URL Configuration**: в **Site URL** вписать адрес сайта (`https://elijahflanagan48-hue.github.io/scriptorium/`).
5. **Project Settings → API**: скопировать **Project URL** и ключ **anon / public**. Секретный ключ (`service_role`) никому не присылать и никуда не вставлять.
6. Адрес и публичный ключ вписать в `config.js`:

   window.SCRIPT_CFG={url:'https://xxxx.supabase.co',key:'eyJ...'};

Публичный ключ безопасен: доступ к данным ограничен правилами строк (RLS) из `supabase.sql`, каждый видит только свою строку.
