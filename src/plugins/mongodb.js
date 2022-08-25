// Syntax Tree MongoDB Plugin
// BUG => AlertName != "SYSTEM DOWN - SERVER" and AlertName!= "SNMP NOT RESPONDING - SERVER" =>DOUBLE KEY

const { parseDateQuery, Plugin } = require('./utils');
const Parser = require('../parser');
const Preprocess = require('../preprocess');
const { validate } = require('../validation');

const REG = require('../reg');

const comparatorController = {
    ['=']: (self, key, value) => {
        self[key] = value;
    },
    ['like']: (self, key, value) => {
        const regString = value.replace(REG.ESCAPED_ASTERISK, '..').replace(REG.ESCAPE_WORD, '.').replace(REG.LIKE, '.*?');
        self[key] = {
            $regex: regString,
            $options: 'i'
        };

    },
    ['in']: (self, key, value) => {
        self[key] = { $in: value }
    },
    ['date']: (self, key, value) => {
        self[key] = parseDateQuery(value);
    },
    ['empty']: (self, key) => {
        self[key] = {
            $exists: false
        };
    },
    ['exists']: (self, key) => {
        self[key] = {
            $exists: true
        };
    },
    ['>']: (self, key, value) => {
        self[key] = {
            $gt: value
        };
    },
    ['date>']: (self, key, value) => {
        const date = parseDateQuery(value);
        self[key] = {
            $gt: date['$gte'] || date
        }
    },
    ['>=']: (self, key, value) => {
        self[key] = {
            $gte: value
        };
    },
    ['date>=']: (self, key, value) => {
        const date = parseDateQuery(value);
        self[key] = {
            $gte: date['$gte'] || date
        }
    },
    ['<']: (self, key, value) => {
        self[key] = {
            $lt: value
        };
    },
    ['date<']: (self, key, value) => {
        const date = parseDateQuery(value);
        self[key] = {
            $lt: date['$lt'] || date
        }
    },
    ['<=']: (self, key, value) => {
        self[key] = {
            $lte: value
        };
    },
    ['date<=']: (self, key, value) => {
        const date = parseDateQuery(value);
        self[key] = {
            $lte: date['$lt'] || date
        }
    },
};

function isArray(a) {
    return a instanceof Array
}

function extend(o1, o2) {
    var ret = {};
    if (isArray(o1) || isArray(o2)) {
        ret['$and'] = [];
        if (isArray(o1)) {
            ret['$and'].push({
                '$or': o1
            });
        } else {
            ret['$and'].push(o1);
        }
        if (isArray(o2)) {
            ret['$and'].push({
                '$or': o2
            });
        } else {
            ret['$and'].push(o2);
        }
        return ret;
    }
    for (let k of Object.keys(o1)) {
        ret[k] = o1[k];
    }
    for (let k of Object.keys(o2)) {
        if (ret[k] !== undefined) {
            ret['$and'] = [];
            ret['$and'].push({
                [k]: o2[k]
            });
            ret['$and'].push({
                [k]: ret[k]
            });
            delete ret[k];
        }
        else {
            ret[k] = o2[k];
        }
    }
    return ret;
}

class MongoDBParser extends Plugin {
    evaluate(node) {
        if (node.hasOwnProperty('expression')) {
            var exp = this.evaluate(node.expression);
            return exp
        }

        if (node.type === 'binary') {
            node = node.content;
            var left = this.evaluate(node.left);
            var right = this.evaluate(node.right);
            if (node.operator === 'or') {
                return [].concat(left, right);
            }
            if (node.operator === 'and') {
                var and = extend(left, right);
                return and;
            }
        }
        if (node.type === 'unary') {
            node = node.content;
            if (node.operator === '!' || node.operator === 'not') {
                var expression = this.evaluate(node.expression);
                let nor = { $nor: [expression] };
                if (isArray(expression)) {
                    nor = {
                        $nor: [{
                            $or: expression
                        }]
                    }

                }
                return nor;
            }
        }
        if (node.type === 'comparison') {
            return this._genComparison(node.content);
        }
        return {}
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
        var result = {};

        if (comparatorController[comparator]) {
            comparatorController[comparator](result, key, value)
        }

        return result;
    }

}

/**
 * @function Expression To MongoDB Query
 * @param expression
 * @param option
 * @param option.keyLang: 表达式 key 的语言，对应 keymap
 */
function exec(expression, option = {}) {
    if (typeof expression !== 'string') {
        return {}
    }
    const validation = validate(expression);
    if (!validation.result) {
        return {}
    }
    const process = new Preprocess(expression);
    const parser = new Parser(process);
    const exp = parser.parse();
    const dbParser = new MongoDBParser(option);
    const query = dbParser.evaluate(exp);
    if (query instanceof Array) {
        return {
            $or: query
        }
    }
    return query
}

module.exports = {
    exec
};