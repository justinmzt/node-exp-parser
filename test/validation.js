const Parser = require('../index');
const ruleExp = [
    [
        'a:1 and (b: "test"',
        false,
        'MISSING )',
        18,
    ], // 括号未闭合
    [
        'a:1 and (b: "test" or (c: 2 and d:3)',
        false,
        'MISSING )',
        36,
    ], // 多个括号未闭合
    [
        'a:1 and (b: !test',
        false,
        'EXCEPTION',
        12,
    ], // 特殊字符
    [
        'a:1 and (b: \\"test',
        false,
        'MISSING )',
        18,
    ], // 特殊字符
    [
        'a: "t"est 5224"',
        false,
        'OPERATOR',
        6,
    ], // 缺少逻辑符号，原因是引号提前闭合
    [
        'a dun',
        false,
        'OPERATOR',
        2
    ], // 缺少逻辑符号，也可以是缺少运算符号
    [
        'a:\\ not',
        false,
        'NOT_OPERATOR_ERROR',
        4,
    ], // 多余的 NOT 符号
    [
        'a: "test"  and c: "\\$" !',
        false,
        'NOT_OPERATOR_ERROR',
        23,
    ], // 测试 token 的长度是否正确
    [
        'a: TIME("2010/10/10*")  and c: "\\$" !',
        false,
        'NOT_OPERATOR_ERROR',
        36,
    ], // 测试 token 的长度是否正确，带时间
    [
        'a: [1,2,3,4]  and c: "\\$" !',
        false,
        'NOT_OPERATOR_ERROR',
        26
    ], // 测试 token 的长度是否正确，带数组
    [
        'a: [1,2, 3, 4]  and c: "\\$" !',
        false,
        'NOT_OPERATOR_ERROR',
        28
    ], // 测试 token 的长度是否正确，带数组，数组内还有空格
    [
        'a:   and b:1',
        false,
        'VALUE',
        5
    ], // 缺少 VALUE 1
    [
        'a:   not b:1',
        false,
        'VALUE',
        5
    ], // 缺少 VALUE 2
    [
        'a:   ',
        false,
        'VALUE',
        5
    ], // 缺少 VALUE 3
    [
        '(',
        false,
        'KEY',
        1
    ], // 缺少 KEY 1
    [
        'and a:1',
        false,
        'KEY',
        0
    ], // 缺少 KEY 2
    [
        'a:1 and not',
        false,
        'KEY',
        11
    ], // 缺少 KEY 3

    // 未闭合的引号
    [
        'a:\\\\"',
        false,
        'UNCLOSED_QUOTATION',
        4
    ], // 反斜杠转义测试
    [
        'a:1 and (b: "test',
        false,
        'UNCLOSED_QUOTATION',
        12,
    ], // 特殊字符
    // 数组未闭合
    [
        'a:1 and b: [1,2,3',
        false,
        'UNCLOSED_ARRAY',
        11,
    ],
    [
        'a:1 and b: saf]',
        false,
        'EXCEPTION',
        14,
    ], // 右括号作为特殊字符需要在引号内，或使用转义符
    [
        'a: 1) asdfas',
        false,
        'BRACKET_OPERATOR_ERROR',
        4,
    ], // 右括号报错，需要转义
    [
        'b: 12)',
        false,
        'BRACKET_OPERATOR_ERROR',
        5,
    ], // 右括号报错

];

module.exports = {
    validationTest: () => {
        const errExps = [];
        for (let i = 0; i < ruleExp.length; i++) {
            const self = {};
            self.exp = ruleExp[i][0];
            self.result = ruleExp[i][1];
            self.errType = ruleExp[i][2];
            self.offset = ruleExp[i][3];
            const validation = Parser.validate(self.exp);
            // console.log(JSON.stringify(validation));
            if (validation.result !== self.result ||
                (validation.result === false && validation.offset !== self.offset) ||
                validation.errType !== self.errType
            ) {
                console.log(self.exp, '***********Expression Error');
                if (validation.result !== self.result) {
                    console.error('***********Result Error, Correct Value: ', validation.result);
                }
                if (validation.errType !== self.errType) {
                    console.error('***********Type Error, Correct Value: ', validation.errType);
                }
                if (validation.result === false && validation.offset !== self.offset) {
                    console.error('***********Offset Error, Correct Value: ', validation.offset);
                }
                errExps.push(self.exp);
                console.log('----------------------------------------------');
            }
        }
        if (errExps.length) {
            console.log('Error Expressions: ', errExps);
        }
        return errExps
    }
};