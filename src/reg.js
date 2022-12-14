module.exports = {
    ESCAPED_ASTERISK: new RegExp('\\\\\\*', 'g'),
    ESCAPE_WORD: new RegExp('[^\\u4E00-\\u9FA5\\w\\-_*]', 'g'),
    LIKE: new RegExp('(?<!\\\\)\\*', 'g'),
    ESCAPED_DOLLAR: new RegExp('\\\\($)', 'g'),
    ESCAPED_DOT: new RegExp('\\\\(.)', 'g'),
    DATE: new RegExp('\\d\\d\\d\\d\\/\\d\\d\\/\\d\\d \\d\\d:\\d\\d:\\d\\d'),
    DATE_YEAR: new RegExp('^((?:19|20)\\d\\d)\\*$'),
    DATE_MONTH: new RegExp('^((?:19|20)\\d\\d\\/[01]\\d)\\*$'),
    DATE_DAY: new RegExp('^((?:19|20)\\d\\d\\/[01]\\d\\/[0-3]\\d)\\*$'),
    NUMBER: new RegExp('^-?\\d+(?:\\.\\d*)?$'),
    EMPTY: new RegExp('^\\\\0$'),
    TO_EXP_ESCAPED_DOLLAR: new RegExp('(?<!\\\\)\\\\($)', 'g'),
    TO_EXP_ESCAPED_SP: new RegExp('\\\\([^\\\\!@#$%^&*()+;\':"{}\\[\\],])', 'g'),
    TO_EXP_DISPLAY_KEY: new RegExp('[\\\/:\\[\\]()"\']'),
    SPACE: new RegExp('\\s', 'g'),
    PROPRECESS_ESCAPE: new RegExp('[\\\\$]', 'g'),
    RESTORE: new RegExp('\\\\([\\\\$])', 'g'),
    TRIM_START: new RegExp('^\\s+'),
};