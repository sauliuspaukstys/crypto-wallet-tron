import { NetworkAddressAccountAssets } from './network-address-account-assets';

declare global {

  export interface WalletClientEvents {
    tronPricesChanged: void,
    tronAccountAssetsChanged: NetworkAddressAccountAssets,
  }
}
