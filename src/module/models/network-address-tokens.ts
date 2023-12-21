import { NetworkAddress } from './network-address';

export interface NetworkAddressTokens extends NetworkAddress {
  tokens: string[],
}
