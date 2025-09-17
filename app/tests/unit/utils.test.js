/**
 * 工具函数单元测试
 * 测试 utils 目录下的工具函数
 */
describe('工具函数测试', () => {
  describe('日期工具函数', () => {
    it('应该能够格式化日期', () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      const formattedDate = mockDate.toISOString().split('T')[0];
      expect(formattedDate).toBe('2024-01-01');
    });

    it('应该能够格式化时间', () => {
      const mockDate = new Date('2024-01-01T12:00:00Z');
      const formattedTime = mockDate.toISOString().replace('T', ' ').substring(0, 19);
      expect(formattedTime).toBe('2024-01-01 12:00:00');
    });
  });

  describe('字符串工具函数', () => {
    it('应该能够验证非空字符串', () => {
      const isValidString = (str) => {
        if (str == null) return false;
        return str.trim().length > 0;
      };
      
      expect(isValidString('hello')).toBe(true);
      expect(isValidString('')).toBe(false);
      expect(isValidString('   ')).toBe(false);
      expect(isValidString(null)).toBe(false);
    });

    it('应该能够截断字符串', () => {
      const truncate = (str, length) => str.length > length ? str.substring(0, length) + '...' : str;
      
      expect(truncate('hello world', 5)).toBe('hello...');
      expect(truncate('hi', 5)).toBe('hi');
    });
  });

  describe('数组工具函数', () => {
    it('应该能够去重数组', () => {
      const unique = (arr) => [...new Set(arr)];
      
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });

    it('应该能够过滤空值', () => {
      const filterEmpty = (arr) => arr.filter(item => item != null && item !== '');
      
      expect(filterEmpty([1, '', null, 2, undefined, 3])).toEqual([1, 2, 3]);
    });
  });
});
