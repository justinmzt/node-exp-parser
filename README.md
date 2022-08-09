# node-exp-parser

## Contents

- [Description](#description)
- [Usage](#usage)
  - [Client-side](#client-side)
  - [Server-side](#server-side)
- [API](#api)
- [Syntax](#syntax)

## Description

A JavaScript expression parser

## Usage

Install the package with [NPM](https://www.npmjs.org/):

```sh
npm install node-exp-parser
```

### Client-side

Import by [webpack](https://webpack.js.org/)

```js
import Parser from 'node-exp-parser'
console.log(JSON.stringify(Parser.etot('a:[1,2,"[3]"]')));
// {"type":"comparison","content":{"comparator":"in","key":"a","value":["1","2","[3]"]}}
console.log(JSON.stringify(Parser.etom('a:[1,2,"[3]"]')));
// {"a":{"$in":[1,2,"[3]"]}}
```

### Server-side

Add a file **exp.js** with the following content:

```js
const Parser = require("node-exp-parser");
console.log(JSON.stringify(Parser.etot('a:[1,2,"[3]"]')));
// {"type":"comparison","content":{"comparator":"in","key":"a","value":["1","2","[3]"]}}
console.log(JSON.stringify(Parser.etom('a:[1,2,"[3]"]')));
// {"a":{"$in":[1,2,"[3]"]}}
```

Run the application with the following command:

```sh
node exp.js
```

## Requirements

ES6

## API

### 1. Expression To Syntax Tree

**Parser.etot(expression)**

```js
const tree = Parser.etot('a: 1 and b: 2')
// "{"type":"binary","content":{"operator":"and","left":{"type":"comparison","content":{"comparator":"=","key":"a","value":"1"}},"right":{"type":"comparison","content":{"comparator":"=","key":"b","value":"2"}}}}"
```

### 2. Syntax Tree To Expression

**Parser.ttoe(tree)**

```js
const exp = Parser.ttoe({"type":"comparison","content":{"comparator":"=","key":"a","value":"1"}})
// "a: 1"
```

### 3. 设置 key 映射表以支持表达式包含不同语言的 key

**Parser.setKeymap(list)**
- `list`: key 配置数组
  - `key`: 原始 key
  - `[language]`: 当语言为 `language` 时的 key 值。

### 4. Expression To MongoDB Query

**Parser.etom(expression, options?)**
- `expression`: The expression string.
- `options`: Parse Options.
  - `keyLang`: 表达式中 key 的语言（对应上述 API 中的 `language`）

```js
const Parser = require("node-exp-parser");

const query = Parser.etom('a: 1 and b: 2')
// "{"a":1,"b":2}"

const query2 = Parser.etom('测试: 1 and 测试.级联: 2')
// "{"测试":1,"测试.级联":2}"
Parser.setKeymap([
    { key: 'test', ['zh-cn']: '测试' },
    { key: 'test2', ['zh-cn']: '测试.级联' },
]);
const query3 = Parser.etom('测试: 1 and 测试.级联: 2', { keyLang: 'zh-cn' });
// "{"test":1,"test2":2}"
```

### 5. Syntax Tree To UI JSON

**Parser.ttof(tree)**

```js
const json = Parser.ttof({"type":"comparison","content":{"comparator":"=","key":"a","value":"1"}})
// "{"afterOperator":"and","children":[{"comparator":"=","key":"a","value":"1","afterOperator":"and"}]}"
```

### 6. UI JSON To Syntax Tree

**Parser.ftot(json)**

```js
const tree = Parser.ftot({"afterOperator":"and","children":[{"comparator":"=","key":"a","value":"1","afterOperator":"and"}]})
// "{"type":"comparison","content":{"comparator":"=","key":"a","value":"1","afterOperator":"and"}}"
```

### 7. Rule Check

**Parser.check(target, expression, options?)**
- `target`: The target json.
- `expression`: The expression string.
- `options`: Parse Options.
  - `keyLang`: 表达式中 key 的语言（对应上述 API 中的 `language`）

```js
const result = Parser.check({ a: 1, b: 3, c: 4, d: 5 }, 'a: 1 or b: 2 and (c: 3 or d: 4)');
// false
const result2 = Parser.check({ a: 1, b: 3, c: 4, d: 5 }, 'a: 1 or (b: 2 and (c: 3 or d: 4))');
// true
const result3 = Parser.check({ a: { b: 5 } }, 'a.b: 5');
// true
```

### 7. Validation

**Parser.validate(expression, pos?)**
- `expression`: The expression string.
- `pos`: The cursor position. **Default**: the last of expression.
- Returns: `Validation`
  - `result`: `<boolean>` 验证结果
  - `errValue`: 错误字符串
  - `errType`: 错误类型
  - `offset`: 错误位置的偏移量

```js

// 通过验证
const validation = Parser.validate('a:1 and (b: "test")');
// { "result": true, "token": { "from": 18, "to": 19, "type": "operator", "value": ")" } }

// 括号未闭合
const validation2_1 = Parser.validate('a:1 and (b: "test"');
// {
//     "result": false, "errValue": "", "errType": "MISSING )", "offset": 18,
//     "token": { "from": 18, "to": 18, "type": "END", "value": "" }
// }
const validation2_2 = Parser.validate('a:1 and (b: "test" or (c: 2 and d:3)');
// {
//     "result": false, "errValue": "", "errType": "MISSING )", "offset": 36,
//     "token": { "from": 35, "to": 36, "type": "operator", "value": ")" }
// }

// 不可识别的字符
const validation3 = Parser.validate('a:1 and (b: !test');
// { "result": false, "errValue": "!", "errType": "EXCEPTION", "offset": 12 }

// 缺少逻辑符号，也可以是缺少运算符号
const validation4_1 = Parser.validate('a dun');
// { "result": false, "errValue": "dun", "errType": "OPERATOR", "offset": 2 }
// 引号提前闭合
const validation4_2 = Parser.validate('a: "t"est 5224"');
// { "result": false, "errValue": "est", "errType": "OPERATOR", "offset": 6 }

// 错误的 NOT 符号
const validation5 = Parser.validate('a: [1,2, 3, 4]  and c: "\$" !');
// { "result": false, "errValue": "!", "errType": "NOT_OPERATOR_ERROR", "offset": 28 }

// 缺少 VALUE，此时会同步输出所在语句的 KEY 值
const validation6_1 = Parser.validate('a:   and b:1');
// { "result": false, "errValue": "and", "errType": "VALUE", "offset": 5, "key": "a" }
const validation6_2= Parser.validate('a:   not b:1');
// { "result": false, "errValue": "not", "errType": "VALUE", "offset": 5, "key": "a" }
const validation6_3 = Parser.validate('a:   ');
// {
//     "result": false, "errValue": "", "errType": "VALUE", "offset": 5, "key": "a",
//     "token": { "from": 5, "to": 5, "type": "END", "value": "" }
// }

// 缺少 KEY
const validation7_1 = Parser.validate('(');
// {
//     "result": false, "errValue": "", "errType": "KEY", "offset": 1,
//     "token": { "from": 0, "to": 1, "type": "operator", "value": "(" }
// }
const validation7_2 = Parser.validate('and b:1');
// { "result": false, "errValue": "and", "errType": "KEY", "offset": 0 }
const validation7_3 = Parser.validate('a:1 and not');
// {
//     "result": false, "errValue": "", "errType": "KEY", "offset": 11,
//     "token": { "from": 8, "to": 11, "type": "operator", "value": "not" }
// }

// 未闭合的引号
const validation9_1 = Parser.validate('a:1 and (b: "test');
// { "result": false, "errValue": "\"", "errType": "UNCLOSED_QUOTATION", "offset": 12 }
const validation9_2 = Parser.validate('a:te"');
// { "result": false, "errValue": "\"", "errType": "UNCLOSED_QUOTATION", "offset": 4 }

// 未闭合的数组符号
const validation9_1 = Parser.validate('a:1 and b: [1,2,3');
// { "result": false, "errValue": "[", "errType": "UNCLOSED_ARRAY", "offset": 11 }
const validation9_2 = Parser.validate('a:1 and b: saf]');
// { "result": false, "errValue": "]", "errType": "EXCEPTION", "offset": 14 } // 右括号作为特殊字符需要在引号内，或使用转义符

```
```js
// 一些查询位置的例子
const validation8_1 = Parser.validate('a<=TIME("2010/11/30*","2010/12/31*")', 2);
// {
//     "result": true,
//     "token": { "from": 1, "to": 3, "type": "comparator", "value": "<=" }
// }
const validation8_2 = Parser.validate('a<=TIME("2010/11/30*",         "2010/12/31*")and b:1', 4);
// {
//     "result": true,
//     "token": { "from": 3, "to": 45, "type": "value", "value": "TIME(\"2010/11/30*\",         \"2010/12/31*\")" }
// }
const validation8_3 = Parser.validate('a:[1,       3,       "fsdf"] and b:1', 4);
// {
//     "result": true,
//     "token": { "from": 2, "to": 28, "type": "value", "value": "[1,       3,       \"fsdf\"]" }
// }
const validation8_4 = Parser.validate('a: TIME("2010/10/10*")  and c: "\$" !', 5);
// {
//     "result": false, "errValue": "!", "errType": "NOT_OPERATOR_ERROR", "offset": 36,
//     "token": { "from": 3, "to": 22, "type": "value", "value": "TIME(\"2010/10/10*\")" }
// }
```

## Syntax

### 1. 精确匹配
例：
- a: 1

### 2. 匹配内容带有空格，使用双引号
例：
- a: "test a1"

### 3. 模糊匹配，需要使用“*”
例：
- a: test*（匹配前缀为 test 的信息）
- a: \*test\*（匹配包含 test 的所有信息）

### 4. 空值匹配
例：
- a: \0

### 5. 多值匹配
使用 "[" 和 "]" 进行多值范围的定义
例：
- a:[123,456,789]

### 6. 数字匹配
例：
- a: 0
- a > 0
- a < 10
- a >= 11
- a <= 10

### 7. 日期时间匹配
使用日期时间函数进行匹配

具体时间匹配，例：
- a:TIME("2011/11/11 15:00:00")
- a > TIME("2011/11/11 15:00:00")
- a <= TIME("2011/11/11 15:00:00")

模糊时间匹配（这里不推荐使用不等号，但兼容），例：
- a:TIME("2011/11/11*")
- a:TIME("2011/11*")
- a:TIME("2011*")

时间范围查询，例：
- a:TIME("2011/11/11 15:00:00","2021/11/11 15:00:00")

### 8. 转义
使用 "\" 转义 !, @, #, %, ^, &, *, (, ), \, -, +, ;, ', :, ", {, }, [, ], "," 等字符。
