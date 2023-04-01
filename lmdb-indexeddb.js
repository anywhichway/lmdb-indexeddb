import {Chacha8} from "./src/chacha8.js";
import {LZUTF8} from "./src/lzutf8.js";
import {EventEmitter} from "./src/event-emitter.js"

const NONCE = new Int32Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

const skipTicks = (count) => {
    return new Promise((resolve) => {
        let i = 0;
        const interval = setInterval(() => {
            if (++i === count) {
                clearInterval(interval);
                resolve();
            }
        }, 0);
    });
}

const waitForClose = (idb) => {
    return new Promise((resolve) => {
        const interval = setInterval(() => {
            try {
                const names = idb.objectStoreNames;
                if(names && names.length) {
                    const transaction = idb.transaction(names[0]);
                    transaction.abort();
                }
                clearInterval(interval);
                resolve();
            } catch(e) {
                console.error(e);
            }
        },10000)
    });
}

/*
var key = new Int32Array([0x00, 0x00, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
var iv = new Int32Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
var data = new Int32Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

var cipher = new Chacha8(key, iv, data);
*/

EventTarget.prototype.withEventListener = function (type, listener, options) {
    this.addEventListener(type, listener, options);
    return this;
}

const toString = (value) => {
    if(typeof(value)==="symbol") return value.toString();
    return JSON.stringify(value,stringify);
}

const stringify = (_,value) => {
    if(typeof(value)==="symbol") return value.toString();
    return value;
}

const parse = (key,value) => {
    if(typeof(value)==="string") {
        const name = (value.match(/Symbol\((.*)\)/)||[])[1];
        if(name) return Symbol.for(name)
    }
    return value;
}

const toKey = (key) => {
    if(typeof(key)==="symbol") return key.toString();
    return JSON.stringify(key,stringify);
}

const fromKey = (key) => {
    if(typeof(key)==="string") {
        const name = (key.match(/Symbol\((.*)\)/)||[])[1];
        if(name) return Symbol.for(name)
    }
    return JSON.parse(key,parse);
}

const keySort = (a,b) => {
    let aWasPrimitive, bWasPrimitive;
    if(!Array.isArray(a)) {
        aWasPrimitive = true;
        a = [a];
    }
    if(!Array.isArray(b)) {
        bWasPrimitive = true;
        b = [b];
    }
    for(let i=0;i<a.length && i<b.length;i++) {
        if(a==null && b!==null) return -1;
        if(a!==null && b===null) return 1;
        const atype = typeof(a[i]),
            btype = typeof(b[i]);
        if(atype!==btype) { // boolean,number,string
            if(atype==="symbol") return -1;
            if(btype==="symbol" || atype>btype) return 1;
            return -1;
        }
        const avalue = atype==="symbol" ? a[i].toString() : a[i],
            bvalue = btype==="symbol" ? b[i].toString() : b[i];
        if(aWasPrimitive!==bWasPrimitive && bWasPrimitive) return 1;
        if(avalue===bvalue) continue;
        if(avalue>bvalue) return 1;
        return -1;
    }
    return a.length - b.length;
}

const keyInsortIndex = (key,keys,forSearch) => {
    let aWasPrimitive;
    if(!Array.isArray(key)) {
        aWasPrimitive = true;
        key = [key];
    }
    for(let i=0;i<keys.length;i++) {
        let bWasPrimitive, otherKey = keys[i];
        if(!Array.isArray(otherKey)) {
            bWasPrimitive = true;
            otherKey = [otherKey];
        }
        if(otherKey.length===key.length && otherKey.every((value,i) => value===key[i])) {
            return forSearch ? i : undefined;
        }
        for(let j=0;j<key.length;j++) {
            const  atype = typeof(otherKey[j]),
                btype = typeof(key[j]),
                a = atype==="symbol" ? otherKey[j].toString() : otherKey[j],
                b = btype==="symbol" ? key[j].toString() : key[j];
            if(a==null && b!==null) continue;
            if(a!==null && b===null) {
                return forSearch ? i - 1 : i;
            }
            if(atype!==btype) {
                if(atype==="symbol") continue;
                if(btype==="symbol" || atype>btype) {
                    return forSearch ? i - 1 : i;
                }
                continue;
            }
            if(aWasPrimitive!==bWasPrimitive && aWasPrimitive) return i;
            if(a>b) {
                return forSearch ? i - 1 : i;
            }
        }
    }
    return keys.length;
}

