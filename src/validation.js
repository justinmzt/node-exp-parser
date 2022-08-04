const Parser = require('./parser');
const Preprocess = require('./preprocess');

const getValue = (expression, from, to) => {
    if (!expression || from === undefined || to === undefined) {
        return ''
    }
    return expression.substring(from, to)
};

const validate = (expression, pos) => {
    pos = pos || expression.length;
    if (pos > expression.length) {
        pos = expression.length
    }
    if (pos < 0) {
        pos = 0
    }

    const self = {};
    const process = new Preprocess(expression);
    const parser = new Parser(process);
    try {
        parser.parse();
        self.result = true;
    }
    catch (e) {
        self.result = false;
        self.errValue = e.lastTokenValue;
        self.errType = e.type;
        self.offset = e.offset;
        if (e.data && e.data.key) {
            self.key = e.data.key
        }
    }

    const token = parser.search(pos);
    if (token) {
        self.token = {
            from: token.from,
            to: token.to,
            type: token.type,
            value: getValue(process.origin, token.from, token.to),
        }
    }
    return self
};

exports.validate = validate;