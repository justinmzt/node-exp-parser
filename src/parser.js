const Tokenizer = require("./tokenizer");

class Parser {
    static config = {
        keymap: {}
    };

    static setKeymap(list) {
        if (!list instanceof Array) {
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
        this.tokenizer = this.expression ?
            new Tokenizer(this.process, this.expression) :
            new Tokenizer(this.process, '');
    }

    // Condition ::= Key '=' Value |
    // 		  		 Key '>' Value |
    //		 		 Key '<' Value |
    //				 Key
    _parseCondition() {
        var keyToken = this.tokenizer.next();
        if (!keyToken.isKey() && !keyToken.isValue()) {
            throw this.process.error('KEY', this.tokenizer.last());
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
            throw this.process.error('COMPARATOR', this.tokenizer.last());
        }

        var valueToken = this.tokenizer.next();
        if (!valueToken.isValue()) {
            throw this.process.error('VALUE', this.tokenizer.last());
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
                throw this.process.error('MISSING )', this.tokenizer.last());
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
                throw this.process.error('EXPRESSION', token);
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
            throw this.process.error('OPERATOR', token);
        }

        return left;
    }

    // Expression ::= OrExpression
    _parseExpression() {
        var left = this._parseUnary();
        var exp = this._parseAndExp(left);
        if (!exp) throw this.process.error('EXPRESSION', this.tokenizer.last());

        return exp
    }

    parse(expression) {
        if (expression) {
            this.tokenizer = new Tokenizer(this.process, expression);
        }
        if (!this.expression) {
            return {}
        }
        return this._parseExpression()
    }
}

module.exports = Parser;
