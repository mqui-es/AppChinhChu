import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './IpaSigner.types';

type IpaSignerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class IpaSignerModule extends NativeModule<IpaSignerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(IpaSignerModule, 'IpaSignerModule');
