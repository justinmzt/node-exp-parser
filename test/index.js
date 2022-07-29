var data = require('./data')
var Parser = require('../index');

const test = () => {
    const errExps = [];
    for (let i = 0; i < data.exp.length; i++) {
        const self = {};
        if (data.exp[i] instanceof Array) {
            self.exp = data.exp[i][0];
            self.expectValue = data.exp[i][1];
            self.mongoQuery = data.exp[i][2];
        }
        else {
            self.exp = data.exp[i]
        }
        // console.log(self.exp, '***********Expression');
        // console.log(JSON.stringify(Parser.etot(self.exp)), "***********Syntax Tree");
        // console.log(JSON.stringify(Parser.etom(self.exp)), "***********MongoDB Query");
        // console.log(JSON.stringify(Parser.ttof(Parser.etot(self.exp))), "***********Frontend UI JSON");
        // console.log(JSON.stringify(Parser.ftot(Parser.ttof(Parser.etot(self.exp)))));
        // console.log('----------------------------------------------');
        const result = Parser.ttoe(Parser.etot(self.exp));
        const UIJSONResult = Parser.ttoe(Parser.ftot(Parser.ttof(Parser.etot(self.exp))));
        const mongoResult = JSON.stringify(Parser.etom(self.exp));
        if (result !== self.expectValue || UIJSONResult !== self.expectValue || mongoResult !== self.mongoQuery) {
            console.log(self.exp, '***********Expression');
            console.log(JSON.stringify(Parser.etot(self.exp)), "***********Syntax Tree");
            console.log(JSON.stringify(Parser.etom(self.exp)), "***********MongoDB Query");
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

const testErr = () => {
    for (let i = 0; i < data.errorExp.length; i++) {
        const self = {};
        if (data.errorExp[i] instanceof Array) {
            self.exp = data.errorExp[i][0];
            self.expectValue = data.errorExp[i][1];
        }
        else {
            self.exp = data.errorExp[i]
        }
        console.log(self.exp, '***********Expression');
        try {
            const result = Parser.etot(self.exp);
            console.log(JSON.stringify(result), "***********Syntax Tree");
            console.log(JSON.stringify(Parser.etom(self.exp)), "***********MongoDB Query");
        }
        catch (e) {
            console.error('***Error***');
            console.error(e.message)
        }
        console.log('----------------------------------------------');
    }
};

const errExps = test();
process.exit(errExps.length ? 1 : 0);
// testErr();