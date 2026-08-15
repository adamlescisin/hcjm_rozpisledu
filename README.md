# HC Junior Mělník — Rozvrh ledu

Systém pro správu a prezentaci rozpisu ledové plochy ZS Mělník.

## Tech stack

- **Next.js 16** (App Router) + TypeScript
- **Supabase** (PostgreSQL + Auth)
- **Prisma 7** (ORM, driver adapter pg)
- **Tailwind CSS v4**
- **Vercel** (deployment)

## Nastavení lokálního vývoje

### 1. Klonování a závislosti

```bash
git clone https://github.com/adamlescisin/hcjm_rozpisledu.git
cd hcjm_rozpisledu
npm install
```

### 2. Proměnné prostředí

Zkopírujte `.env.example` do `.env` a vyplňte hodnoty ze svého Supabase projektu:

```bash
cp .env.example .env
```

Hodnoty najdete v Supabase Dashboard → Project Settings → API:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public klíč
- `SUPABASE_SERVICE_ROLE_KEY` — service_role klíč
- `DATABASE_URL` — Connection string (Settings → Database → Connection string → URI, **Transaction pooler** pro Vercel)
- `DIRECT_URL` — Direct connection (pro migrace, **Session pooler** nebo Direct)

### 3. Migrace databáze

```bash
npm run db:push       # Push schema (development)
# nebo
npm run db:migrate    # Migrace (produkce)
```

### 4. Seed dat

```bash
npm run db:seed
```

Vytvoří:
- Místo konání: ZS Mělník
- Kategorie: Trénink hokej, Zápas hokej, Trénink krasobruslení, Veřejné bruslení, Úprava ledu
- Výchozí nastavení vzhledu

### 5. Spuštění

```bash
npm run dev
```

Aplikace běží na `http://localhost:3000`.

## Struktura projektu

```
src/
├── app/
│   ├── page.tsx              — Veřejný rozpis (iframe-friendly)
│   ├── admin/                — Admin rozhraní (chráněno Supabase Auth)
│   │   ├── page.tsx          — Dashboard
│   │   ├── events/           — Správa událostí
│   │   ├── categories/       — Správa kategorií
│   │   ├── price-rules/      — Cenová pravidla
│   │   └── theme/            — Nastavení vzhledu
│   └── api/                  — API routes
├── components/
│   ├── schedule/             — Veřejné komponenty (den/týden/měsíc view)
│   └── admin/                — Admin komponenty
├── lib/
│   ├── prisma.ts             — Prisma client
│   ├── supabase/             — Supabase client (server + browser)
│   ├── recurrence.ts         — Engine pro opakující se události
│   ├── validations.ts        — Zod schémata
│   └── utils.ts              — Utility funkce
prisma/
├── schema.prisma             — Datový model
└── seed.ts                   — Seed data
```

## Admin přihlášení

Přejděte na `/admin/login`. Vytvoření admin uživatele:

1. V Supabase Dashboard → Authentication → Users → Invite user
2. Zadejte e-mail admina
3. Admin si nastaví heslo přes e-mailový odkaz

## Iframe integrace do WordPressu

Na stránce WP vložte:

```html
<iframe 
  id="hcjm-rozpis"
  src="https://rozpisledu.hcjuniormelnik.cz" 
  style="width:100%;border:none;display:block;"
  scrolling="no"
></iframe>

<script>
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'hcjm-resize') {
    document.getElementById('hcjm-rozpis').style.height = e.data.height + 'px';
  }
});
</script>
```

## Deployment na Vercel

1. Importujte repozitář v Vercel Dashboard
2. Nastavte environment variables (stejné jako `.env`)
3. Deploy

DNS: CNAME `rozpisledu` → `cname.vercel-dns.com` (nastavit přes Cloudflare)
