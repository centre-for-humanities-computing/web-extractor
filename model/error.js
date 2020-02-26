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

class NullError extends Error {

    constructor(...params) {
        super(...params);

        this.name = 'NullError';

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, NullError);
        }
    }

}

module.exports = {
    HttpError: HttpError,
    NullError: NullError
};