import { Service } from 'crypto-wallet/injection';
import { StorageService } from 'crypto-wallet/modules/core';
import { Storage } from 'crypto-wallet/components';
import { TokenBalance } from '../assets/models';
import { SentRecipientRecord } from '../addresses/models';
import { ClientsService } from 'crypto-wallet/modules/wallet';
import { ObjectHelper } from 'crypto-wallet/utils';

type TokensBalance = {
  [token: string]: TokenBalance,
};

interface AccountAssetsData {
  tokens?: TokensBalance,
}

interface LastSendTokenData {
  [recipientAddress: string]: Omit<SentRecipientRecord, 'recipientAddress'>,
}

interface LastSendNetworkData {
  [token: string]: LastSendTokenData,
}

interface TronData {
  accounts: {
    [network: string]: {
      [account: string]: AccountAssetsData,
    },
  },
  lastSendData?: {
    [network: string]: LastSendNetworkData,
  },
}

@Service()
export class DataService {
  private storage: Storage<TronData>;
  constructor(
    storageService: StorageService,
    private clientsService: ClientsService,
  ) {
    this.storage = storageService.getStorage('tron');
  }

  async setAccountTokens(address: string, network: string, data: TokensBalance) {
    const accounts = await this.storage.get('accounts') || {};
    let networkData = ObjectHelper.getIgnoreCase(accounts, network);
    if (!networkData) {
      networkData = accounts[network.toLowerCase()] = {};
    }
    let account = networkData[address];
    if (!account) {
      account = networkData[address] = {};
    }
    if (!account.tokens) {
      account.tokens = {};
    }
    const dataToUpdate = Object.keys(data || {})
      .reduce<TokensBalance>(
        (balances, token) => Object.assign(balances, { [token]: data[token] }),
        {});
    Object.assign(account.tokens, dataToUpdate);
    Object.keys(account.tokens)
      .filter(token => !account.tokens[token])
      .forEach(token => { delete account.tokens[token] });
    await this.storage.set('accounts', accounts);
  }

  async getAccountTokens(address: string, network: string) {
    const accounts = await this.storage.get('accounts');

    const networkData = ObjectHelper.getIgnoreCase(accounts, network);
    if (!networkData) {
      return undefined;
    }
    const account = networkData[address];
    if (!account) {
      return undefined;
    }
    return account.tokens;
  }

  async getNetworks() {
    const accounts = await this.storage.get('accounts');
    if (!accounts) {
      return undefined;
    }
    return Object.keys(accounts);
  }

  async getNetworkAccounts(network: string) {
    const accounts = await this.storage.get('accounts');

    const networkData = ObjectHelper.getIgnoreCase(accounts, network);
    if (!networkData) {
      return undefined;
    }
    return Object.keys(networkData);
  }

  async spliceNetworkAccounts(network: string, addressesToAdd: string[], addressesToRemove: string[]) {
    const accounts = await this.storage.get('accounts');
    let networkData = ObjectHelper.getIgnoreCase(accounts, network);
    if (!networkData) {
      networkData = accounts[network.toLowerCase()] = {};
    }
    addressesToAdd.forEach(address => {
      networkData[address] = {};
    });
    const keysToRemove = Object.keys(networkData).filter(address => addressesToRemove.includes(address));
    for (const key of keysToRemove) {
      delete networkData[key];
    }
    if (keysToRemove.length) {
      await this.storage.set('accounts', accounts);
    }
  }

  async getLastNetworkRecipients(tokenAddress: string, network: string) {
    const lastSendData = await this.storage.get('lastSendData');
    const networkData = ObjectHelper.getIgnoreCase(lastSendData, network);
    if (!networkData) {
      return undefined;
    }
    const lastSendToenData = networkData[tokenAddress];
    if (!lastSendToenData) {
      return undefined;
    }
    return lastSendToenData;
  }

  async setLastNetworkRecipients(tokenAddress: string, lastRecipients: LastSendTokenData, network: string) {
    let lastSendData = await this.storage.get('lastSendData') || {};
    let networkData = ObjectHelper.getIgnoreCase(lastSendData, network);
    if (!networkData) {
      networkData = lastSendData[network.toLowerCase()] = {};
    }
    networkData[tokenAddress] = lastRecipients;
    await this.storage.set('lastSendData', lastSendData);
  }


}
