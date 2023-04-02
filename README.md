# lmdb-indexeddb
LMDB API wrapped around IndexedDB to make LMDB available in the browser.

This is ALPHA software. Many unit tests not yet in place.

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

# Implementation Notes

All API calls have the same sync or async signature as LMDB except `open` and `opendDB`, which are asynchronous only due to the nature of IndexedDB.

In order to support a synchronous API, the IndexedDB API is wrapped in a synchronous API that uses an in memory cache of all entries in the local database. This cache is updated on every `put` and `delete` call. This means that the cache is always up-to-date unless the database is modified outside of the API.

When an LMDB transaction is started it is done at a global level. All `put` and `delete` calls operate solely against a temporary cache until the user provided callback completes. Then, an IndexedDB transaction is started and all changes are written to IndexedDB. If the user provided callback throws an error or returns ABORT, the transaction is aborted and the primary cache and IndexedDB are not updated.

When synchronous versions of async functions that result in asynchronous IndexedDB activity are called, the IndexedDB functions are invoked but not tracked with the exception of errors, which are logged to the console.

# Updates (Reverse Chronological Order)

2023-04-01 v0.0.2 Unit tests for open, put, putSync, get, remove, removeSync, clearSync, clearAsync, drop, dropSync, transaction. 

2023-03-29 v0.0.1 Initial release. open, put, get, remove, transaction all at basic level of functionality