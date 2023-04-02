const expect = chai.expect
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
})