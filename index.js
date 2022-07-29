const Parser = require('./src/parser');
const Transformer = require('./src/transformer');

exports.Token = Parser.Token;
exports.Tokenizer = Parser.Tokenizer;
exports.Parser = Parser.Parser;
exports.EvalToMongo = Parser.EvalToMongo;
exports.Preprocess = Parser.Preprocess;

/**
 * @function 表达式转语法树 Expression To Syntax Tree
 * @param expression
 */
exports.etot = Transformer.etot;

/**
 * @function 语法树转表达式
 * @param tree
 */
exports.ttoe = Transformer.ttoe;

/**
 * @function 表达式转 MongoDB 查询语句 Expression To MongoDB Query
 * @param expression
 */
exports.etom = Transformer.etom;

/**
 * @function 语法树转前端 UI 数据
 * @param tree
 */
exports.ttof = Transformer.ttof;

/**
 * @function 前端 UI 数据转语法树
 * @param data
 */
exports.ftot = Transformer.ftot;

