import { ModuleAllowedMethods } from 'crypto-wallet/modules/application/models';

export const TRON_METHODS: ModuleAllowedMethods<'tron'> = {
  getAccounts: 'admin',
  getAccount: 'admin',
  refreshAccount: 'admin',
  refreshAccountTokens: 'admin',
  getAccountAssets: 'admin',
};
