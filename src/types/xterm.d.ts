declare module "@xterm/xterm" {
  export interface IDisposable {
    dispose(): void;
  }

  export interface ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
  }

  export interface ITerminalOptions {
    cursorBlink?: boolean;
    convertEol?: boolean;
    fontFamily?: string;
    fontSize?: number;
    theme?: Record<string, string | undefined>;
    allowProposedApi?: boolean;
  }

  export class Terminal {
    constructor(options?: ITerminalOptions);
    open(parent: HTMLElement): void;
    write(data: string): void;
    writeln(data: string): void;
    focus(): void;
    dispose(): void;
    loadAddon(addon: ITerminalAddon): void;
    onData(callback: (data: string) => void): IDisposable;
  }
}

declare module "@xterm/addon-fit" {
  import type { ITerminalAddon } from "@xterm/xterm";

  export class FitAddon implements ITerminalAddon {
    activate(terminal: import("@xterm/xterm").Terminal): void;
    dispose(): void;
    fit(): void;
    proposeDimensions(): { cols: number; rows: number } | undefined;
  }
}
