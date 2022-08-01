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
        'string': /^ *(([\u2E80-\uFFFDa-zA-Z0-9-_\.\*%\\\/\.\$]+)|(\'[\u2E80-\uFFFDa-zA-Z0-9-_\.\*%\(\)\\\/\.\$ ]+\')|(\"[\u2E80-\uFFFDa-zA-Z0-9-_\.\*%\(\)\\\/\.\$ ]+\")) */
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

class Parser {
    static config = {
        keymap: {}
    };

    static setKeymap(list) {
        if (!list instanceof Array){
            return
        }
        Parser.config.keymap = {};
        const keymap = Parser.config.keymap;
        list.forEach(item => {
            if (!item.key) {
                return
            }
            for (let lang of Object.keys(item)) {
                if (lang !== 'key') {
                    if (!keymap[lang]) {
                        keymap[lang] = {}
                    }
                    keymap[lang][item[lang]] = item.key
                }
            }
        });
    }

    constructor(process) {
        this.process = process;
        this.expression = process.exp;
        this.tokenizer = this.expression ? new Tokenizer(this.expression) : new Tokenizer('');
    }

    // Condition ::= Key '=' Value |
    // 		  		 Key '>' Value |
    //		 		 Key '<' Value |
    //				 Key
    _parseCondition() {
        var keyToken = this.tokenizer.next();
        if (!keyToken.isKey() && !keyToken.isValue()) {
            throw new Expecting('KEY', this.tokenizer.last());
        }
        var compToken = this.tokenizer.peek();
        if (compToken && compToken.isComparator()) {
            compToken = this.tokenizer.next();
        }
        else {
            return {
                comparator: 'exists',
                key: this.process.restore(keyToken.value),
            }
        }
        if (!compToken || !compToken.isComparator()) {
            throw new Expecting('COMPARATOR', this.tokenizer.last());
        }

        var valueToken = this.tokenizer.next();
        if (!valueToken.isValue()) {
            throw new Expecting('VALUE', this.tokenizer.last());
        }

        const restoredValue = this.process.restore(valueToken.value);
        const comparator = this.process.getComparator(valueToken.value, restoredValue, compToken.value);
        return {
            comparator: comparator,
            key: this.process.restore(keyToken.value),
            value: restoredValue,
        }

    }

    // Primary ::= Condition |
    //			   '('OrExpression')'
    _parsePrimary() {
        var token = this.tokenizer.peek();
        if (token.isKey() || token.isValue()) {
            var condition = this._parseCondition();
            return {
                type: "comparison",
                content: condition
            }
        }
        if (token.isOperator() && token.value === '(') {
            this.tokenizer.next();
            var exp = this._parseExpression();
            token = this.tokenizer.next();
            if (token.isOperator() && token.value === ')') {
                return exp
            } else {
                throw new Expecting(')');
            }
        }
    }

    // Unary ::= Primary |
    //		 	 '!'Unary
    _parseUnary() {
        var exp;
        var token = this.tokenizer.peek();
        if (token.isNot()) {
            token = this.tokenizer.next();
            exp = this._parseUnary();

            return {
                type: "unary",
                content: {
                    operator: token.value,
                    expression: exp
                }
            }
        }
        return this._parsePrimary();
    }

    // AndExpression ::= Unary |
    //					 AndExpression 'and' unary|
    _parseAndExp(left) {
        var token, right;
        token = this.tokenizer.peek();
        if (token.isOr() || token.isAnd()) {
            token = this.tokenizer.next();
            right = this._parseUnary();
            if (!right) {
                throw new Expecting('EXPRESSION', token);
            }
            return this._parseAndExp({
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
    _parseExpression() {
        var left = this._parseUnary();
        var exp = this._parseAndExp(left);
        if (!exp) throw new Expecting('EXPRESSION', this.tokenizer.last());

        return exp
    }

    parse(expression) {
        if (expression) {
            this.tokenizer = new Tokenizer(expression);
        }
        if (!this.expression) {
            return {}
        }
        return this._parseExpression()
    }
}

exports.Token = Token;
exports.Tokenizer = Tokenizer;
exports.Parser = Parser;
