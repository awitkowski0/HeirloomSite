'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { forgetInterestsEverywhere, checkInterestAccount, mergeInterestsIntoAccount } from '@/lib/interest/account-client';
import type { InterestAccountStatus } from '@/lib/interest/account';
import type { InterestCatalogItem } from '@/lib/interest/catalog';
import type { FacetEntry, InterestProfile } from '@/lib/interest/profile';
import { setInterestLearning } from '@/lib/interest/store';
import { useInterestProfile } from '@/lib/interest/useInterestProfile';
import { INTEREST_PRIVATE_CLASS } from '@/lib/interest/uses';
import './what-we-learned.css';

const PRIVATE = `taste-private ${INTEREST_PRIVATE_CLASS}`;

function FacetList({ title, entries }: { title: string; entries: FacetEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="taste-section">
      <h2 className="taste-section-title">{title}</h2>
      <ul className="taste-facets">
        {entries.slice(0, 4).map(entry => (
          <li key={entry.id} className={`taste-facet ${PRIVATE}`}>
            <span>{entry.label}</span>
            <span className="taste-facet-share">{Math.round(entry.share * 100)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Learned({ profile, onAccount }: { profile: InterestProfile; onAccount: boolean }) {
  const { nursery, priceRange, builderLean, activity, confidence } = profile;
  return (
    <>
      <p className={`taste-summary ${PRIVATE}`}>{profile.summary.text}</p>
      <p className="taste-confidence">
        Confidence: {confidence.level}. {confidence.reason}
      </p>
      <FacetList title="Styles" entries={profile.styles} />
      <FacetList title="Finishes" entries={profile.finishFamilies} />
      <FacetList title="Kinds of piece" entries={profile.pieceTypes} />
      {priceRange && (
        <p className={`taste-line ${PRIVATE}`}>
          Price range you have been looking at: ${priceRange.low.toLocaleString()} to $
          {priceRange.high.toLocaleString()} ({priceRange.basis}).
        </p>
      )}
      {builderLean && <p className={`taste-line ${PRIVATE}`}>Leaning toward {builderLean.label}.</p>}
      <section className="taste-section">
        <h2 className="taste-section-title">Your room</h2>
        <p className={`taste-line ${PRIVATE}`}>
          {nursery.filled} of {nursery.total} set aside
          {nursery.missing.length > 0 ? `. Still open: ${nursery.missing.join(', ')}.` : '.'}
        </p>
      </section>
      <p className="taste-line">
        Based on {activity.events} {activity.events === 1 ? 'action' : 'actions'} across {activity.pieces}{' '}
        {activity.pieces === 1 ? 'piece' : 'pieces'}, kept {onAccount ? 'on this device and your account' : 'only on this device'}.
      </p>
    </>
  );
}

export default function WhatWeLearned({ catalog }: { catalog: readonly InterestCatalogItem[] }) {
  const { status, profile } = useInterestProfile(catalog);
  const [account, setAccount] = useState<InterestAccountStatus | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'waiting') return;
    let cancelled = false;
    checkInterestAccount().then(result => {
      if (!cancelled) setAccount(result);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  const hasEvents = (profile?.activity.events ?? 0) > 0;
  const signedIn = account?.signedIn === true;

  return (
    <div className="container taste-page">
      <h1 className="headline-lg">What we&rsquo;ve learned</h1>
      <p className="taste-intro">
        A few notes on the furniture you have looked at, used to order suggestions and pick pairs for
        This or That. It stays in this browser unless you choose to keep it on your account. It is
        never sent to analytics or advertising companies, and it holds nothing about you beyond the
        pieces and finishes you chose to look at.
      </p>

      {status === 'waiting' && (
        <p className="taste-line">
          Nothing is kept until you make a choice in the cookie banner. <Link href="/privacy">How this works</Link>.
        </p>
      )}
      {status === 'declined' && (
        <p className="taste-line">
          You declined cookies, so nothing is kept here and suggestions are not personalized. You can
          change that from Cookie settings at the bottom of any page.
        </p>
      )}
      {status === 'off' && <p className="taste-line">This is off. Nothing is being learned or kept.</p>}
      {status === 'learning' && profile && !hasEvents && (
        <p className="taste-line">Nothing yet. As you look around, this page fills in.</p>
      )}
      {status === 'learning' && profile && hasEvents && (
        <Learned profile={profile} onAccount={(account?.accountEvents ?? 0) > 0} />
      )}

      {status === 'learning' && signedIn && (hasEvents || (account?.accountEvents ?? 0) > 0) && (
        <div className="taste-actions">
          <button
            type="button"
            className="button-secondary"
            onClick={async () => {
              const ok = await mergeInterestsIntoAccount();
              setNotice(ok ? 'Saved to your account.' : 'That did not work. Please try again.');
            }}
          >
            Keep this on my account
          </button>
        </div>
      )}

      <div className="taste-actions">
        {status !== 'waiting' && (
          <button
            type="button"
            className="button-secondary"
            onClick={async () => {
              const ok = await forgetInterestsEverywhere(signedIn);
              setNotice(ok ? 'Cleared.' : 'Cleared here. We could not reach your account, so please try again.');
            }}
          >
            Clear what we&rsquo;ve learned
          </button>
        )}
        {status !== 'waiting' && status !== 'declined' && (
          <button
            type="button"
            className="button-secondary"
            role="switch"
            aria-checked={status === 'learning'}
            onClick={async () => {
              if (status === 'learning') {
                setInterestLearning(false);
                // Turning it off is a request to stop, so the account copy goes too.
                await forgetInterestsEverywhere(signedIn);
                setNotice('Turned off, and what was here is gone.');
              } else {
                setInterestLearning(true);
                setNotice('Turned on.');
              }
            }}
          >
            {status === 'learning' ? 'Turn this off' : 'Turn this on'}
          </button>
        )}
      </div>
      {status === 'learning' && (
        <p className="taste-fine">Turning this off also erases what is kept here and on your account.</p>
      )}

      {notice && (
        <p className="taste-line" role="status">
          {notice}
        </p>
      )}
    </div>
  );
}
