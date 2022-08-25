
const Parser = require('../parser');

const REG = require('../reg');

// 解析日期字符串
function _parseDateValue(value = '') {
    const self = {};
    if (REG.DATE.test(value)) {
        return { result: new Date(value) }
    }
    self.match = value.match(REG.DATE_YEAR);
    if (self.match) {
        const year = parseInt(self.match[1]);
        return { $gte: new Date(`${year}/01/01`), $lt: new Date(`${year + 1 }/01/01`) }
    }
    self.match = value.match(REG.DATE_MONTH);
    if (self.match) {
        const month = self.match[1];
        const begin = new Date(`${month}/01`);
        const end = new Date(`${month}/01`);
        end.setMonth(begin.getMonth() + 1);
        return { $gte: begin, $lt: end }
    }
    self.match = value.match(REG.DATE_DAY);
    if (self.match) {
        const date = self.match[1];
        const begin = new Date(`${date}`);
        const end = new Date(`${date}`);
        end.setDate(begin.getDate() + 1);
        return { $gte: begin, $lt: end }
    }
}

function parseDateQuery(value) {
    if (value.length === 1) {
        const date = _parseDateValue(value[0]);
        if (date) {
            return date.result || date
        }
    }
    if (value.length > 1) {
        const date = [_parseDateValue(value[0]), _parseDateValue(value[1])];
        if (date[0] && date[1]) {
            return { $gte: date[0].result || date[0]['$gte'], $lt: date[1].result || date[1]['$lt'] }
        }
    }
}

class Plugin {
    constructor(option = {}) {
        this.option = Object.assign({
            keyLang: 'default'
        }, option);
        this.map = Parser.config.keymap[this.option.keyLang] || {};
    }

    // might be better to do Type detection when tokenizing..
    _handleValue(value) {
        if (value instanceof Array) {
            return value.map(item => {
                return this._handleValue(item)
            })
        }
        if (value.match(REG.NUMBER)) {
            return parseFloat(value);
        }
        return value
            .replace(REG.ESCAPED_DOLLAR, ($, $1) => {
                return $1
            })
            .replace(REG.ESCAPED_DOT, ($, $1) => {
                return $1
            });
    }
}

module.exports = {
    parseDateQuery,
    Plugin,
};