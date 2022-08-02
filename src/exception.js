class Exception extends Error {
    constructor(type, lastToken) {
        super();
        this.type = type;
        this.lastToken = lastToken;

        this.lastTokenValue = lastToken ? lastToken.value || '' : '';
        this.lastTokenType = lastToken ? lastToken.type || '' : '';
        this.name = 'Error';
        this.message = 'Expecting ' + type + ', last Token: ' + this.lastTokenValue + ' (' + this.lastTokenType + ')';
    }
}

module.exports = Exception;