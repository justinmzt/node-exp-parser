const Parser = require('../index');

module.exports = {
    dictTest: (self) => {
        const dict = Parser.getDict(self.exp, self.opts);
        if (JSON.stringify(dict) !== self.dict) {
            console.error(JSON.stringify(dict), '***********Dict Error');
            return false
        }
        return true
    }
};