const keyFindIndex = (key,keys) => {
    let aWasPrimitive;
    if(!Array.isArray(key)) {
        aWasPrimitive = true;
        key = [key];
    }
    for(let i=0;i<keys.length;i++) {
        let otherWasPrimitive, otherKey = keys[i];
        if(!Array.isArray(otherKey)) {
            otherWasPrimitive = true;
            otherKey = [otherKey];
        }
        if(otherKey.length===key.length && otherKey.every((value,i) => value===key[i])) return i;
        for(let j=0;j<key.length;j++) {
            const a = otherKey[j],
                b = key[j],
                atype = typeof(a),
                btype = typeof(b);
            if(a==null && b!==null) continue
            if(a!==null && b===null) return;
            if(atype!==btype) {
                if(atype==="symbol") continue;
                if(btype==="symbol" || atype>btype) return;
                continue;
            }
            if(aWasPrimitive!==otherWasPrimitive && aWasPrimitive) return; // is this correct?
            if(a>b) return;
        }
    }
}

const entryValue = (entry) => { return entry==null ? undefined : entry.value; }

function reduce(item,reducers)  {
    let reducer;
    while(reducer = reducers.shift()) {
        const [type,f] = reducer,
            value = f(item);
        if(value && value.then) {
            value.then((value) => {
                if(type==="filter" && !value) return;
                reduce(value,reducers);
            })
            return;
        }
        if(type=="filter") {
            if(!value) return;
        } else if(type==="map") {
            item = value;
        }
    }
}

const conditionalVersion = (entry,version) => {
    if(version) entry.version = version;
    return entry;
}

const conditionalReverse = (array,reverse) => {
    if(reverse) return array.reverse();
    return array;
}

const conditionalEncrypt = (data,encryptionKey) => {
    return encryptionKey ? new Chacha8(encryptionKey,NONCE,new Int32Array(new TextEncoder().encode(toString(data)))) : data;
}

const conditionalDecrypt = (data,encryptionKey) => {
    return encryptionKey && data && typeof(data)==="object" && data instanceof Int32Array ? new TextDecoder().decode(new Int8Array(new Chacha8(encryptionKey,NONCE,data))) : data;
}

const conditionalCompress = (data,compression) => {
    return  typeof(data)==="string" && compression ? LZUTF8.compress(data,{outputEncoding:"StorageBinaryString"}) : data;
}

function conditionalDecompress(data,compression) {
    return  typeof(data)==="string" && compression ? LZUTF8.decompress(data,{inputEncoding:"StorageBinaryString"}) : data;
}

class Keys extends Array {
    constructor(...keys) {
        super(...keys);
        this.sort(keySort);
    }
    static clone(keys) {
        const clone = Object.create(Keys.prototype,{});
        Object.assign(clone,keys);
        return clone;
    }
    add(key) {
        const index = keyInsortIndex(key,this);
        if(index===undefined) return;
        super.splice(index,0,key);
    }
    remove(key) {
        const index = keyFindIndex(key,this);
        if(index===undefined) return;
        super.splice(index,1);
    }
    has(key) {
        return keyFindIndex(key,this)!==undefined;
    }
    find(key) {
        const index = keyFindIndex(key,this);
        if(index===undefined) return;
        return this[index];
    }
    findIndex(key) {
        return keyFindIndex(key,this);
    }
    findInsertIndex(key) {
        return keyInsortIndex(key,this,true);
    }
    insert(key) {
        const index = keyInsortIndex(key,this,true);
        if(index===undefined) return;
        this.splice(index,0,key);
    }
    sort() {
        return super.sort(keySort);
    }
}

