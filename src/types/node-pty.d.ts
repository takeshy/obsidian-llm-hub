declare module "node-pty" {
  export interface IPty {
    write(data: string): void;
    kill(signal?: string): void;
    onData(callback: (data: string) => void): void;
    onExit(callback: (event: { exitCode: number; signal?: number }) => void): void;
  }

  export interface IPtyForkOptions {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: Record<string, string | undefined>;
  }

  export function spawn(file: string, args: string[], options?: IPtyForkOptions): IPty;
}
