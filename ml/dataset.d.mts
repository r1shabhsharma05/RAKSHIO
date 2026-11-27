// Type declarations for ml/dataset.mjs.
export declare const SEED: number;
export declare function parseCsv(text: string): string[][];
export declare function seededShuffle<T>(arr: T[], seed?: number): T[];
export interface DatasetRow { label: string; text: string; y: number; source: 'sms' | 'enron' | 'phishing' }
export interface SourceCount { source: DatasetRow['source']; total: number; train: number; val: number; test: number }
export interface DatasetSplit {
  all: DatasetRow[];
  train: DatasetRow[];
  val: DatasetRow[];
  test: DatasetRow[];
  sources: SourceCount[];
}
export declare function loadSplit(dataDir?: string): DatasetSplit;
