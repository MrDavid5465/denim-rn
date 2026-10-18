// The tabs layout: the skin's Frame around expo-router's JS tabs, with the
// skin's TabBar. One screen per application route (and its `under` routes),
// in registry order. An app's `(tabs)/_layout.tsx` is just:
//
//   export { DenimTabs as default } from '<path>/denim-rn';
//
// Turned-off applications keep their screen (expo-router needs the route);
// the TabBar hides them and ApplicationsProvider redirects their URLs.
import React from 'react';
import Tabs from 'expo-router/js-tabs';
import { useApplications, useSkin } from './DenimProvider';
import { tabScreenNames } from './nav';

export function DenimTabs() {
  const { Frame, TabBar, useSceneStyle } = useSkin();
  const { applications } = useApplications();
  const sceneStyle = useSceneStyle?.();
  return (
    <Frame>
      <Tabs
        backBehavior="history"
        tabBar={() => <TabBar />}
        screenOptions={{ headerShown: false, ...(sceneStyle ? { sceneStyle } : {}) }}
      >
        {tabScreenNames(applications).map(name => <Tabs.Screen key={name} name={name} />)}
      </Tabs>
    </Frame>
  );
}
