import { AccountAssets } from './account-assets';

export interface NetworkAddressAccountAssets extends AccountAssets {
  network: string,
  address: string,
}
