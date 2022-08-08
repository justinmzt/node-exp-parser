// 数据预处理

const Exception = require("./exception");

const COMPARATOR_SET = new Set(['>', '<', '>=', '<=']);

class Preprocess {
    constructor(exp) {
        // 空白符均变为空格
        this.origin = exp.replace(/\s/g, ' ');

        // 转化 \\, $ 符号为 "\\\\" "\\$"
        this.exp = this.origin.replace(/[\\$]/g, (a) => {
            return "\\" + a
        });
        this.map = {};
        this.array = [];

        /* 正则 */
        this.backslashReg = new RegExp(/\\\\\\\\/g);
        // 匹配非转义斜杆
        this.stringReg = new RegExp(/(?<!\\\\)"(.*?(?<!\\\\))"/);
        this.arrayReg = new RegExp(/\[.*?(?<!\\\\)\]/);
        this.timeFunctionReg = new RegExp(/TIME *\(.*?\)/);
        this.stringReplacementReg = new RegExp(/(?<!\\)\$\d+/g);
        this.arrayReplacementReg = new RegExp(/(?<!\\)\$_array_\d+/g);
        this.timeReplacementReg = new RegExp(/(?<!\\)\$_date_\d+/g);
        this.arrayTokenReg = new RegExp(/^(?<!\\)\$_array_\d+$/);
        this.timeTokenReg = new RegExp(/^(?<!\\)\$_date_\d+$/);
        this.astriskReg = new RegExp(/^(?<!\\)\*$/);

        // 转化转义后的反斜杠
        this.generateBackslashToken();
        this.backslashTokenReg = new RegExp(this.backslashToken, 'g');
        this.exp = this.exp.replace(this.backslashReg, this.backslashToken);

        // 转化双引号包裹的字符串
        this.replaceString();

        // 转化数组包裹的字符串
        this.replaceExp(this.arrayReg, '_array_');

        // 转化函数包裹的字符串
        this.replaceExp(this.timeFunctionReg, '_date_');


    }

    generateBackslashToken() {
        while (true) {
            const token = (Math.random() * 1000000000).toString().replace('.', '');
            if (!this.origin.match(token)) {
                this.backslashToken = token;
                break
            }
        }
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

    getLength(input, l) {
        // const r = Math.random();
        // console.log(input, l, 'input', r);
        const self = {
            replacement: false
        };
        // 复原日期
        if (input.match(this.timeReplacementReg)) {
            input = input.replace(this.timeReplacementReg, (a) => {
                if (this.map[a]) {
                    self.replacement = true;
                    l += (this.map[a].length - a.length)
                }
                return this.map[a]
            });
            input.substring(5, input.length - 1).split(',').forEach(item => {
                const str = item.trim();
                const obj = this.getLength(str, str.length);
                l += (obj.l - str.length);
                if (obj.replacement) {
                    l -= 1
                }
            });
            return { l, replacement: self.replacement };
        }
        // 复原数组
        if (input.match(this.arrayReplacementReg)) {
            input = input.replace(this.arrayReplacementReg, (a) => {
                if (this.map[a]) {
                    self.replacement = true;
                    l += (this.map[a].length - a.length)
                }
                return this.map[a]
            });
            input.substring(1, input.length - 1).split(',').forEach(item => {
                const str = item.trim();
                const obj = this.getLength(str, str.length);
                l += (obj.l - str.length);
                if (obj.replacement) {
                    l -= 1
                }
            });
            return { l, replacement: self.replacement };
        }

        // 复原字符串
        input = input.replace(this.stringReplacementReg, (a) => {
            if (this.map[a]) {
                self.replacement = true;
                l += (this.map[a].length - a.length + 2) // +2 前后两个引号
            }
            return this.map[a]
        });
        // 复原反斜杠
        input = input.replace(this.backslashTokenReg, a => {
            l -= (this.backslashToken.toString().length - 4);
            return '\\\\\\\\'
        });
        // 复原 $
        input = input.replace(/\\([\\$])/g, (a, b) => {
            l -= 1;
            return b
        });

        // console.log( l, 'output', r);
        return { l, replacement: self.replacement };
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

    error(type, lastToken, data) {
        return new Exception(this, type, lastToken, data)
    }

}

module.exports = Preprocess;