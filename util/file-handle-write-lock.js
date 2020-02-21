const fs = require('fs').promises;


/**
 * Using fs.promises.FileHandle's write method
 * can result in a race conditions if multiple async functions
 * are trying to write to the same file at once. It is not enough
 * to have each individual async function await fileHandle.write() because
 * this can still result in each async function trying to write to the file
 * at the same time because each new call to fileHandle.write() will return
 * a new promise. (each function are awaiting their own local promise).
 * <p>
 * This class handles this problem and can safely be used to write from
 * multiple async functions at once.
 */
class FileHandleWriteLock {
    constructor(fileHandle) {
        this._fileHandle = fileHandle;
        this._activePromise = null;
    }

    /**
     *
     * @returns {FileHandle} the fileHandle this FileHandleWriteLock controls
     */
    get fileHandle() {
        return this._fileHandle;
    }

    /**
     * Resolves when the underlying FileHandle is idle
     * @returns {Promise<void>}
     */
    async onIdle(action) {
        while (this._activePromise !== null) {
            try {
                await this._activePromise;
            } catch(e) {
                // no-op
            }
        }
        if (action) {
            action();
        }
    }

    /**
     * This method can safely be called from multiple async functions and will first write
     * the passed in data when the underlying FileHandle is idle
     * @param data the data to write
     * @returns {Promise<void>}
     */
    async write(data) {
        /*Async functions are invoked in the current tick but does first resolve after the next tick queue
        ( https://blog.insiderattack.net/promises-next-ticks-and-immediates-nodejs-event-loop-part-3-9226cbe7a6aa).
        So to make any following calls to await this.onIdle() in the current tick see that there is set an
        _activePromise we need to set it in the current tick inside onIdle. Otherwise

        for (let i = 0; i < 10; i++) {
            lock.write(i);
        }

        would not work as all calls to write are in the current tick (because we are missing the await in front of lock.write()).

        If await was used which would make each call to write in its own tick we could just have set _activePromise
        in this method method after the await this.onIdle() call, but that wouldn't be flexible enough.
        */
        await this.onIdle(() => {
            this._activePromise = this._fileHandle.write(data);
        });
        let result = await this._activePromise;
        this._activePromise = null;
        return result;
    }

    /**
     * Close the underlying FileHandle
     * @returns {Promise<void>}
     */
    async close() {
        await this.onIdle();
        await this._fileHandle.close();
    }

    /**
     * Open a fileHandle and wraps it in a FileHandleWriteLock
     * See https://nodejs.org/api/fs.html#fs_fspromises_open_path_flags_mode
     * @param path
     * @param flags default 'a'
     * @returns {Promise<FileHandleWriteLock>}
     */
    static async open(path, flags = 'a') {
        let fileHandle = await fs.open(path, flags);
        return new FileHandleWriteLock(fileHandle);
    }
}

module.exports = FileHandleWriteLock;



