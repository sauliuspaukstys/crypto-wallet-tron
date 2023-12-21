import { TronAccountVariation } from './account-variation';

declare global {

  export interface WalletClientEvents {
    tronAddressChanged: string,
  }
}
