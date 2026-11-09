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

-- What a signed-in shopper chose to bring from their device to their account.
-- A piece, a finish, a timestamp. Deliberately no free text, no IP, no device
-- identifier, and nothing about the shopper or their household: see the closed
-- schema in src/lib/interest/events.ts. Goes with the account via the cascade.
CREATE TABLE IF NOT EXISTS interest_event (
  user_id      TEXT NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('view', 'compare', 'this_or_that', 'finish_chosen', 'save', 'add_to_cart', 'babylist', 'remove')),
  slug         TEXT NOT NULL,
  finish       TEXT NOT NULL DEFAULT '',
  other_slug   TEXT NOT NULL DEFAULT '',
  other_finish TEXT NOT NULL DEFAULT '',
  remove_from  TEXT NOT NULL DEFAULT '' CHECK (remove_from IN ('', 'cart', 'saved')),
  at           TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS interest_event_user_at_idx ON interest_event (user_id, at);
