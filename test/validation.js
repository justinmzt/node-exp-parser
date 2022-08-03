const Parser = require('../index');
const ruleExp = [
    [
        'a:1 and (b: "test")',
        true,
    ], // 正常情况
    [
        'a:1 and (b: "test"',
        false,
        'MISSING )'
    ], // 括号未闭合
    [
        'a:1 and (b: \\"test',
        false,
        'EXCEPTION'
    ], // 特殊字符
    [
        'a: "t"est 5224"',
        false,
        'OPERATOR'
    ], // 缺少逻辑符号，原因是引号提前闭合

];

module.exports = {
    validationTest: () => {
        const errExps = [];
        for (let i = 0; i < ruleExp.length; i++) {
            const self = {};
            self.exp = ruleExp[i][0];
            self.result = ruleExp[i][1];
            self.errType = ruleExp[i][2];
            const validation = Parser.validate(self.exp);
            // console.log(JSON.stringify(validation));
            if (validation.result !== self.result) {
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