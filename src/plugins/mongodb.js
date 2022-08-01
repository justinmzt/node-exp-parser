// Syntax Tree MongoDB Plugin
// BUG => AlertName != "SYSTEM DOWN - SERVER" and AlertName!= "SNMP NOT RESPONDING - SERVER" =>DOUBLE KEY

const { Parser } = require('../parser');
const comparatorController = {
    ['=']: (self, key, value) => {
        self[key] = value;
    },
    ['like']: (self, key, value, not) => {
        var regString = value.replace(/\\\*/g, '..').replace(/[^\u4E00-\u9FA5\w\-_*]/g, '.').replace(/(?<!\\)\*/g, '.*?');
        if (!not) {
            self[key] = {
                $regex: regString,
                $options: 'i'
            };
        }
        else {
            self[key] = { $not: regString }
        }
    },
    ['in']: (self, key, value, not) => {
        self[key] = not ? { $nin: value } : { $in: value }
    },
    ['date']: (self, key, value) => {
        self[key] = _parseDateQuery(value);
    },
    ['empty']: (self, key, value, not) => {
        self[key] = {
            $exists: not
        };
    },
    ['exists']: (self, key, value, not) => {
        self[key] = {
            $exists: !not
        };
    },
    ['>']: (self, key, value) => {
        self[key] = {
            $gt: value
        };
    },
    ['date>']: (self, key, value) => {
        const date = _parseDateQuery(value);
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
        const date = _parseDateQuery(value);
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
        const date = _parseDateQuery(value);
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
        const date = _parseDateQuery(value);
        self[key] = {
            $lte: date['$lt'] || date
        }
    },
};

function isArray(a) {
    return (a instanceof Array)
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
    for (k in o1) {
        ret[k] = o1[k];
    }
    for (k in o2) {
        if (k in ret) {
            ret['$and'] = [];
            var a = {};
            a[k] = o2[k];
            ret['$and'].push(a);
            var a = {};
            a[k] = ret[k];
            ret['$and'].push(a);
            delete ret[k];
        } else {
            ret[k] = o2[k];
        }
    }
    return ret;
}

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


class MongoDBParser {
    constructor(option) {
        this.option = Object.assign({
            keyLang: 'default'
        }, option);
        this.map = Parser.config.keymap[this.option.keyLang] || {};
    }

    evaluate(node, not = false) {
        if (node.hasOwnProperty('expression')) {
            var exp = this.evaluate(node.expression, not);
            return exp
        }

        if (node.type === 'binary' && !not) {
            node = node.content;
            var left = this.evaluate(node.left, not);
            var right = this.evaluate(node.right, not);
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
                var expression = this.evaluate(node.expression, not);
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
            return this._genComparison(node.content, not);
        }
        return {}
    }

    _genComparison(node, not) {
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
            comparatorController[comparator](result, key, value, not)
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

function exec(process, option) {
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