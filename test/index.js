const data = require('./data');
const Parser = require('../index');

const { dictTest } = require('./dict');

const test = (list, option) => {
    const errExps = [];
    for (let i = 0; i < list.length; i++) {
        const self = {};
        if (list[i] instanceof Array) {
            self.exp = list[i][0];
            self.expectValue = list[i][1];
            self.mongoQuery = list[i][2];
            self.dict = list[i][3];
        }
        else {
            self.exp = list[i]
        }

        self.opts = Object.assign({}, option);
        // console.log(self.exp, '***********Expression');
        // console.log(JSON.stringify(Parser.etot(self.exp)), "***********Syntax Tree");
        // console.log(JSON.stringify(Parser.etom(self.exp, opts)), "***********MongoDB Query");
        // console.log(JSON.stringify(Parser.ttof(Parser.etot(self.exp))), "***********Frontend UI JSON");
        // console.log(JSON.stringify(Parser.ftot(Parser.ttof(Parser.etot(self.exp)))));
        // console.log('----------------------------------------------');
        const result = Parser.ttoe(Parser.etot(self.exp));
        const UIJSONResult = Parser.ttoe(Parser.ftot(Parser.ttof(Parser.etot(self.exp))));
        const mongoResult = JSON.stringify(Parser.etom(self.exp, self.opts));
        const dictResult = dictTest(self);
        if (result !== self.expectValue || UIJSONResult !== self.expectValue || mongoResult !== self.mongoQuery || !dictResult) {
            console.log(self.exp, '***********Expression');
            console.log(JSON.stringify(Parser.etot(self.exp)), "***********Syntax Tree");
            console.log(JSON.stringify(Parser.etom(self.exp, self.opts)), "***********MongoDB Query");
            console.log(JSON.stringify(Parser.ttof(Parser.etot(self.exp))), "***********Frontend UI JSON");
            if (result !== self.expectValue) {
                console.error(result, '***********Result, Transform Error');
            }
            if (UIJSONResult !== self.expectValue) {
                console.error(UIJSONResult, '***********UI JSON Result, Transform Error');
            }
            if (mongoResult !== self.mongoQuery) {
                console.error(mongoResult, '***********MongoDB Result, Transform Error');
            }
            console.log('----------------------------------------------');
            errExps.push(self.exp)
        }
    }
    if (errExps.length) {
        console.log('Error Expressions: ', errExps);
    }
    return errExps
};

let errExps = test(data.exp);
if (errExps.length) {
    return process.exit(1)
}

// key ????????????
const { initKeymap, keymapExp } = require('./keymap');
initKeymap();

// ?????? key ???????????????
errExps = test(keymapExp, {
    keyLang: 'zh-cn'
});

if (errExps.length) {
    return process.exit(1)
}

// ????????????
const { ruleTest } = require('./rule');

errExps = ruleTest();

if (errExps.length) {
    return process.exit(1)
}

// ??????????????????
const { validationTest } = require('./validation');

errExps = validationTest();

if (errExps.length) {
    return process.exit(1)
}

// ??????????????????????????????
const { validationPosTest } = require('./validation_pos');

errExps = validationPosTest();

if (errExps.length) {
    return process.exit(1)
}

process.exit(0);