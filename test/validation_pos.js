const Parser = require('../index');
const ruleExp = [
    [
        'a:1 and (b: "test")',
        true,
        null,
        18, 19
    ], // 默认最后
    [
        'a:1     and b:2',
        true,
        2,
        1, 2
    ], // 中间获取内容
    [
        'a:1     and b:2',
        true,
        6,
    ], // 当在空格中，无法找到相关内容
    [
        'a:"sdfsfd"',
        true,
        4,
        2, 10
    ], // 在引号中
    [
        'a: TIME("2010/10/10*")  and c: "\\$" !',
        false,
        5,
        3, 22
    ], // 在有错误的情况下，在前面部分无错的地方可以找到位置
    [
        'a: TIME("2010/10/10*")  and c: "\\$" !',
        false,
        null,
    ], // 在有错误的情况下，在后面无法找到位置
    [
        'a<=TIME("2010/11/30*","2010/12/31*")',
        true,
        2,
        1, 3
    ], // 在比较运算符中间
    [
        'a<=TIME("2010/11/30*",         "2010/12/31*")and b:1',
        true,
        4,
        3, 45
    ], // 在时间内容中间
    [
        'a:[1,       3,       "fsdf"] and b:1',
        true,
        4,
        2, 28
    ], // 在数组内容中间
];

module.exports = {
    validationPosTest: () => {
        const errExps = [];
        for (let i = 0; i < ruleExp.length; i++) {
            const self = {};
            self.exp = ruleExp[i][0];
            self.result = ruleExp[i][1];
            const pos = ruleExp[i][2];
            self.from = ruleExp[i][3];
            self.to = ruleExp[i][4];
            const exist = self.from !== undefined && self.to !== undefined;
            const validation = Parser.validate(self.exp, pos);
            // console.log(JSON.stringify(validation));
            if (validation.result !== self.result ||
                !!validation.token !== exist ||
                validation.token && (
                    validation.token.from !== self.from ||
                    validation.token.to !== self.to
                )
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