class Transaction {
    constructor() {
        this.keys = {};
        this.cache = {};
    }
    doesExist(lmdb,key) {
        key = toKey(key);
        return this.cache[lmdb.name]?.entries[key] ||  lmdb.cache[key];
    }
    get(lmdb,key) {
        key = toKey(key);
        const entry = this.getEntry(lmdb,key);
        if(entry==null) return;
        if(entry) Object.defineProperty(lmdb,"lastVersion",{configurable:true,value:entry.version});
        this.keys[lmdb.name] ||= Keys.clone(lmdb.keys);
        this.cache[lmdb.name].entries[key] = entry;
        return entry.value;
    }
    getEntry(lmdb,key) {
        key = toKey(key);
        this.cache[lmdb.name] ||= {lmdb,entries:{}};
        let entry = this.cache[lmdb.name].entries[key];
        if(entry!==undefined) return entryValue(entry);
        entry = lmdb.cache[key];
        return entry;
    }
    async ifNoExists(lmdb,key,callback) {
        if(!this.doesExist(key)) return callback();
    }
    async ifVersion(lmdb,key,ifVersion,callback) {
        if(this.doesExist(key,ifVersion)) return callback();
    }
    put(lmdb,key,value,version=1,ifVersion) {
        let entry = this.get(lmdb,key);
        if(ifVersion && (entry==null || entry.version!==ifVersion)) return false;
        entry ||= {version,value};
        this.cache[lmdb.name] ||= {lmdb,entries:{}};
        this.cache[lmdb.name].entries[toKey(key)] = entry;
        this.keys[lmdb.name] ||= Keys.clone(lmdb.keys);
        this.keys[lmdb.name].add(key);
    }
    remove(lmdb,key,ifVersion) {
        this.cache[lmdb.name] ||= {lmdb,entries:{}};
        if(ifVersion) {
            const entry = this.getEntry(lmdb,key);
            if(!entry || entry.version!==ifVersion) return false;
        }
        this.cache[lmdb.name].entries[toKey(key)] = null;
        this.keys[lmdb.name] ||= Keys.clone(lmdb.keys);
        this.keys[lmdb.name].remove(key);
        return true;
    }
    has(lmdb,key) {
        return this.keys[lmdb.name].has(key);
    }
    async commit(lmdb) {
        return new Promise((resolve,reject) => {
                const promises = []
                Object.entries(TRANSACTION.transaction.cache).forEach(([name, {lmdb, entries}]) => {
                    const idbTransaction = lmdb.idb.transaction([name], "readwrite"),
                        idbObjectStore = idbTransaction.objectStore(name);
                    Object.entries(entries).reduce((promises,[key, value]) => {
                        promises.push(new Promise((resolve, reject) => {
                            if (value === null) {
                                idbObjectStore.delete(key).withEventListener("success", (event) => {
                                    lmdb.cache[key] = null;
                                    resolve()
                                }).withEventListener("error", (event) => reject(event.target.error))
                            } else {
                                const entry = {
                                    version: value.version,
                                    value: conditionalEncrypt(conditionalCompress(value.value, lmdb.compression), lmdb.encryptionKey)
                                };
                                if (lmdb.compression) entry.compression = lmdb.compression;
                                if (lmdb.encryptionKey) entry.encrypted = true;
                                idbObjectStore.put(entry, key).withEventListener("success", (event) => {
                                    lmdb.cache[key] = value;
                                    resolve();
                                }).withEventListener("error", (event) => reject(event.target.error))
                            }
                        }));
                        return promises;
                    },promises);
                    Object.defineProperty(lmdb, "keys", {configurable: true, value: TRANSACTION.transaction.keys[name]});
                });
                TRANSACTION.transaction.committed = true;
                Promise.all(promises).then(() => {
                    TRANSACTION.transaction = null;
                    resolve();
                }).catch(reject);
            }
        )
    }
    abort() {
        this.cache = {};
        this.keys = [];
    }
}

