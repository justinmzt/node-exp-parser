// Syntax Tree Regular Rule Plugin

const { parseDateQuery, Plugin } = require('./utils');
const Parser = require('../parser');
const Preprocess = require('../preprocess');
const { validate } = require('../validation');

const REG = require('../reg');

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
        const regString = value.replace(REG.ESCAPED_ASTERISK, '..').replace(REG.ESCAPE_WORD, '.').replace(REG.LIKE, '.*?');
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
        const query = parseDateQuery(value);
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
        const query = parseDateQuery(value);
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
        const query = parseDateQuery(value);
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
        const query = parseDateQuery(value);
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
        const query = parseDateQuery(value);
        return date <= (query['$gte'] || query);
    },
};

// 初始化字典
const iterator = (dict, target, keys) => {
    if (Object.prototype.toString.call(target) !== '[object Object]') {
        return dict[keys.join('.')] = target
    }
    Object.keys(target).forEach(key => {
        iterator(dict, target[key], [...keys, key])
    })
};

class Rule extends Plugin {
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

}

function exec(target, expression, option = {}) {
    if (typeof expression !== 'string') {
        return false
    }
    const validation = validate(expression);
    if (!validation.result) {
        return false
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