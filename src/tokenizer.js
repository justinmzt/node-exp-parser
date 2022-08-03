class Token {
    constructor(type, value) {
        this.type = type;
        this.value = value.trim();
    }

    isKey() {
        return this.type === 'key'
    }

    isValue() {
        return this.type === 'value'
    }

    isComparator() {
        return this.type === 'comparator'
    }

    isOperator() {
        return this.type === 'operator'
    }

    isNot() {
        return this.type === 'operator' && (this.value === '!' || this.value === 'not');
    }

    isAnd() {
        return this.type === 'operator' && (this.value === 'and' || this.value === '&&');
    }

    isOr() {
        return this.type === 'operator' && (this.value === 'or' || this.value === '||');
    }

    isEnd() {
        return this.type === 'END'
    }
}

class Tokenizer {
    // distinction between key and value are nor helpfull... both are "strings"
    static reg = [
        // 'key': /^ *([a-zA-Z0-9-]{1,}) *(=|>=|<=|>|<|!=)/,
        //'key': /^ *([a-zA-Z0-9-]{1,}) */,
        { type: 'comparator', content: /^ *(?:\:|>=|<=|>|<) */ },
        { type: 'operator', content: /^(not) ?|^(and) ?|^(or) ?|^(&&) ?|^(\|\|) ?|^(\() ?|^(\)) ?|^(!) ?/ },
        {
            type: 'string',
            content: /^ *(([\u2E80-\uFFFDa-zA-Z0-9-_\.\*%\\\/\.\$]+)|("(?:.*?(?<!\\\\))")) */
        },
        {
            type: 'exception',
            content: /^ *[^\u2E80-\uFFFDa-zA-Z0-9-_\.\*%\\\/\.\$]+/
        }
        //'string': /^ *(([a-zA-Z0-9-_\.\*%:\\\/\.]{1,})|([\'\"][a-zA-Z0-9-_\.\*%:\(\)\\\/\. ]{1,}[\'\"])) */
    ];

    constructor(process, expression) {
        this.process = process;
        this.tokens = [];
        this.originalExpression = expression;
        this.expression = expression;
    }

    peek() {
        let token = null;
        this.expression = this.expression.trim();
        for (let i = 0; i < Tokenizer.reg.length; i++) {
            let type = Tokenizer.reg[i].type;
            const reg = Tokenizer.reg[i].content;
            const match = this.expression.match(reg);
            if (match) {
                if (type === 'string') {
                    if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type === 'comparator') {
                        type = 'value';
                    } else {
                        type = 'key';
                    }
                }

                token = new Token(type, ((match[1] || match[0]).trim()));
                break;
            }
        }

        if (token && token.type === 'exception') {
            this.tokens.push(token);
            this.expression = this.expression.replace(token.value, '');
            throw this.process.error('EXCEPTION', this.last())
        }

        return token ? token : new Token('END', '');
    }

    next() {
        const token = this.peek();
        this.tokens.push(token);
        this.expression = this.expression.replace(token.value, '');
        return token;
    }

    last() {
        return this.tokens[this.tokens.length - 1].type === 'END' ?
            this.tokens[this.tokens.length - 2] : this.tokens[this.tokens.length - 1];
    }
}


module.exports = Tokenizer;