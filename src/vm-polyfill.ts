/* eslint-disable @typescript-eslint/no-explicit-any */

export class Script {
  private code: string;

  constructor(code: string) {
    this.code = String(code || '');
  }

  runInNewContext(context: Record<string, any>, _options?: { timeout?: number }): any {
    const sandboxKeys = Object.keys(context);
    const sandboxValues = sandboxKeys.map((k) => context[k]);

    const proxy = new Proxy(context, {
      has: () => true,
      get: (target, prop) => {
        if (typeof prop === 'symbol') return (target as any)[prop];
        return prop in target ? (target as any)[prop] : undefined;
      },
      set: (target, prop, value) => {
        if (typeof prop === 'symbol') return false;
        (target as any)[prop] = value;
        return true;
      },
    });

    // 同步执行 —— 在 Workers 中不支持真正的超时中断，
    // nodejs_compat 下的 vm 模块本就有限，此处直接 new Function 模拟。
    try {
      const fn = new Function('proxy', ...sandboxKeys, `
        with (proxy) {
          return (function() {
            return (${this.code});
          })();
        }
      `);
      return fn(proxy, ...sandboxValues);
    } catch {
      return '';
    }
  }
}
