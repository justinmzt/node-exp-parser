function Expecting(type, lastToken) {
    this.type = type;
    this.lastToken = lastToken;

    this.lastTokenValue = lastToken ? lastToken.value || '' : '';
    this.lastTokenType = lastToken ? lastToken.type || '' : '';
    this.name = 'Expecting';
    this.message = 'Expecting ' + type + ', last Token: ' + this.lastTokenValue + ' (' + this.lastTokenType + ')';
}

Expecting.prototype = new Error();
Expecting.prototype.constructor = Error;

function Token(type, value) {
    this.type = type;
    this.value = value.trim();
    this.isKey = function () {
        return this.type == 'key';
    }
    this.isValue = function () {
        return this.type == 'value';
    }
    this.isComparator = function () {
        return this.type == 'comparator';
    }
    this.isOperator = function () {
        return this.type == 'operator';
    }
    this.isNot = function () {
        return (this.type == 'operator' && (this.value == '!' || this.value == 'not'));
    }
    this.isAnd = function () {
        return (this.type == 'operator' && (this.value == 'and' || this.value == '&&'))
    }
    this.isOr = function () {
        return (this.type == 'operator' && (this.value == 'or' || this.value == '||'))
    }
    this.isEnd = function () {
        return this.type == 'END'
    }
}

