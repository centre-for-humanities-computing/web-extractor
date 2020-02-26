const fs = require('fs').promises;
const AwaitLock = require('await-lock').default;

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
        this._lock = new AwaitLock();
    }

    /**
     *
     * @returns {FileHandle} the fileHandle this FileHandleWriteLock controls
     */
    get fileHandle() {
        return this._fileHandle;
    }

    /**
     * This method can safely be called from multiple async functions and will first write
     * the passed in data when the underlying FileHandle is idle
     * @param data the data to write
     * @returns {Promise<void>}
     */
    async write(data) {
        let result = null;
        try {
            await this._lock.acquireAsync();
            await this._fileHandle.write(data);
        } finally {
            this._lock.release();
        }
    }

    /**
     * Close the underlying FileHandle
     * @returns {Promise<void>}
     */
    async close() {
        try {
            await this._lock.acquireAsync();
            await this._fileHandle.close();
        } finally {
            this._lock.release();
        }

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



