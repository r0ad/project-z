/**
 * 最小验证demo
 * 测试Jest是否能正确转换ES6模块
 */

'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _utilsDateUtilsJs = require('@/utils/dateUtils.js');

var _utilsDateUtilsJs2 = _interopRequireDefault(_utilsDateUtilsJs);

describe('最小验证demo', function () {
  it('应该能够导入DateUtils模块', function () {
    expect(_utilsDateUtilsJs2['default']).toBeDefined();
    expect(typeof _utilsDateUtilsJs2['default']).toBe('function');
  });

  it('应该能够调用formatDate方法', function () {
    var result = _utilsDateUtilsJs2['default'].formatDate(new Date('2024-01-15'));
    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });
});
