import type {
  KeyValueStore,
  KeyValueStoreData,
  KeyValueStoreKey,
} from "@cursorless/lib-common";
import { KEY_VALUE_STORE_DEFAULTS } from "@cursorless/lib-common";
import type { JetbrainsClient } from "./JetbrainsClient";

/**
 * Persisted by the IDE plugin, so values such as tutorial progress survive restarts.
 */
export class JetbrainsKeyValueStore implements KeyValueStore {
  constructor(private client: JetbrainsClient) {}

  get<K extends KeyValueStoreKey>(key: K): KeyValueStoreData[K] {
    const valueJson = this.client.keyValueGet(key);
    return valueJson == null ? KEY_VALUE_STORE_DEFAULTS[key] : JSON.parse(valueJson);
  }

  set<K extends KeyValueStoreKey>(
    key: K,
    value: KeyValueStoreData[K],
  ): Promise<void> {
    this.client.keyValueSet(key, JSON.stringify(value));
    return Promise.resolve();
  }
}
