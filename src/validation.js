const Parser = require("../index");

const validate = (expression) => {
    const self = {};
    try {
        Parser.etot(expression);
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
        // console.error(e)
    }
    return self
};

exports.validate = validate;