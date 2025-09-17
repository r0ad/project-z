/**
 * 简单测试 - 验证 Jest 配置
 */

describe('简单测试', () => {
  it('应该能够运行基本测试', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该能够使用 ES6 语法', () => {
    const arr = [1, 2, 3]
    const doubled = arr.map(x => x * 2)
    expect(doubled).toEqual([2, 4, 6])
  })

  it('应该能够使用 async/await', async () => {
    const promise = Promise.resolve('test')
    const result = await promise
    expect(result).toBe('test')
  })
})
