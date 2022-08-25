// Syntax Tree Regular Rule Plugin

const { parseDateQuery, Plugin } = require('./utils');
const Parser = require('../parser');
const Preprocess = require('../preprocess');
const { validate } = require('../validation');

const REG = require('../reg');

const comparatorController = {
    ['=']: (dict, key, value) => {
        if (value === undefined) {
            return
        }
        return Dict.append(dict, key, value)
    },
    ['like']: (dict, key, value) => {
        if (value === undefined) {
            return
        }
        const regString = value.replace(REG.ESCAPED_ASTERISK, '..').replace(REG.ESCAPE_WORD, '.').replace(REG.LIKE, '.*?');
        return Dict.append(dict, key, regString)
    },
    ['exists']: (dict, key) => {
        return Dict.append(dict, key, true)
    },
    ['empty']: (dict, key) => {
        return Dict.append(dict, key, false)
    },
    ['date']: (dict, key, value, gt = true, lt = true) => {
        if (value === undefined) {
            return
        }
        const query = parseDateQuery(value);
        if (gt && query['$gte']) {
            Dict.append(dict, key, query['$gte']);
        }
        if (lt && query['$lt']) {
            Dict.append(dict, key, query['$lt']);
        }
        if (!query['$gte'] && !query['$lt']) {
            Dict.append(dict, key, query);
        }
    },
};

comparatorController['in'] = comparatorController['='];
comparatorController['>'] = comparatorController['='];
comparatorController['>='] = comparatorController['='];
comparatorController['<'] = comparatorController['='];
comparatorController['<='] = comparatorController['='];
comparatorController['date>'] = (dict, key, value) => {
    comparatorController['date'](dict, key, value, true, false)
};
comparatorController['date>='] = (dict, key, value) => {
    comparatorController['date'](dict, key, value, true, false)
};
comparatorController['date<'] = (dict, key, value) => {
    comparatorController['date'](dict, key, value, false, true)
};
comparatorController['date<='] = (dict, key, value) => {
    comparatorController['date'](dict, key, value, false, true)
};

class Dict extends Plugin {
    constructor(option) {
        super(option);
        this.dict = {};
    }

    static append(dict, key, value) {
        if (!dict[key]) {
            dict[key] = []
        }
        dict[key].push(value)
    }

    evaluate(node) {
        if (node.hasOwnProperty('expression')) {
            this.evaluate(node.expression);
            return
        }

        if (node.type === 'binary') {
            node = node.content;
            this.evaluate(node.left);
            this.evaluate(node.right);
            return
        }
        if (node.type === 'unary') {
            node = node.content;
            if (node.operator === '!' || node.operator === 'not') {
                this.evaluate(node.expression);
                return
            }
        }
        if (node.type === 'comparison') {
            this._genComparison(node.content);
        }
    }

    _genComparison(node) {
        /* {
          "comparator": ":",
          "key": "C",
          "value": "D"
        }*/
        var comparator = node.comparator;
        var key = this.map[node.key] || node.key;
        var value = node.value ? this._handleValue(node.value) : '';
        if (comparatorController[comparator]) {
            comparatorController[comparator](this.dict, key, value)
        }

    }
}

function exec(expression, option = {}) {
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
    const entity = new Dict(option);
    entity.evaluate(exp);
    return entity.dict
}

module.exports = {
    exec
};