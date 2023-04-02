# lmdb-indexeddb
LMDB API wrapped around IndexedDB to make LMDB available in the browser.

This is BETA software. Most unit tests are in place, but the software has not been heavily used.

# Installation

```javascript
npm install lmdb-indexeddb
```

# Usage

See [lmdb](https://github.com/kriszyp/lmdb-js) for documentation on the LMDB API.

```javascript

```javascript
import {open} from "lmdb-indexeddb"
```

# Examples

See the dircetory `examples` for examples.

## Kitchen Sink

```html
<script type="module">
    import {open} from "../lmdb-indexeddb.js";
    const db1 = await open("dummy",{useVersions:true,compression:true,cache:true}), //encryptionKey:"my password"
            db2 = await db1.openDB("child",{useVersions:true,encryptionKey:"my password",cache:true}),
            db3 = await db1.openDB("child2",{useVersions:true,encryptionKey:"my password",cache:true});
    console.log(db1.get("test1"));
    console.log(db2.get("test2"));
    await db1.put("test1","test1test1");
    await db2.put("test2","test2");
    console.log(db1.get("test1"));
    console.log(db2.get("test2"));
    console.log(await db1.getAsync("test1",true));
    console.log(await db2.getAsync("test2",true));
    // await db1.remove("test1");
    // await db2.remove("test2");
    console.log(db1.get("test1"));
    console.log(db2.get("test2"));
    await db2.transaction(() => {
        db1.put("test1a","test1a");
        db2.put("test2a","test2a");
    });
    console.log(db1.get("test1a"));
    console.log(db2.get("test2a"));
    console.log(await db1.getAsync("test1",true));
    console.log(await db2.getAsync("test2",true));
    try {
        await db2.transaction(() => {
            db1.put("test1b","test1b");
            db2.put("test2b","test2b");
            throw new Error("test error");
        });
    } catch (e) {
        console.log(e);
    }
    console.log(db1.get("test1b"));
    console.log(db2.get("test2b"));
    console.log(await db1.getAsync("test1",true));
    console.log(await db2.getAsync("test2",true));
    try {
        await db1.transaction(() => {
            db1.remove("test1a");
            db2.remove("test2a");
            throw new Error("test error");
        });
    } catch(e) {
        console.log(e);
    }
    console.log(db1.get("test1a"));
    console.log(db2.get("test2a"));
    console.log(await db1.getAsync("test1",true));
    console.log(await db2.getAsync("test2",true));
    try {
        await db1.transaction(() => {
            db1.remove("test1a");
            db2.remove("test2a");
        });
    } catch(e) {
        console.log(e);
    }
    console.log(db1.get("test1a"));
    console.log(db2.get("test2a"));
    console.log(await db1.getAsync("test1",true));
    console.log(await db2.getAsync("test2",true));
    await db3.put("test", {name:"test"});
    console.log(db3.get("test"));
    db3.clearSync();
    console.log(db3.get("test"));
    console.log(db3.getAsync("test",true));
    await db3.drop();
</script>

```

# Roadmap

## Replication

### Phase One

Addition of `replicate` method that will take `put`, `get`, `getKeys`, `remove` functions as arguments and either get values from a remote database or put and remove them from a remote database via HTTPS. Functions like `clear` and `drop` are not currently planned.

### Phase Two

Web sockets for push and pull replication. When a push is made the in memory cache will be updated accordingly. In order to avoid overload, the client will only get values for keys it on which it has done a `get` (effectively a subscribe) and will only get new keys that are within the range it has requested using `getKeys`.


# Implementation Notes

## API Calls

All API calls have the same sync or async signature as LMDB except `open` and `opendDB`, which are asynchronous only due to the nature of IndexedDB. The open option `cache` is always `true`. The options `encryptionKey`, `compression`, and `useVersions` are supported.

In order to support a synchronous API, the IndexedDB API is wrapped in a synchronous API that uses an in memory cache of all entries in the local database. This cache is updated on every `put` and `delete` call. This means that the cache is always up-to-date unless the database is modified outside of the API.

When an LMDB transaction is started it is done at a global level. All `put` and `delete` calls operate solely against a temporary cache until the user provided callback completes. Then, an IndexedDB transaction is started and all changes are written to IndexedDB. If the user provided callback throws an error or returns ABORT, the transaction is aborted and the primary cache and IndexedDB are not updated.

When synchronous versions of async functions that result in asynchronous IndexedDB activity are called, the IndexedDB functions are invoked but not tracked with the exception of errors, which are logged to the console. As a result, the use of `putSync`,`removeSync` and `clearSync` is DISCOURAGED and warnings are written to the console. The method `get`, which is synchronous, is safe to use since it only access the cache (all data in a local IndexedDB is loaded when the darabases is opened, no IndexedDB activity occurs when `get` is called).

A non-standard method `getEntryAsyc` is provided to allow the user to access the IndexedDB entry after opening. The method takes a `key` and an optional second argument `force` which, if `true`, will force the IndexedDB entry to be loaded into the cache. This is useful for debugging of if the database is updated via an alternate mechanism. To load multiple entries you can also use the standard method `prefetch`.

In addition to `version` and `value`, the entry object in the database may have the boolean properties `compression` and `encrypted`. For consistency, these are not returned to the calling program, but they will be transmitted once replication is supported. Because these properties are stored, compression and encryption are not all or nothing propositions like the are with the NodeJS version of LMDB. You can have some entries compressed and some not, and the same for encryption. They will be automatically detected and handled appropriately. Note, if you do open a database without an encryption key any entries that are encrypted will have an `Int32Array` in their value property. Finally, when `useVersions` is set to `false`, the `version` property will not be present in the entry object when returned; however, in the datastore it will be version 1 when the entry is first created.

The method `resetReadTxnAsync` will reset the cache of a database and load all data from IndexedDB. This is useful if the database is updated via an alternate mechanism. The method `resetReadTxn`is not implemented and will throw an error.

## Encryption and Compression

Theoretically, same encryption and compression algorithms are used as in the NodeJS version of LMDB. However, compatibility has not yet been tested.

# Updates (Reverse Chronological Order)

2023-04-03 v0.0.4 Unit tests for transactions, compression, encryption, and versions. Fixed issue with conditional versioning not working. Enhanced implementation notes.

2023-04-02 v0.0.3 Unit tests for keys and entries. Fixed issue with serializing symbols.

2023-04-01 v0.0.2 Unit tests for open, put, putSync, get, remove, removeSync, clearSync, clearAsync, drop, dropSync, transaction. 

2023-03-29 v0.0.1 Initial release. open, put, get, remove, transaction all at basic level of functionality