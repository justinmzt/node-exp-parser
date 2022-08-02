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

### 1. Expression To Syntax Binary Tree

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

### 7. Rule Check

**Parser.check(target, expression, options?)**
- `target`: The target json.
- `expression`: The expression string.
- `options`: Parse Options.
  - `keyLang`: 表达式中 key 的语言（对应上述 API 中的 `language`）

```js
const result = Parser.check({ a: 1, b: 3, c: 4, d: 5 }, 'a: 1 or b: 2 and (c: 3 or d: 4)');
// false
const result = Parser.check({ a: 1, b: 3, c: 4, d: 5 }, 'a: 1 or (b: 2 and (c: 3 or d: 4))');
// true
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
- a: *test*（匹配包含 test 的所有信息）

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
