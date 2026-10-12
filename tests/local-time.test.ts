import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateTime } from '../lib/api';

test('timestamps follow the local environment, including date rollover and DST', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'Asia/Tbilisi';
    assert.equal(dateTime('2026-01-01T23:00:00Z', 'ru'), '2 янв., 03:00');
    process.env.TZ = 'America/New_York';
    assert.match(dateTime('2026-01-01T12:00:00Z'), /07:00 AM/);
    assert.match(dateTime('2026-07-01T12:00:00Z'), /08:00 AM/);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});
