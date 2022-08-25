const Parser = require('../index');
module.exports = {
    initKeymap: () => {
        Parser.setKeymap([
            { key: 'test', ['zh-cn']: '测试' },
            { key: 'test2', ['zh-cn']: '测试.级联' },
        ]);

    },
    keymapExp: [
        [
            '测试: 1 and 测试.级联: 2',
            '测试: 1 and 测试.级联: 2',
            '{"test":1,"test2":2}',
            '{"test":[1],"test2":[2]}',
        ], // 普通 key 映射测试
        [
            '测试: 1 and 测试.级联: 2 or 第二:3',
            '测试: 1 and 测试.级联: 2 or 第二: 3',
            '{"$or":[{"test":1,"test2":2},{"第二":3}]}',
            '{"test":[1],"test2":[2],"第二":[3]}',
        ], // 混合 key 映射测试
    ]
};