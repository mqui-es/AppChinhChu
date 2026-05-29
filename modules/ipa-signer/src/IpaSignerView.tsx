import { requireNativeView } from 'expo';
import * as React from 'react';

import { IpaSignerViewProps } from './IpaSigner.types';

const NativeView: React.ComponentType<IpaSignerViewProps> =
  requireNativeView('IpaSigner');

export default function IpaSignerView(props: IpaSignerViewProps) {
  return <NativeView {...props} />;
}
