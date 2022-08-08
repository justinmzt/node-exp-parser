// Syntax Tree Regular Rule Plugin

const Parser = require('../parser');
const Preprocess = require('../preprocess');

const comparatorController = {
    ['=']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        return target[key] === value;
    },
    ['like']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        if (!target[key] || !target[key] instanceof String) {
            return false
        }
        const regString = value.replace(/\\\*/g, '..').replace(/[^\u4E00-\u9FA5\w\-_*]/g, '.').replace(/(?<!\\)\*/g, '.*?');
        const reg = new RegExp(regString, 'i');
        return reg.test(target[key]);
    },
    ['in']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        let result = false;
        for (let i = 0; i < value.length; i++) {
            if (target[key] === value[i]) {
                result = true
            }
        }
        return result
    },
    ['date']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        const date = new Date(target[key]);
        const query = _parseDateQuery(value);
        if (query['$gte']) {
            return date >= query['$gte'] && date < query['$lt']
        }
        else {
            return date === query
        }
    },
    ['empty']: (target, key) => {
        return target[key] === undefined;
    },
    ['exists']: (target, key) => {
        return !(target[key] === undefined);
    },
    ['>']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        return target[key] > value
    },
    ['date>']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        const date = new Date(target[key]);
        const query = _parseDateQuery(value);
        return date > (query['$gte'] || query);
    },
    ['>=']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        return target[key] >= value
    },
    ['date>=']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        const date = new Date(target[key]);
        const query = _parseDateQuery(value);
        return date >= (query['$gte'] || query);
    },
    ['<']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        return target[key] < value
    },
    ['date<']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        const date = new Date(target[key]);
        const query = _parseDateQuery(value);
        return date < (query['$gte'] || query);
    },
    ['<=']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        return target[key] <= value
    },
    ['date<=']: (target, key, value) => {
        if (target[key] === undefined || value === undefined) {
            return false
        }
        const date = new Date(target[key]);
        const query = _parseDateQuery(value);
        return date <= (query['$gte'] || query);
    },
};

// 解析日期字符串
function _parseDateValue(value = '') {
    const self = {};
    if (/\d\d\d\d\/\d\d\/\d\d \d\d:\d\d:\d\d/.test(value)) {
        return { result: new Date(value) }
    }
    self.match = value.match(/^((?:19|20)\d\d)\*$/);
    if (self.match) {
        const year = parseInt(self.match[1]);
        return { $gte: new Date(`${year}/01/01`), $lt: new Date(`${year + 1 }/01/01`) }
    }
    self.match = value.match(/^((?:19|20)\d\d\/[01]\d)\*$/);
    if (self.match) {
        const month = self.match[1];
        const begin = new Date(`${month}/01`);
        const end = new Date(`${month}/01`);
        end.setMonth(begin.getMonth() + 1);
        return { $gte: begin, $lt: end }
    }
    self.match = value.match(/^((?:19|20)\d\d\/[01]\d\/[0-3]\d)\*$/);
    if (self.match) {
        const date = self.match[1];
        const begin = new Date(`${date}`);
        const end = new Date(`${date}`);
        end.setDate(begin.getDate() + 1);
        return { $gte: begin, $lt: end }
    }
}

// 解析日期字符串数组
function _parseDateQuery(value) {
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

// 初始化字典
const iterator = (dict, target, keys) => {
    if (Object.prototype.toString.call(target) !== '[object Object]') {
        return dict[keys.join('.')] = target
    }
    Object.keys(target).forEach(key => {
        iterator(dict, target[key], [...keys, key])
    })
};

class Rule {
    constructor(option) {
        this.option = Object.assign({
            keyLang: 'default'
        }, option);
        this.map = Parser.config.keymap[this.option.keyLang] || {};
    }

    evaluate(node, target) {
        if (node.hasOwnProperty('expression')) {
            return this.evaluate(node.expression, target);
        }

        if (node.type === 'binary') {
            node = node.content;
            const left = this.evaluate(node.left, target);
            const right = this.evaluate(node.right, target);
            if (node.operator === 'or') {
                return left || right
            }
            if (node.operator === 'and') {
                return left && right
            }
        }
        if (node.type === 'unary') {
            node = node.content;
            if (node.operator === '!' || node.operator === 'not') {
                const result = this.evaluate(node.expression, target);
                return !result;
            }
        }
        if (node.type === 'comparison') {
            return this._genComparison(node.content, target);
        }
        return false
    }

    _genComparison(node, target) {
        /* {
          "comparator": ":",
          "key": "C",
          "value": "D"
        }*/
        var comparator = node.comparator;
        var key = this.map[node.key] || node.key;
        var value = node.value ? this._handleValue(node.value) : '';
        let result = false;

        if (comparatorController[comparator]) {
            result = comparatorController[comparator](target, key, value)
        }

        return result;
    }

    // might be better to do Type detection when tokenizing..
    _handleValue(value) {
        if (value instanceof Array) {
            return value.map(item => {
                return this._handleValue(item)
            })
        }
        if (value.match(/^[-]{0,1}\d*$/)) {
            return parseInt(value);
        }
        return value
            .replace(/"/g, '')
            .replace(/\\([*$])/g, ($, $1) => {
                return $1
            });
    }

}

function exec(target, expression, option = {}) {
    if (typeof expression !== 'string') {
        return {}
    }
    const process = new Preprocess(expression);
    const parser = new Parser(process);
    const exp = parser.parse();
    const rule = new Rule(option);
    const dict = {};
    iterator(dict, target, []);
    return rule.evaluate(exp, dict);
}

module.exports = {
    exec
};