// The contract between the core and a skin (the app's own look, e.g. LT
// Portfolio's src/skin/, or a shared UI-kit package).
//
// Denim decides what the frame knows (applications, where the URL is,
// settings, unsaved drafts); the skin decides how it looks. A skin is one
// object of components, passed to <DenimProvider skin={...}>:
//
//   Theme        wraps everything below the settings store; reads
//                useSettings() and provides the skin's colours and type.
//   Frame        drawn around the tabs (safe area, header, banners).
//   TabBar       the tabs' bar, from useApplications() and useNav().
//   LeaveConfirm the "discard unsaved changes?" question.
//   useSceneStyle optional hook giving each tab scene's style (its background).
//
// Everything else (layout, icons, motion, extra chrome) is the skin's choice.
import type React from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import type { ILeaveConfirmProps } from './lib/leaveGuard';

export interface IDenimSkin {
  Theme?: React.ComponentType<{ children?: React.ReactNode }>;
  Frame: React.ComponentType<{ children?: React.ReactNode }>;
  TabBar: React.ComponentType;
  LeaveConfirm: React.ComponentType<ILeaveConfirmProps>;
  useSceneStyle?: () => StyleProp<ViewStyle>;
}
