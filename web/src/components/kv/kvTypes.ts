export type KVValueType =
  | 'STRING'
  | 'NUMBER'
  | 'BOOLEAN'
  | 'DATETIME'
  | 'DATE'
  | 'DURATION'
  | 'JSON';

export type KVRow = {
  namespace: string;
  key: string;
  type: KVValueType;
  value: string;
  description: string;
  updateDate: string;
  expirationDate?: string;
};

