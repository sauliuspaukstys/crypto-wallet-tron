import { AccountVariation as WalletAccountVariation } from 'crypto-wallet/modules/wallet/accounts/models'
export interface TronAccountVariation extends WalletAccountVariation {
  address: string;
  hdPath?: string;
}
