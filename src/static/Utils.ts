import { FullConditionsModel } from '../condition/schemas/Conditions.schema';
import { UserKey } from '../keys/schemas/UserKeys.schema';

export class BadgerUtils {
  public static BINANCE_FUTURES_REAL = 'https://fapi.binance.com';
  public static BINANCE_FUTURES_TESTNET = 'https://testnet.binancefuture.com';
  public static GET_BINANCE_FUTURES_ENDPOINT(forceItIsTestnet?: boolean) {
    if (forceItIsTestnet != undefined) {
      return forceItIsTestnet === true ? this.BINANCE_FUTURES_TESTNET : this.BINANCE_FUTURES_REAL;
    } else {
      return this.IS_TESTNET === true ? this.BINANCE_FUTURES_TESTNET : this.BINANCE_FUTURES_REAL;
    }
  }

  public static VERSION_ON_USE = 'v2';
  public static IS_TESTNET: boolean = true;

  public static orderByMainChainingNode(a: FullConditionsModel, b: FullConditionsModel) {
    if (a.isMainChainingNode && !b.isMainChainingNode) {
      return -1;
    }
    if (!a.isMainChainingNode && b.isMainChainingNode) {
      return 1;
    }
    return 0;
  }

  public static generateArrayWithSpecificLenght(length: number, value: any) {
    let res = [];
    for (let i = 0; i < length; i++) {
      res.push(value);
    }
    return res;
  }

  public static isValidUserKey(key: any) {
    let keyMapped: UserKey = key;
    return keyMapped.user && keyMapped.privateK && keyMapped.publicK && keyMapped.exchangeID;
  }

  public static getPercentageChange(oldNumber, newNumber) {
    return (newNumber * 100) / oldNumber - 100;
  }

  public static busquedaKeysValida(keyList: UserKey[], exchangeBuscado: string) {
    for (let i = 0; i < keyList.length; i++) {
      const key = keyList[i];
      if (BadgerUtils.isValidUserKey(key) && key.exchangeID.toLowerCase() === exchangeBuscado.toLowerCase()) {
        return key;
      }
    }
    return null;
  }
  public static returnOppositeTrade(param: { side: 'BUY' | 'SELL'; positionSide: 'SHORT' | 'LONG' }) {
    if (param.side == 'BUY' && param.positionSide == 'LONG') {
      return { side: 'SELL', positionSide: 'LONG' };
    }
    if (param.side == 'SELL' && param.positionSide == 'SHORT') {
      return { side: 'BUY', positionSide: 'SHORT' };
    }
    return null;
  }
}
