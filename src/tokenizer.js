class Token {
    constructor(type, value, offset) {
        this.type = type;
        this.value = value.trim();
        this.offset = offset;
    }

    setEndOffset(offset) {
        this.from = this.offset;
        this.to = offset;
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
        { type: 'comparator', content: /^ *(?::|>=|<=|>|<) */ },
        { type: 'operator', content: /^(not)(?: |$)|^(and)(?: |$)|^(or)(?: |$)|^(&&)(?: |$)|^(\|\|)(?: |$)|^(\() ?|^(\)) ?|^(!)(?: |$)/ },
        {
            type: 'string',
            content: /^ *((?:\\\\[!@#$%^&*()\-+;':"{}\[\]]|[\u2E80-\uFFFD\w.*\\$])+|"(?:.*?(?<!\\\\))") */
        },
        {
            type: 'exception"',
            content: /^ *(?<!\\\\)"/
        },
        {
            type: 'exception',
            content: /^ *(?:(?<!\\\\)[!@#$%^&*()\-+;':"{}\[\]]|[^\u2E80-\uFFFD\w.*\\$])+/
        }
        //'string': /^ *(([a-zA-Z0-9-_\.\*%:\\\/\.]{1,})|([\'\"][a-zA-Z0-9-_\.\*%:\(\)\\\/\. ]{1,}[\'\"])) */
    ];

    constructor(process, expression) {
        this.process = process;
        this.tokens = [];
        this.originalExpression = expression;
        this.expression = expression;
        this.offset = 0;
    }

    trimStart() {
        if (this.expression && this.expression.length) {
            const newExp = this.expression.replace(/^\s+/, '');
            this.offset += (this.expression.length - newExp.length);
            if (this.replacement) {
                this.offset -= 1;
                this.replacement = false;
            }
            this.expression = newExp
        }
    }

    peek() {
        let token = null;
        this.trimStart();
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

                token = new Token(type, ((match[1] || match[0]).trim()), this.offset);
                break;
            }
        }

        if (token && token.type === 'exception"') {
            this.tokens.push(token);
            this.expression = this.expression.replace(token.value, '');
            throw this.process.error('UNCLOSED_QUOTATION', this.last())
        }
        if (token && token.type === 'exception') {
            this.tokens.push(token);
            this.expression = this.expression.replace(token.value, '');
            throw this.process.error('EXCEPTION', this.last())
        }

        return token ? token : new Token('END', '', this.offset);
    }

    next() {
        const token = this.peek();
        this.tokens.push(token);

        const newExp = this.expression.replace(token.value, '');
        const lengthObj = this.process.getLength(token.value, token.value.length);
        this.offset += lengthObj.l;
        if (lengthObj.replacement) {
            this.replacement = lengthObj.replacement // 自动填充空格复原
        }
        token.setEndOffset(this.offset);
        this.expression = newExp;

        return token;
    }

    last() {
        return this.tokens[this.tokens.length - 1];
    }
}


module.exports = Tokenizer;