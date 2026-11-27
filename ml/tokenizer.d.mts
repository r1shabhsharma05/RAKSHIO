// Type declarations for ml/tokenizer.mjs (shared JS module, imported from
// both the Node training script and the TypeScript app code).
export declare const VOCAB_SIZE: number;
export declare function tokenize(text: string): string[];
export declare function buildVocab(texts: string[], size?: number): string[];
export declare function vectorize(text: string, vocab: string[]): Float32Array;
