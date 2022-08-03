const Parser = require('../index');
const ruleExp = [
    [
        'a:1 and (b: "test")',
        true,
        '',
        '',
    ], // 正常情况
    [
        'a:1 and (b: "test"',
        false,
        'MISSING )',
        12,
    ], // 括号未闭合
    [
        'b: "test',
        false,
        'EXCEPTION',
        3,
    ], // 特殊字符
    [
        'a:1 and (b: \\"test',
        false,
        'EXCEPTION',
        13,
    ], // 特殊字符
    [
        'a: "t"est 5224"',
        false,
        'OPERATOR',
        6,
    ], // 缺少逻辑符号，原因是引号提前闭合
    [
        'a:\\!',
        false,
        'NOT_OPERATOR_ERROR',
        3,
    ], // 多余的 NOT 符号
    [
        'a:\\not',
        true,
        '',
        '',
    ], // 多余的 NOT 符号
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
                (validation.result === false && validation.offset !== self.offset)
            ) {
                console.log(self.exp, '***********Expression Error');
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