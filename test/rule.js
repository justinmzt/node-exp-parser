const Parser = require('../index');
const ruleExp = [
    [
        'a:1 and b:2',
        { a: 1, b: 3 },
        false,
    ], // 普通测试
    [
        'a:1 and b:2',
        { a: 1, b: 2 },
        true,
    ], // 普通测试二
    [
        'a: 1 or b: 2 and (c: 3 or d: 4)',
        { a: 1, b: 3, c: 4, d: 5 },
        false,
    ], // 混合使用
    [
        'a: 1 or (b: 2 and (c: 3 or d: 4))',
        { a: 1, b: 3, c: 4, d: 5 },
        true,
    ], // 混合使用二
    [
        'a:[1,2,3] and b:["test","test2", "test3"]',
        { a: 3, b: "test3" },
        true,
    ], // 数组匹配
    [
        'a:TIME("2010/11/30*")',
        { a: "2010/11/30 15:00:00" },
        true,
    ], // 时间匹配

];

module.exports = {
    ruleTest: () => {
        const errExps = [];
        for (let i = 0; i < ruleExp.length; i++) {
            const self = {};
            self.exp = ruleExp[i][0];
            self.target = ruleExp[i][1];
            self.result = ruleExp[i][2];
            const result = Parser.check(self.target, self.exp);
            if (result !== self.result) {
                console.log(self.exp, '***********Expression');
                console.log(JSON.stringify(self.target), "***********Target");
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