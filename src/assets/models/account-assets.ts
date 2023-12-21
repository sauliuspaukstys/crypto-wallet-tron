import { TokenBalance } from './token-balance';

export interface AccountAssets {
  tokens: { [key: string]: TokenBalance },
}
