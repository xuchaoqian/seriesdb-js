export type Row = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type NonArrayKey = number | Date | string | ArrayBuffer | Uint8Array;
export type Key = NonArrayKey | Array<NonArrayKey>;
