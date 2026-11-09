-- Application tables. Better Auth creates and owns "user", "session",
-- "account" and "verification"; run `npm run db:migrate` to apply both.

-- What a signed-in shopper has kept. Stores the piece and finish only:
-- prices always come from src/lib/pricing.ts when the cart is priced.
CREATE TABLE IF NOT EXISTS saved_item (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  slug       TEXT NOT NULL,
  wood       TEXT NOT NULL DEFAULT '',
  finish     TEXT NOT NULL DEFAULT '',
  list       TEXT NOT NULL DEFAULT 'saved' CHECK (list IN ('saved', 'compare', 'cart')),
  quantity   INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, slug, wood, finish, list)
);

CREATE INDEX IF NOT EXISTS saved_item_user_idx ON saved_item (user_id);
