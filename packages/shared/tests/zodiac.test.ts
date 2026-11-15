import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSunSign, getSignByKey } from '../src/zodiac';

test('returns correct sign for mid-range dates', () => {
  assert.equal(getSunSign('1990-04-05')?.key, 'aries');
  assert.equal(getSunSign('1990-08-01')?.key, 'leo');
  assert.equal(getSunSign('1990-03-10')?.key, 'pisces');
});

test('handles sign boundaries', () => {
  assert.equal(getSunSign('1990-03-21')?.key, 'aries'); // first day of aries
  assert.equal(getSunSign('1990-04-19')?.key, 'aries'); // last day of aries
  assert.equal(getSunSign('1990-04-20')?.key, 'taurus');
});

test('handles capricorn year wrap', () => {
  assert.equal(getSunSign('1990-12-22')?.key, 'capricorn');
  assert.equal(getSunSign('1990-12-31')?.key, 'capricorn');
  assert.equal(getSunSign('1990-01-01')?.key, 'capricorn');
  assert.equal(getSunSign('1990-01-19')?.key, 'capricorn');
  assert.equal(getSunSign('1990-01-20')?.key, 'aquarius');
});

test('returns null for invalid dates', () => {
  assert.equal(getSunSign('not-a-date'), null);
});

test('getSignByKey finds signs', () => {
  assert.equal(getSignByKey('leo')?.en, 'Leo');
  assert.equal(getSignByKey('unknown'), null);
});
