class Exception extends Error {
    constructor(process, type, lastToken, data) {
        super();
        this.type = type;
        this.lastToken = lastToken;
        this.data = data;

        this.lastTokenValue = lastToken ? process.restore(lastToken.value) || '' : '';
        this.lastTokenType = lastToken ? lastToken.type || '' : '';
        this.offset = lastToken ? lastToken.offset : null;
        this.name = 'Error';
        this.message = 'Expecting ' + type + ', last Token: ' + this.lastTokenValue + ' (' + this.lastTokenType + ')';
    }
}

module.exports = Exception;