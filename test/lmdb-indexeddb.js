const expect = chai.expect;

const REPLICATION_FUNCTIONS = {
    async getRawEntryAsync(key) {
        const item = localStorage.getItem(JSON.stringify(key));
        if(item) {
            return JSON.parse(item);
        }
    },
    putRawEntry(key,entry) {
        localStorage.setItem(JSON.stringify(key),JSON.stringify(entry));
        return true;
    },
    remove(key) {
        const item = localStorage.getItem(JSON.stringify(key));
        if (item) {
            localStorage.removeItem(key);
        }
        return !!item;
    }
};

localStorage.clear();

describe("lmdb-indexeddb", () => {
    let db
    it("open", async () => {
        db = await open("test");
        expect(db.path).to.equal("test");
        expect(db.name).to.equal("null");
        expect(db.version).to.equal(1);
    });
    it("put and get", async () => {
       const p = await db.put("hello", "world");
       expect(p).to.equal(true);
       const g = db.get("hello");
       expect(g).to.equal("world");
    });
    it("remove", async () => {
        const d1 = await db.remove("hello");
        expect(d1).to.equal(true);
        const g = db.get("hello");
        expect(g).to.equal(undefined);
        const d2 = await db.remove("hello");
        expect(d2).to.equal(false);
    });
    it("putSync and removeSync", () => {
        const p = db.putSync("hello", "world");
        const d1 = db.removeSync("hello");
        expect(d1).to.equal(true);
        const g = db.get("hello");
        expect(g).to.equal(undefined);
        const d2 = db.removeSync("hello");
        expect(d2).to.equal(false);
    });
    it("clearAsync", async () => {
        await db.put("hello", "world");
        const c = await db.clearAsync();
        expect(c).to.equal(undefined);
        const g = db.get("hello");
        expect(g).to.equal(undefined);
    });
    it("clearSync", async () => {
        await db.put("hello", "world");
        const c = db.clearSync();
        expect(c).to.equal(undefined);
        const g = db.get("hello");
        expect(g).to.equal(undefined);
    });
    it("transaction with wait", async () => {
        await db.transaction(async () => {
            await db.put("hello", "world");
        });
        const g = db.get("hello");
        expect(g).to.equal("world");
        await db.clearAsync();
    });
    it("transaction without inner wait", async () => {
        await db.transaction(async () => {
            db.put("hello", "world");
        });
        const g = db.get("hello");
        expect(g).to.equal("world");
        await db.clearAsync();
    });
    it("transaction with throw", async () => {
        const badError = new Error("transaction should have failed");
        try {
            await db.transaction(async () => {
                await db.put("hello", "world");
                throw new Error("abort");
            });
            throw badError
        } catch(e) {
            expect(e).to.be.instanceof(Error);
            expect(e===badError).to.equal(false);
        }
        const g = db.get("hello");
        expect(g).to.equal(undefined);
    });
    it("transaction with ABORT", async () => {
        const badError = new Error("transaction should have failed"),
            result = await db.transaction(async () => {
                await db.put("hello", "world");
                return ABORT
            });
        expect(result).to.equal(ABORT);
        const g = db.get("hello");
        expect(g).to.equal(undefined);
    });
    it("keys and entries", async () => {
        const keys = [null,Symbol.for("symbol"),false,true,"A","a"];
        for(const key of [...keys].reverse()) {
            await db.put(key, key);
        }
        const theKeys = [...await db.getKeys()];
        expect(theKeys.every((key,i) => key===keys[i])).to.equal(true);
        const theEntries = [...await db.getRange()];
        expect(theEntries.every((entry,i) => entry.value===keys[i])).to.equal(true);
        await db.clearAsync();
    });
    it("drop", async () => {
        await db.put("hello", "world");
        const d = await db.drop();
        expect(d).to.equal(undefined);
        try {
           db.get("hello");
           throw new Error("drop failed");
        } catch (e) {
            expect(e).to.be.instanceof(Error)
        }
    });
    it("open and put/get compressed", async () => {
        db = await open("test",{compression:true});
        const p = await db.put("hello", "world");
        expect(p).to.equal(true);
        const g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.compression).to.equal(undefined);
        return new Promise((resolve,reject) => {
            const request = db.idb.transaction(["null"]).objectStore("null").get(JSON.stringify("hello"));
            request.onsuccess = () => {
                const entry = request.result;
                expect(entry.compressed).to.equal(true);
                expect(typeof(entry.value)).to.equal("string");
                expect(entry.value).to.not.equal(JSON.stringify("world"));
                resolve();
            }
            request.onerror = reject;
        }).then(async () => {
            await db.drop();
        });
    });
    it("open and put/get encrypted", async () => {
        db = await open("test",{encryptionKey:"encrypt"});
        const p = await db.put("hello", "world");
        expect(p).to.equal(true);
        const g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.encrypted).to.equal(undefined);
        return new Promise((resolve,reject) => {
            const request = db.idb.transaction(["null"]).objectStore("null").get(JSON.stringify("hello"));
            request.onsuccess = () => {
                const entry = request.result;
                expect(entry.encrypted).to.equal(true);
                expect(typeof(entry.value)).to.equal("object");
                expect(entry.value).to.be.instanceOf(Int32Array);
                resolve();
            }
            request.onerror = reject;
        }).then(async () => {
            await db.drop();
        });
    });
    it("open useVersions", async () => {
        db = await open("test",{useVersions:true});
        let p = await db.put("hello", "world");
        expect(p).to.equal(true);
        let g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(1);
        await db.put("hello", "world",2);
        g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(2);
        await db.put("hello", "world",3,1);
        g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(2);
        db.putSync("hello", "world",3,1);
        g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(2);
        await db.put("hello", "world",3,2);
        g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(3);
        await db.drop();
    });
    it("replicate put", async () => {
        db = await open("test",{useVersions:true});
        db.replication(REPLICATION_FUNCTIONS);
        await db.put("hello", "world");
        const g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(1);
        const item = localStorage.getItem(JSON.stringify("hello")); // JSON.stringify("hello")
        expect(typeof(item)).to.equal("string");
        const entry = JSON.parse(item);
        expect(entry.value).to.equal("world");
        localStorage.clear();
        await db.drop();
    })
    it("don't replicate put, but pull, when server version greater", async () => {
        const delay = 50,
            entry = {value:"world",version:2,mtime:Date.now()+delay};
        localStorage.setItem(JSON.stringify("hello"),JSON.stringify(entry));
        db = await open("test",{useVersions:true});
        db.replication(REPLICATION_FUNCTIONS);
        const p = await db.put("hello", "world");
        expect(p).to.equal(false);
        const g = await db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(2);
        const item = localStorage.getItem(JSON.stringify("hello")); // JSON.stringify("hello")
        expect(typeof(item)).to.equal("string");
        const result = JSON.parse(item);
        expect(entry.value).to.equal("world");
        expect(result.mtime).to.equal(entry.mtime);
        localStorage.clear();
        await db.drop();
    })
    it("pull replicate on get when server more recent", async () => {
        db = await open("test");
        db.replication(REPLICATION_FUNCTIONS)
        await db.put("hello", "world");
        const delay = 50,
            entry = {value:"my world",version:1,mtime:Date.now()+delay};
        localStorage.setItem(JSON.stringify("hello"),JSON.stringify(entry));
        const ga = await db.getEntryAsync("hello");
        expect(ga.value).to.equal("my world");
        expect(ga.version).to.equal(1);
        const g = db.getEntry("hello");
        expect(g.value).to.equal("my world");
        expect(g.version).to.equal(1);
        localStorage.clear();
        await db.drop();
    })
    it("remove replicated", async () => {
        db = await open("test",{useVersions:true});
        await db.put("hello","world");
        const delay = 50,
            entry = {value:"world",version:2,mtime:Date.now()+delay};
        localStorage.setItem(JSON.stringify("hello"),JSON.stringify(entry));
        db.replication(REPLICATION_FUNCTIONS);
        const result = await db.remove("hello");
        expect(result).to.equal(false);
        const g = db.getEntry("hello");
        expect(g.value).to.equal("world");
        expect(g.version).to.equal(2);
        localStorage.clear();
        await db.drop();
    })
    it("fail and pull for remove when server more recent", async () => {
        const entry = {value:"world",version:1,mtime:Date.now()};
        localStorage.setItem(JSON.stringify("hello"),JSON.stringify(entry));
        db = await open("test",{useVersions:true});
        db.replication(REPLICATION_FUNCTIONS);
        const result = await db.remove("hello");
        expect(result).to.equal(true);
        localStorage.clear();
        await db.drop();
    })
})