const conditionalObjectCopy = (object) => {
    if(object && typeof(object)==="object") return {...object};
    return object;
}

let TRANSACTION;

class LMDB {
    #cache;
    #clearing
    #keys
    #lastVersion;
    #path;
    #name;
    #useVersions;
    #encryptionKey;
    #compression;
    constructor({path,name=null,useVersions,encryptionKey,compression,entries,idb,...rest}) {
        this.idb = idb;
        this.#path = path;
        this.#name = name;
        this.#cache = {...entries};
        this.#keys = new Keys(Object.keys(entries));
        this.#useVersions = conditionalObjectCopy(useVersions);
        this.#encryptionKey = encryptionKey ? new TextEncoder().encode(encryptionKey.padEnd(32,"!")).slice(0,32) : undefined;
        this.#compression = conditionalObjectCopy(compression);
        if(rest.dupSync || rest.encoding) {
            console.warn("dupSync and encoding are not supported in the browser");
        }
    }
    static async open({path,name=null,idb,...rest}) {
        return new Promise((resolve,reject) => {
            let lmdb;
            const entries = {},
                idbTransaction = idb.transaction([name],"readonly"),
                idbObjectStore = idbTransaction.objectStore(name);
            idbTransaction.withEventListener("complete", (event) => {
                resolve(lmdb);
            }).withEventListener("error", (event) => {
                reject(event.target.error);
            });
            idbObjectStore.openCursor().withEventListener("success", (event) => {
                const cursor = event.target.result;
                if(cursor) {
                    const entry = entries[cursor.key] = cursor.value,
                        type = typeof(entry.value);
                    if(type==="string" || (entry.encrypted || entry.compression)) entry.raw = true;
                    cursor.continue();
                }
                lmdb = new LMDB({path,name,idb,entries,...rest});
            }).withEventListener("error", (event) => {
                    reject(event.target.error);
            });
        });
    }
    get committed() {
        return TRANSACTION ? TRANSACTION.committed : TRANSACTION===null;
    }
    get compression() {
        return this.#compression;
    }
    get encryptionKey() {
        return this.#encryptionKey
    }
    get cache() {
        return new Proxy(this.#cache,{
            set(target,key,value) {
                target[key] = value;
                return true;
            },
            deleteProperty(target, p) {
                throw new Error("Cannot delete property");
            }
        })
    }
    get flushed() {
        return TRANSACTION===null;
    }
    get keys() {
        return [...this.#keys]
    }
    get name() {
        return this.#name;
    }
    get path() {
        return this.#path;
    }
    clearSync() {
        try { this.keys = [] } catch(e) {}; // this.keys may have been redefined by clone
        this.#keys = [];
        this.#cache = {};
        if(TRANSACTION) TRANSACTION.transaction.abort();
        this.#clearing = new Promise((resolve,reject) => {
                const idbTransaction = this.idb.transaction([this.#name],"readwrite"),
                    idbObjectStore = idbTransaction.objectStore(this.#name);
                idbObjectStore.clear().withEventListener("success", (event) => {
                    this.#clearing = null;
                    resolve();
                }).withEventListener("error", (event) => {
                    this.#clearing = null;
                    reject(event.target.error);
                })
        })
    }
    async clearAsync() {
        return this.#clearing = new Promise((resolve,reject) => {
            setTimeout(() => {
                this.clear();
                try { this.keys = [] } catch(e) {}; // this.keys may have been redefined by clone
                this.#keys = [];
                this.#cache = {};
                if(TRANSACTION) TRANSACTION.transaction.abort();
                const idbTransaction = this.idb.transaction([this.#name],"readwrite"),
                    idbObjectStore = idbTransaction.objectStore(this.#name);
                idbObjectStore.clear();
                idbObjectStore.clear().withEventListener("success", (event) => {
                    resolve();
                }).withEventListener("error", (event) => {
                    reject(event.target.error);
                })
            })
        })
    }
    async close() {
        this.idb.close();
        await waitForClose(this.idb);
    }
    doesExist(key,version) {
        if(version && typeof(version)!=="number") throw new Error("Version must be a number. Value checking not supported");
        if(TRANSACTION) return TRANSACTION.transaction.doesExist(this,key,version);
        const entry = this.#cache[toKey(key)];
        if(!entry || (version && entry.version!=version)) return false;
        return true;
    }
    drop() {
        new Promise(async (resolve,reject) => {
            if(TRANSACTION) TRANSACTION.transaction.abort();
            this.clearSync();
            const request = indexedDB.deleteDatabase(this.#path+"/"+this.#name).withEventListener("success", async (event) => {
                resolve();
            }).withEventListener("error", (event) => {
                console.error(event.target.error)
                reject(event.target.error);
            })
        });
    }
    get(key) {
        if(TRANSACTION) return TRANSACTION.transaction.get(this,key);
        const entry = this.getEntry(key);
        if(entry?.version) {
            this.#lastVersion = entry.version;
        }
        return entryValue(entry);
    }
    async getAsync(key,force) {
        if(TRANSACTION) return TRANSACTION.transaction.getAsync(this,key,force);
        const entry = await this.getEntryAsync(key,force);
        if(entry?.version) {
            this.#lastVersion = entry.version;
        }
        return entryValue(entry);
    }
    getBinary(key) {
        throw new Error("getBinary not implemented");
    }
    getBinaryFast(key) {
        throw new Error("getBinaryFast not implemented");
    }
    getEntry(key) {
        let entry = this.#cache[toKey(key)];
        if(entry?.raw) {
            delete entry.raw;
            try {
                entry.value = conditionalDecompress(conditionalDecrypt(entry.value,entry.encrypted ? this.encryptionKey : undefined),entry.compression);
                delete entry.encrypted;
                delete entry.compression;
                entry.value = JSON.parse(entry.value);
            } catch(e) {

            }
        }
        return entry;
    }
    async getEntryAsync(key,force) {
        if(this.#clearing) {
            await this.#clearing;
            return;
        }
        const skey = toKey(key);
        let entry = this.#cache[skey];
        if(!entry || force) {
            const idbTransaction = this.idb.transaction([this.#name],"readonly"),
                idbObjectStore = idbTransaction.objectStore(this.#name);
            entry = await new Promise((resolve,reject) => {
                idbObjectStore.get(skey).withEventListener("success", (event) => {
                    resolve(event.target.result);
                }).withEventListener("error", (event) => {
                    reject(event.target.error);
                });
            });
            if(entry!=null) {
                this.#cache[skey] = entry;
                this.#keys.add(key);
                const type = typeof(entry.value);
                if(type==="string" || (entry.value && type==="object" && entry.value instanceof Int32Array)) entry.raw = true;
            }
        }
        if(entry.raw) {
            delete entry.raw;
            try {
                entry.value = conditionalDecompress(conditionalDecrypt(entry.value,entry.encrypted ? this.encryptionKey : undefined),entry.compression);
                delete entry.encrypted;
                delete entry.compression;
                entry.value = JSON.parse(entry.value);
            } catch(e) {

            }
        }
        return entry;
    }
    getKeys({start,end,limit=Infinity,offset=0,reverse,versions,snapshot}={}) {
        const iterable = (function*() {
            start = start ? insortIndex(start,this.#keys,true) : 0;
            end = end ? insortIndex(end,this.#keys,true) : this.#keys.length;
            const keys = this.#keys.slice(start,end+1);
            for(const key of conditionalReverse(keys,reverse).slice(offset)) {
                if(limit--<=0) return;
                yield key;
            }
        }).call(this);
        iterable.forEach = (f) => {
            reducers.push(["forEach",f]);
            for(let item of iterable) {
                reduce(item,reducers,f);
            }
        }
        const reducers = []
        iterable.map = (f) => {
            reducers.push(["map",f]);
            return iterable;
        }
        iterable.filter = (f) => {
            reducers.push(["filter",f]);
            return iterable;
        }
        return iterable;
    }
    getLastVersion() {
        return this.#lastVersion;
    }
    async getMany(keys,callback) {
        await this.prefetch(keys,callback);
        return keys.map((key) => this.get(key));
    }
    getRange({start,end,limit=Infinity,offset=0,reverse,versions,snapshot}={}) {
        const useVersions = this.#useVersions,
            iterable = (function*() {
                start = start ? insortIndex(start,this.#keys,true) : 0;
                end = end ? insortIndex(end,this.#keys,true) : this.#keys.length;
                const keys = this.#keys.slice(start,end+1);
                for(const key of conditionalReverse(keys,reverse).slice(offset)) {
                    if(limit--<=0) return;
                    const {value,version} = this.#cache[toKey(key)];
                    yield conditionalVersion({key,value},useVersions && versions ? version : null);
                }
            }).call(this);
        iterable.forEach = (f) => {
            reducers.push(["forEach",f]);
            for(let item of iterable) {
                reduce(item,[...reducers]);
            }
        }
        const reducers = []
        iterable.map = (f) => {
            reducers.push(["map",f]);
            return iterable;
        }
        iterable.filter = (f) => {
            reducers.push(["filter",f]);
            return iterable;
        }
        return iterable;
    }
    getValues(key,options) {
        throw new Error("getValues not implemented")
    }
    async ifNoExists(key,callback) {
        if(TRANSACTION) return TRANSACTION.transaction.ifNoExists(this,key,callback);
        if(!this.doesExist(key)) return callback();
    }
    async ifVersion(key,ifVersion,callback) {
        if(TRANSACTION) return TRANSACTION.transaction.ifNoExists(this,key,callback);
        if(this.doesExist(key,ifVersion)) return callback();
    }
    async openDB(name,options={}) {
        if(name && typeof(name)=== "object") {
            options = name;
            name = options.name;
            delete options.name;
        }
        return new Promise(async (resolve,reject) => {
                indexedDB.open(this.path + "/" + name,1)
                    .withEventListener("upgradeneeded", (event) => {
                        event.target.result.createObjectStore(name);
                    }).withEventListener("success", async (event) => {
                        resolve(await LMDB.open({path:this.path,name,idb:event.target.result,...LMDB.options,...options}));
                }).withEventListener("error", (event) => reject(event.target.error));
        })
    }
    async put(key,value,version=1,ifVersion) {
        const skey = toKey(key);
        if(TRANSACTION) return TRANSACTION.transaction.put(this,key,value,version,ifVersion);
        let entry = this.getEntry(key);
        if(ifVersion && (entry==null || !entry.version==ifVersion)) return false;
        if(entry==null) entry = {version,value};
        else entry.value = value;
        if(version) entry.version = version;
        return new Promise(async (resolve,reject) => {
            const idbTransaction = this.idb.transaction([this.#name],"readwrite"),
                idbObjectStore = idbTransaction.objectStore(this.#name),
                storedEntry = {version:entry.version,value:conditionalEncrypt(conditionalCompress(entry.value,this.compression),this.encryptionKey)};
            if(this.compression) storedEntry.compression = this.compression;
            if(this.encryptionKey) storedEntry.encrypted = true;
            const request = idbObjectStore.put(storedEntry,skey);
            idbTransaction.withEventListener("complete", (event) => {
                this.#cache[skey] = entry;
                this.#keys.add(key);
                resolve(true);
            }).withEventListener("error", (event) => reject(event.target.error));
            request.withEventListener("error", (event) => reject(event.target.error));
        })
    }
    async prefetch(keys,callback) {
        if(this.#clearing) {
            await this.#clearing;
            return;
        }
        return new Promise((resolve,reject) => {
            const idbTransaction = this.idb.transaction([this.#name],"readwrite"),
                idbObjectStore = idbTransaction.objectStore(this.#name),
                request = idbObjectStore.getAll();
            idbTransaction.withEventListener("error", (event) => reject(event.target.error));
            request.withEventListener("success", async (event) => {
                const result = event.target.result;
                for(const key of keys) {
                    this.#cache[key] = result[key];
                    this.#cache[key].raw = true;
                    // this.#keys is already populated
                }
                resolve(callback ? await callback() : undefined)
            }).withEventListener("error", (event) => reject(event.target.error));
        })
    }
    async remove(key,ifVersion) {
        if(TRANSACTION) return TRANSACTION.transaction.remove(this,key,ifVersion)
        const entry = this.getEntry(key);
        if(ifVersion && (!entry || entry.version!==ifVersion)) return false;
        return new Promise((resolve,reject) => {
            const idbTransaction = this.idb.transaction([this.#name],"readwrite"),
                idbObjectStore = idbTransaction.objectStore(this.#name),
                skey = toKey(key);
            idbTransaction.withEventListener("complete", (event) => {
                if(this.#cache[skey]!==undefined) {
                    this.#cache[skey] = null;
                    this.#keys.remove(key);
                }
                resolve();
            }).withEventListener("error", (event) => reject(event.target.error));
            idbObjectStore.delete(skey).withEventListener("error", (event) => reject(event.target.error));
        })
    }
    resetReadTxn() {
        throw new Error("resetReadTxn not implemented. Use resetReadTxnAsync instead.");
    }
    async resetReadTxnAsync() {
        if(TRANSACTION) await TRANSACTION;
        return new Promise((resolve,reject) => {
            const idb = this.idb,
                entries = {},
                storeName = this.#name,
                idbTransaction = idb.transaction([storeName],"readonly"),
                idbObjectStore = idbTransaction.objectStore(storeName);
            idbTransaction.withEventListener("complete", (event) => {
                resolve();
            }).withEventListener("error", (event) => {
                reject(event.target.error);
            });
            idbObjectStore.openCursor().withEventListener("success", (event) => {
                const cursor = event.target.result;
                if(cursor) {
                    const entry = entries[cursor.key] = cursor.value,
                        type = typeof(entry.value);
                    if(type==="string" || (entry.encrypted || entry.compression)) entry.raw = true;
                    cursor.continue();
                }
                this.#cache = entries;
                this.#keys = new Keys(...Object.keys(entries));
            }).withEventListener("error", (event) => {
                reject(event.target.error);
            });
        });
    }
    async transaction(callback) {
        if(TRANSACTION) await TRANSACTION;
        let resolver, rejector;
        const promise = new Promise(async (resolve, reject) => { resolver = resolve, rejector = reject; }),
            transaction = new Transaction();
        TRANSACTION = promise;
        TRANSACTION.transaction = transaction;
        setTimeout(async () => {
            try {
                const result = await callback();
                await transaction.commit(this);
                resolver(result);
            } catch (e) {
                rejector(e);
            } finally {
                TRANSACTION = null;
            }
        });
        return promise;
    }
}


const lmdbOpen = async (path,options={}) => {
    const databases = await indexedDB.databases(),
        db = databases.find(db => db.name === path);
    LMDB.options = options;
    return new Promise((resolve,reject) => {
        let request;
        if(!db) {
            request = indexedDB.open(path,1).withEventListener("upgradeneeded", (event) => {
                event.target.result.createObjectStore("null");
            })
        } else {
            request = indexedDB.open(path,db.version);
        }
        request.withEventListener("success", (event) => {
            resolve(LMDB.open({path,idb:event.target.result,...options}));
        })
    });
}

export {lmdbOpen as open}