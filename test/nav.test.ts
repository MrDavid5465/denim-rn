import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  appForPath, appUrl, computeNav, disabledAppRedirect, tabScreenNames, visibleApplications,
  type IApplication,
} from '../nav.ts';

const apps: IApplication[] = [
  { name: 'Portfolio', path: '', under: ['report'], enabled: true },
  { name: 'Activity', path: 'activity', enabled: true },
  { name: 'Watchlist', path: 'watchlist', enabled: false },
  { name: 'Shameless Cloning', path: 'cloning', label: 'Cloning' },
];

test('the root application owns / and its under routes, not every page', () => {
  assert.equal(appForPath('/', apps)?.name, 'Portfolio');
  assert.equal(appForPath('/report', apps)?.name, 'Portfolio');
  assert.equal(appForPath('/settings', apps), undefined);
  assert.equal(appForPath('/holding/COST', apps), undefined);
});

test('whole-segment matching', () => {
  assert.equal(appForPath('/activity/', apps)?.name, 'Activity');
  assert.equal(appForPath('/activityx', apps), undefined);
});

test('a covering route keeps the last application current', () => {
  const onActivity = computeNav('/activity', apps);
  assert.equal(onActivity.currentApp?.name, 'Activity');
  const covered = computeNav('/settings', apps, onActivity.currentApp);
  assert.equal(covered.activeApp, undefined);
  assert.equal(covered.currentApp?.name, 'Activity');
  assert.equal(computeNav('/settings', apps).currentApp?.name, 'Portfolio');
});

test('turned-off applications redirect home; unknown ones stay', () => {
  assert.equal(disabledAppRedirect('/watchlist', apps), '/');
  assert.equal(disabledAppRedirect('/cloning', apps), undefined);
  assert.equal(disabledAppRedirect('/activity', apps), undefined);
  assert.equal(disabledAppRedirect('/settings', apps), undefined);
});

test('only enabled applications are drawn', () => {
  assert.deepEqual(visibleApplications(apps).map(a => a.name), ['Portfolio', 'Activity']);
});

test('tab screen names follow expo-router file names', () => {
  assert.deepEqual(tabScreenNames(apps), ['index', 'report', 'activity', 'watchlist', 'cloning']);
  assert.equal(appUrl(apps[0]), '/');
  assert.equal(appUrl(apps[1]), '/activity');
});
