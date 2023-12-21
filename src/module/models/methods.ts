import { Methods } from 'crypto-wallet/generic';
import { TronAccountVariation } from '../../accounts/models';
import { ClientMethodSignature } from 'crypto-wallet/modules/core/models';
import { NetworkAddress } from './network-address';
import { NetworkAddressTokens } from './network-address-tokens';
import { AccountAssets } from '../../assets/models';

export type TronMethods = Methods<{
  getAccounts: ClientMethodSignature<void, TronAccountVariation[], 'admin'>,
  getAccount: ClientMethodSignature<void, TronAccountVariation, 'admin'>,
  refreshAccount: ClientMethodSignature<NetworkAddress, void, 'admin'>,
  refreshAccountTokens: ClientMethodSignature<NetworkAddressTokens, void, 'admin'>,
  getAccountAssets: ClientMethodSignature<NetworkAddress, AccountAssets, 'admin'>,
}>;
