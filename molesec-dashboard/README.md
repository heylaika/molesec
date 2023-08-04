# Mole Security Dashboard

This is the front-end for Mole Security. It's built with:

- NextJS + TypeScript and MaterialUI
- Supabase (client) and Prisma (server)
- Auth0 for authentication
- Sentry for error handling and performance monitoring (optional)

## Running locally

Download the `.env` file from 1password. Alternatively, rename `.env.template` to `.env` and fill in all the environment variables.

Run the development server:

```bash
pnpm i
pnpm run dev
```

Browse to [http://localhost:3000](http://localhost:3000). 🎉

## Prisma types

To generate types from the prisma schema, run: `pnpm prisma generate`.

The Prisma types are used for SSR and API functions in conjunction with the Prisma client.
For front end code; use the Supabase types instead.

> 🙁 **Note:** Prisma types are not always compatible with Supabase types.
> You can use `reserialize` in `utils/json` to convert them.
> For this reason, prefer using the Supabase types for shared code.

## Supabase types

To generate the Supabase types, log in to Supabase with `pnpm supabase login`,
then run `pnpm supabase:gen-types` to have the types be automatically pulled from the database.

> **Note:** This will only work on POSIX-like systems,
> or systems where the [`source` (dot) command](<https://en.wikipedia.org/wiki/Dot_(command)>) is available.

The Supabase types are used in the front-end in conjunction with the Supabase client.
For back end code; use the Prisma types instead.

> 👍 **Note:** Supabase types are compatible with the prisma types.
> For this reason, prefer using the Supabase types for shared code.

> **Tip:** There are some additional type helpers in `src/util/supabase.ts`,
> since the generated types are monolithic, and type definitions become quite verbose.

## Database migrations

Run `pnpm prisma migrate dev` push your schema changes to Supabase, then regenerate the Supabase types.

> ☝ **Important:** The `01_patches`, `02_setup` and `02_teams` migrations contains "database essentials".
> If you're doing a full database reset (`prisma migrate reset` or similar),
> Leave these migrations and edit them if need be. For more info, see the migration scripts themselves.

You can add RLS policies for new entities using the `--create-only` flag:

```sh
pnpm prisma migrate dev --create-only --name $YOUR_MIGRATION_NAME
```

After that, you can add the RLS policies into the migration script, then run `pnpm prisma migrate dev` like usual.

> **Tip:** For a few example policies, see "03_teams" script in `prisma/migrations`.
