const Parser = require('./parser');
const Preprocess = require('./preprocess');
const REG = require('./reg');

/**
 * @function Branch To Frontend JSON
 * @param branch
 * @param group
 */
const _ttof = (branch, group) => {
    if (branch.type === 'comparison') {
        const data = [branch.content];
        data[0].afterOperator = 'and'; // 默认值
        return data
    }
    else {
        if (branch.content.expression) {
            const data = _ttof(branch.content.expression, true);
            data[0].not = true;
            return data
        }
        else {
            let left = _ttof(branch.content.left, false);
            left[left.length - 1].afterOperator = branch.content.operator;
            left = left.concat(_ttof(branch.content.right, true));
            if (group) {
                return [
                    {
                        afterOperator: 'and', // 默认值
                        children: left
                    }
                ]
            } else {
                return left
            }
        }
    }
}

class Transformer {
    static COMPARATOR_MAP = {
        ['>']: '>', ['>=']: '>=', ['<']: '<', ['<=']: '<=',
        ['date>']: '>', ['date>=']: '>=', ['date<']: '<', ['date<=']: '<=',
    };

    /**
     * @function Expression To Syntax Tree
     * @param expression
     */
    static etot(expression) {
        const process = new Preprocess(expression);
        const parser = new Parser(process);
        let a = parser.parse();
        return a
    }


    /**
     * @function Tree To Frontend JSON
     * @param tree
     */
    static ttof(tree) {
        if (!tree || !Object.keys(tree).length) {
            return {
                afterOperator: 'and',
                children: []
            }
        }
        const result = _ttof(tree, true)[0];
        if (!result.children) {
            return {
                afterOperator: 'and',
                children: [result]
            }
        }
        else {
            return result
        }
    }

    /**
     * @function Frontend JSON To Tree
     * @param data
     */
    static ftot(data) {
        // 判空处理
        if (!data.comparator && (!data.children || !data.children.length)) {
            return {}
        }
        return Transformer._ftot(data)
    }

    static _ftot(data) {
        let branch = null;
        if (data.comparator) {
            branch = {
                type: 'comparison',
                content: data
            }
        }
        if (data.children) {
            const items = data.children
            branch = Transformer._ftot(items[0])
            let count = 0

            while (items[count + 1]) {
                const item = items[count]
                if (item.afterOperator && items[count + 1]) {
                    branch = {
                        type: 'binary',
                        content: {
                            operator: item.afterOperator,
                            left: branch,
                            right: Transformer._ftot(items[count + 1])
                        }
                    }
                }
                count++
            }
        }
        if (data.not) {
            branch = {
                type: 'unary',
                content: {
                    operator: 'not',
                    expression: branch
                }
            }
        }
        return branch
    }

    static displayValue(value) {
        if (!value) {
            return `""`
        }
        if (REG.NUMBER.test(value)) {
            return parseFloat(value)
        }
        if (REG.EMPTY.test(value)) {
            return value
        }
        const v = value
            .replace(REG.TO_EXP_ESCAPED_DOLLAR, ($, $1) => {
                return $1
            })
            .replace(REG.TO_EXP_ESCAPED_SP, ($, $1) => {
                return $1
            });
        return `"${v}"`
    }

    static displayComparatorExpression(obj) {
        let { key, value } = obj;
        const comparator = Transformer.COMPARATOR_MAP[obj.comparator] ?
            ` ${Transformer.COMPARATOR_MAP[obj.comparator]}` : ':';
        if (REG.TO_EXP_DISPLAY_KEY.test(key)) {
            key = `"${key}"`
        }
        if (obj.comparator === 'exists') {
            return key
        }
        if (!value) {
            return `${key}${comparator} ""`
        }
        if (obj.comparator.substr(0, 4) === 'date') {
            return `${key}${comparator} TIME(${value.map(Transformer.displayValue).join(', ')})`
        }
        if (obj.comparator === 'in') {
            return `${key}${comparator} [${value.map(Transformer.displayValue).join(', ')}]`
        }
        return `${key}${comparator} ${Transformer.displayValue(value)}`
    }

    /**
     * @function Tree To Expression
     * @param data
     */
    static ttoe(data) {
        switch (data.type) {
            // 二元类型
            case "binary": {
                let symbol;
                if (data.content.operator === "and") {
                    symbol = "and"
                }
                else if (data.content.operator === "or") {
                    symbol = "or"
                }
                let leftExp = Transformer.ttoe(data.content.left);

                if (data.content.left.type === 'binary' && data.content.left.content.operator !== 'and') {
                    leftExp = `(${leftExp})`;
                }

                let rightExp = Transformer.ttoe(data.content.right);

                if (data.content.right.type === 'binary' && data.content.right.content.operator !== 'and') {
                    if (data.content.operator !== 'or') {
                        rightExp = `(${rightExp})`;
                    }
                }
                return `${leftExp} ${symbol} ${rightExp}`;
            }
            // 一元类型
            case "unary": {
                let symbol;
                if (data.content.operator === "not") {
                    symbol = "not"
                }
                // NOT 后接二元表达式
                if (data.content.expression.type === 'binary') {
                    return `${symbol} (${Transformer.ttoe(data.content.expression)})`;
                }
                else {
                    return `${symbol} ${Transformer.ttoe(data.content.expression)}`;
                }
            }
            // 表达式
            case "comparison": {
                return Transformer.displayComparatorExpression(data.content)
            }
            default:
                return ''
        }
    }
}

module.exports = Transformer;