function Tokenizer(expression) {
    // distinction between key and value are nor helpfull... both are "strings"
    var tokenDef = {
        // 'key': /^ *([a-zA-Z0-9-]{1,}) *(=|>=|<=|>|<|!=)/,
        //'key': /^ *([a-zA-Z0-9-]{1,}) */,
        'comparator': /^ *(?:\:|>=|<=|>|<) */, // in['a','b'] -> $in:['a','b'];  >= ; <=
        'operator': /^(not) ?|^(and) ?|^(or) ?|^(&&) ?|^(\|\|) ?|^(\() ?|^(\)) ?|^(!) ?/, //|^(!) ?
        //'string': /^ *(([a-zA-Z0-9-_\.\*%:\\\/\.]{1,})|([\'\"][a-zA-Z0-9-_\.\*%:\(\)\\\/\. ]{1,}[\'\"])) */
        'string': /^ *(([a-zA-Z0-9-_\.\*%\\\/\.\$]+)|(\'[a-zA-Z0-9-_\.\*%\(\)\\\/\.\$ ]+\')|(\"[a-zA-Z0-9-_\.\*%\(\)\\\/\.\$ ]+\")) */
    };
    this.tokens = [];

    this.originalExpression = expression;
    this.peek = function () {
        var token = null;
        expression = expression.trim();
        for (var tokenType in tokenDef) {
            var type = tokenType;
            var re = tokenDef[tokenType];
            var match = expression.match(re);
            if (match) {
                if (tokenType == 'string') {
                    if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type == 'comparator') {
                        type = 'value';
                    } else {
                        type = 'key';
                    }
                }

                token = new Token(type, ((match[1] || match[0]).trim()));
                break;
            }
        }

        if (!token) {

            return new Token('END', '')
        } else {
            return token;
        }
    }

    this.next = function () {
        var token = this.peek();
        this.tokens.push(token);
        expression = expression.replace(token.value, '');
        return token;
    }

    this.tokenize = function () {
        while (expression.length > 0) {
            this.next();
        }
    }

    this.last = function () {
        return this.tokens[this.tokens.length - 1].type == 'END' ? this.tokens[this.tokens.length - 2] : this.tokens[this.tokens.length - 1];
    }
}

function Parser(process) {
    this.process = process;
    const expression = process.exp;
    this.expression = expression;
    var that = this;
    that.tokenizer = (expression) ? new Tokenizer(expression) : new Tokenizer('');

    // if (expression) that.tokenizer = new Tokenizer(expression);
    // Condition ::= Key '=' Value |
    // 		  		 Key '>' Value |
    //		 		 Key '<' Value |
    //				 Key

    function parseCondition() {
        var keyToken = that.tokenizer.next();
        if (!keyToken.isKey() && !keyToken.isValue()) {
            throw new Expecting('KEY', that.tokenizer.last());
        }
        var compToken = that.tokenizer.peek();
        if (compToken && compToken.isComparator()) {
            compToken = that.tokenizer.next();
        }
        else {
            return {
                comparator: 'exists',
                key: process.restore(keyToken.value),
            }
        }
        if (!compToken || !compToken.isComparator()) {
            throw new Expecting('COMPARATOR', that.tokenizer.last());
        }

        var valueToken = that.tokenizer.next();
        if (!valueToken.isValue()) {
            throw new Expecting('VALUE', that.tokenizer.last());
        }

        const restoredValue = process.restore(valueToken.value);
        const comparator = process.getComparator(valueToken.value, restoredValue, compToken.value);
        return {
            comparator: comparator,
            key: process.restore(keyToken.value),
            value: restoredValue,
        }

    }

    // Primary ::= Condition |
    //			   '('OrExpression')'

    function parsePrimary() {
        var exp;
        var token = that.tokenizer.peek();
        if (token.isKey() || token.isValue()) {
            var condition = parseCondition();
            return {
                type: "comparison",
                content: condition
            }
        }
        if (token.isOperator() && token.value === '(') {
            that.tokenizer.next();
            var exp = parseExpression();
            token = that.tokenizer.next();
            if (token.isOperator() && token.value === ')') {
                return exp
            } else {
                throw new Expecting(')');
            }
        }
    }

    // Unary ::= Primary |
    //		 	 '!'Unary

    function parseUnary() {
        var exp;
        var token = that.tokenizer.peek();
        if (token.isNot()) {
            token = that.tokenizer.next();
            exp = parseUnary();

            return {
                type: "unary",
                content: {
                    operator: token.value,
                    expression: exp
                }
            }
        }
        return parsePrimary();
    }

    // AndExpression ::= Unary |
    //					 AndExpression 'and' unary|

    function parseAndExp(left) {
        var token, right;
        token = that.tokenizer.peek();
        if (token.isOr() || token.isAnd()) {
            token = that.tokenizer.next();
            right = parseUnary();
            if (!right) {
                throw new Expecting('EXPRESSION', token);
            }
            return parseAndExp({
                type: "binary",
                content: {
                    operator: token.value,
                    left: left,
                    right: right
                }
            })
        }
        else if (!token.isEnd() && !token.isOperator()) {
            throw new Expecting('OPERATOR', token);
        }

        return left;
    }

    // Expression ::= OrExpression
    function parseExpression() {
        var left = parseUnary();
        var exp = parseAndExp(left);
        if (!exp) throw new Expecting('EXPRESSION', that.tokenizer.last());

        return exp
    }

    this.parse = function (expression) {
        if (expression) {
            that.tokenizer = new Tokenizer(expression);
        }
        else if (!(this.expression)) {
            return {}
        }
        var exp = parseExpression();
        return exp
    }
}

// context Needed?


// BUG => AlertName != "SYSTEM DOWN - SERVER" and AlertName!= "SNMP NOT RESPONDING - SERVER" =>DOUBLE KEY
function EvalToMongo(expression) {
    this.expression = expression;

    const MongoDBComparatorController = {
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

    function isArray(o) {
        // just not to depend on underscore.js
        return Object.prototype.toString.call(o) === "[object Array]";
    }

    function evaluate(node, not = false) {
        if (node.hasOwnProperty('expression')) {
            var exp = evaluate(node.expression, not);
            return exp
        }

        if (node.type === 'binary' && !not) {
            node = node.content;
            var left = evaluate(node.left, not);
            var right = evaluate(node.right, not);
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
                var expression = evaluate(node.expression, not);
                let nor = { $nor: [expression] }
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
            return genComparison(node.content, not);
        }
        return {}
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

    // might be better to do Type detection when tokenizing..
    function handleValue(value) {
        if (value instanceof Array) {
            return value.map(item => {
                return handleValue(item)
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

    function genComparison(node, not) {
        /* {
          "comparator": ":",
          "key": "C",
          "value": "D"
        }*/
        var comparator = node.comparator;
        var key = node.key;
        var value = node.value ? handleValue(node.value) : '';
        var result = {};

        if (MongoDBComparatorController[comparator]) {
            MongoDBComparatorController[comparator](result, key, value, not)
        }

        return result;
    }

    this.run = function (process) {
        var parser = new Parser(process);
        let exp = parser.parse();

        var query = evaluate(exp);
        if (isArray(query)) {
            return {
                $or: query
            }
        }
        return query;
    }
    this.run_binary_Tree = function (process) {
        if (!process.exp) {
            return {}
        }
        var parser = new Parser(process);
        let exp = parser.parse();
        return exp;
    }

    return this
}


const COMPARATOR_SET = new Set(['>', '<', '>=', '<=']);

// 数据预处理
class Preprocess {
    constructor(exp) {
        this.origin = exp;

        // 转化 \\, $ 符号为 "\\\\" "\\$"
        this.exp = exp.replace(/[\\$]/g, (a) => {
            return "\\" + a
        });
        this.map = {};
        this.array = [];

        /* 正则 */
        this.backslashReg = new RegExp(/\\\\\\\\/g);
        // 匹配非转义斜杆
        this.stringReg = new RegExp(/"(.*?(?<!\\\\))"/);
        this.arrayReg = new RegExp(/\[.*?(?<!\\\\)\]/);
        this.timeFunctionReg = new RegExp(/TIME *\(.*?\)/);
        this.stringReplacementReg = new RegExp(/(?<!\\)\$\d+/g);
        this.arrayReplacementReg = new RegExp(/(?<!\\)\$_array_\d+/g);
        this.timeReplacementReg = new RegExp(/(?<!\\)\$_date_\d+/g);
        this.arrayTokenReg = new RegExp(/^(?<!\\)\$_array_\d+$/);
        this.timeTokenReg = new RegExp(/^(?<!\\)\$_date_\d+$/);
        this.astriskReg = new RegExp(/^(?<!\\)\*$/);

        // 转化转义后的反斜杠 TODO: token 根据文本生成
        this.backslashToken = 'sdafgadserbvcxnyudyhdghd';
        this.backslashTokenReg = new RegExp(this.backslashToken, 'g');
        this.exp = this.exp.replace(this.backslashReg, this.backslashToken);

        // 转化双引号包裹的字符串
        this.replaceString();

        // 转化数组包裹的字符串
        this.replaceExp(this.arrayReg, '_array_');

        // 转化函数包裹的字符串
        this.replaceExp(this.timeFunctionReg, '_date_');


    }

    replaceString() {
        const result = this.exp.trim().match(this.stringReg);
        if (result) {
            const matchedString = result[0];
            const replace = result[1];
            this.array.push(replace);
            const replaceName = `$${this.array.length - 1}`;
            this.map[replaceName] = replace;

            this.exp = this.exp.trim().replace(matchedString, `${replaceName} `);
            return this.replaceString()
        }
    }

    replaceExp(reg, prefix = '') {
        const result = this.exp.trim().match(reg);
        if (result) {
            const replace = result[0];
            this.array.push(replace);
            const replaceName = `$${prefix}${this.array.length - 1}`;
            this.map[replaceName] = replace;

            this.exp = this.exp.trim().replace(replace, `${replaceName} `);
            return this.replaceExp(reg, prefix)
        }
    }

    restore(input) {
        // 复原日期
        if (input.match(this.timeReplacementReg)) {
            input = input.replace(this.timeReplacementReg, (a) => {
                return this.map[a]
            });
            const result = [];
            input.substring(5, input.length - 1).split(',').forEach(item => {
                result.push(this.restore(item.trim()))
            });
            return result;
        }
        // 复原数组
        if (input.match(this.arrayReplacementReg)) {
            input = input.replace(this.arrayReplacementReg, (a) => {
                return this.map[a]
            });
            const result = [];
            input.substring(1, input.length - 1).split(',').forEach(item => {
                result.push(this.restore(item.trim()))
            });
            return result;
        }

        // 复原字符串
        input = input.replace(this.stringReplacementReg, (a) => {
            return this.map[a]
        });
        // 复原反斜杠
        input = input.replace(this.backslashTokenReg, '\\\\\\\\');
        // 复原 $
        input = input.replace(/\\([\\$])/g, (a, b) => {
            return b
        });

        return input

    }

    getComparator(value, restoredValue, comparator) {
        if (comparator === ':') {
            if (this.timeTokenReg.test(value)) {
                return 'date'
            }
            if (this.arrayTokenReg.test(value)) {
                return 'in'
            }
            if (typeof restoredValue === 'string') {
                if (restoredValue.match(this.astriskReg)) {
                    return 'like'
                }
                if (restoredValue === '\\0') {
                    return 'empty'
                }
            }
            return '='
        }
        else if (COMPARATOR_SET.has(comparator)) {
            if (this.timeTokenReg.test(value)) {
                return 'date' + comparator
            }
            return comparator
        }
    }

}

exports.Token = Token;
exports.Tokenizer = Tokenizer;
exports.Parser = Parser;
exports.EvalToMongo = EvalToMongo;
exports.Preprocess = Preprocess;