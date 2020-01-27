class HttpError extends Error {

    constructor(statusCode, ...params) {
        super(...params);

        this.name = 'HttpError';
        this.statusCode = statusCode;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, HttpError);
        }
    }

}

module.exports = {
    HttpError: HttpError
};