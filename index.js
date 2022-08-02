const Parser = require('./src/parser');
const Transformer = require('./src/transformer');
const Rule = require('./src/plugins/rule');

exports.Parser = Parser;

/**
 * @function 设置解析器的 Key 映射表，将表达式中不同语言的 key 转换为指定 key。
 * @param list
 */
exports.setKeymap = Parser.setKeymap;

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
 * @param option
 * @param option.keyLang: 表达式 key 的语言，对应 keymap
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

/**
 * @function 检测目标对象是否符合表达式
 * @param target
 * @param expression
 * @param option
 * @param option.keyLang: 表达式 key 的语言，对应 keymap
 */
exports.check = Rule.exec;
