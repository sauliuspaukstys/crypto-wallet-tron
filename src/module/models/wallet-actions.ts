import { TronMethods } from './methods';

declare global {
  export interface WalletActions {
    tron: TronMethods,
  }
}
