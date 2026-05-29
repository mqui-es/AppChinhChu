import * as React from 'react';

import { IpaSignerViewProps } from './IpaSigner.types';

export default function IpaSignerView(props: IpaSignerViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
