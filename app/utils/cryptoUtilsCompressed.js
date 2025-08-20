/**
 * 推广码压缩版加密解密工具类
 * 实现多种压缩方案，大幅减少推广码长度
 */

class CompressedCryptoUtils {
  constructor() {
    // 固定密钥，实际项目中应该使用更安全的密钥管理
    this.secretKey = 'ProjectZ2024PromoCode'
    this.version = 'v2' // 压缩版本标识
  }

  /**
   * Base58编码字符集 (去除易混淆字符 0, O, I, l)
   */
  base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

  /**
   * Base58编码
   * @param {Buffer} buffer 要编码的Buffer
   * @returns {string} Base58编码后的字符串
   */
  base58Encode(buffer) {
    if (buffer.length === 0) return ''
    
    let digits = [0]
    for (let i = 0; i < buffer.length; i++) {
      let carry = buffer[i]
      for (let j = 0; j < digits.length; j++) {
        carry += digits[j] << 8
        digits[j] = carry % 58
        carry = Math.floor(carry / 58)
      }
      while (carry > 0) {
        digits.push(carry % 58)
        carry = Math.floor(carry / 58)
      }
    }
    
    // 处理前导零
    let leadingZeros = 0
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
      leadingZeros++
    }
    
    return '1'.repeat(leadingZeros) + digits.reverse().map(d => this.base58Alphabet[d]).join('')
  }

  /**
   * Base58解码
   * @param {string} str Base58编码的字符串
   * @returns {Buffer} 解码后的Buffer
   */
  base58Decode(str) {
    if (str.length === 0) return Buffer.alloc(0)
    
    let bytes = [0]
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      const value = this.base58Alphabet.indexOf(char)
      if (value === -1) throw new Error('Invalid Base58 character')
      
      let carry = value
      for (let j = 0; j < bytes.length; j++) {
        carry += bytes[j] * 58
        bytes[j] = carry & 0xff
        carry >>= 8
      }
      while (carry > 0) {
        bytes.push(carry & 0xff)
        carry >>= 8
      }
    }
    
    // 处理前导1
    let leadingOnes = 0
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
      leadingOnes++
    }
    
    return Buffer.concat([
      Buffer.alloc(leadingOnes),
      Buffer.from(bytes.reverse())
    ])
  }

  /**
   * 简单的LZ77压缩算法
   * @param {string} text 要压缩的文本
   * @returns {string} 压缩后的文本
   */
  compress(text) {
    if (text.length < 10) return text // 短文本不压缩
    
    const result = []
    let i = 0
    
    while (i < text.length) {
      let bestLength = 0
      let bestDistance = 0
      
      // 查找最长匹配
      for (let j = Math.max(0, i - 255); j < i; j++) {
        let length = 0
        while (length < 255 && i + length < text.length && text[j + length] === text[i + length]) {
          length++
        }
        if (length > bestLength) {
          bestLength = length
          bestDistance = i - j
        }
      }
      
      if (bestLength >= 3) {
        // 输出匹配
        result.push(String.fromCharCode(0) + String.fromCharCode(bestDistance) + String.fromCharCode(bestLength))
        i += bestLength
      } else {
        // 输出字面字符
        result.push(text[i])
        i++
      }
    }
    
    return result.join('')
  }

  /**
   * LZ77解压缩
   * @param {string} compressed 压缩后的文本
   * @returns {string} 解压缩后的文本
   */
  decompress(compressed) {
    const result = []
    let i = 0
    
    while (i < compressed.length) {
      if (compressed.charCodeAt(i) === 0) {
        // 匹配引用
        const distance = compressed.charCodeAt(i + 1)
        const length = compressed.charCodeAt(i + 2)
        const start = result.length - distance
        
        for (let j = 0; j < length; j++) {
          result.push(result[start + j])
        }
        i += 3
      } else {
        // 字面字符
        result.push(compressed[i])
        i++
      }
    }
    
    return result.join('')
  }

  /**
   * XOR加密算法
   * @param {string} text 要加密的文本
   * @param {string} key 密钥
   * @returns {Buffer} 加密后的Buffer
   */
  xorEncrypt(text, key) {
    const buffer = Buffer.from(text, 'utf8')
    const result = Buffer.alloc(buffer.length)
    
    for (let i = 0; i < buffer.length; i++) {
      result[i] = buffer[i] ^ key.charCodeAt(i % key.length)
    }
    
    return result
  }

  /**
   * XOR解密算法
   * @param {Buffer} buffer 加密后的Buffer
   * @param {string} key 密钥
   * @returns {string} 解密后的文本
   */
  xorDecrypt(buffer, key) {
    const result = Buffer.alloc(buffer.length)
    
    for (let i = 0; i < buffer.length; i++) {
      result[i] = buffer[i] ^ key.charCodeAt(i % key.length)
    }
    
    return result.toString('utf8')
  }

  /**
   * 压缩推广码数据结构
   * @param {Object} promoData 原始推广码数据
   * @returns {Object} 压缩后的数据结构
   */
  compressPromoData(promoData) {
    const now = Math.floor(Date.now() / 1000) // 当前时间戳(秒)
    const createdAt = Math.floor(promoData.createdAt / 1000) // 创建时间戳(秒)
    const validDays = Math.round((promoData.expiresAt - promoData.createdAt) / (24 * 60 * 60 * 1000))
    
    // 使用单字符字段名和相对时间
    return {
      v: this.version,           // 版本标识
      p: promoData.provider,     // 供应商
      k: promoData.apiKey,       // API密钥
      m: promoData.model,        // 模型
      c: createdAt,              // 创建时间(秒级时间戳)
      d: validDays               // 有效天数
    }
  }

  /**
   * 解压缩推广码数据结构
   * @param {Object} compressedData 压缩后的数据结构
   * @returns {Object} 原始数据结构
   */
  decompressPromoData(compressedData) {
    const createdAt = compressedData.c * 1000 // 转换为毫秒时间戳
    const expiresAt = createdAt + (compressedData.d * 24 * 60 * 60 * 1000)
    
    return {
      provider: compressedData.p,
      apiKey: compressedData.k,
      model: compressedData.m,
      validDays: compressedData.d,
      createdAt: createdAt,
      expiresAt: expiresAt
    }
  }

  /**
   * 生成压缩版推广码
   * @param {string} provider AI供应商
   * @param {string} apiKey API密钥
   * @param {string} modelName 模型名称
   * @param {number} validDays 有效天数
   * @returns {string} 生成的压缩推广码
   */
  generateCompressedPromoCode(provider, apiKey, modelName, validDays) {
    const promoData = {
      provider: provider,
      apiKey: apiKey,
      model: modelName,
      validDays: validDays,
      createdAt: Date.now(),
      expiresAt: Date.now() + (validDays * 24 * 60 * 60 * 1000)
    }
    
    // 1. 压缩数据结构
    const compressedData = this.compressPromoData(promoData)
    
    // 2. 转换为JSON字符串
    const jsonStr = JSON.stringify(compressedData)
    
    // 3. 文本压缩
    const compressed = this.compress(jsonStr)
    
    // 4. XOR加密
    const encrypted = this.xorEncrypt(compressed, this.secretKey)
    
    // 5. Base58编码
    const encoded = this.base58Encode(encrypted)
    
    return encoded
  }

  /**
   * 验证压缩版推广码
   * @param {string} promoCode 推广码
   * @returns {Object} 验证结果
   */
  validateCompressedPromoCode(promoCode) {
    try {
      // 1. Base58解码
      const decoded = this.base58Decode(promoCode)
      
      // 2. XOR解密
      const decrypted = this.xorDecrypt(decoded, this.secretKey)
      
      // 3. 文本解压缩
      const decompressed = this.decompress(decrypted)
      
      // 4. 解析JSON
      const compressedData = JSON.parse(decompressed)
      
      // 5. 检查版本
      if (compressedData.v !== this.version) {
        return {
          valid: false,
          error: '推广码版本不匹配'
        }
      }
      
      // 6. 解压缩数据结构
      const promoData = this.decompressPromoData(compressedData)
      
      // 7. 检查必要字段
      if (!promoData.provider || !promoData.apiKey || !promoData.model) {
        return {
          valid: false,
          error: '推广码数据不完整'
        }
      }
      
      // 8. 检查是否过期
      const now = Date.now()
      if (now > promoData.expiresAt) {
        return {
          valid: false,
          error: '推广码已过期',
          expired: true
        }
      }
      
      return {
        valid: true,
        data: promoData,
        remainingDays: Math.ceil((promoData.expiresAt - now) / (24 * 60 * 60 * 1000))
      }
    } catch (error) {
      return {
        valid: false,
        error: '推广码格式错误或已损坏: ' + error.message
      }
    }
  }

  /**
   * 兼容性方法：同时支持新旧格式
   * @param {string} promoCode 推广码
   * @returns {Object} 验证结果
   */
  validatePromoCodeUniversal(promoCode) {
    // 首先尝试新格式
    const newResult = this.validateCompressedPromoCode(promoCode)
    if (newResult.valid) {
      return newResult
    }
    
    // 如果新格式失败，尝试旧格式
    try {
      // 导入旧版cryptoUtils
      const oldCrypto = require('./cryptoUtils.js')
      return oldCrypto.validatePromoCode(promoCode)
    } catch (error) {
      return {
        valid: false,
        error: '推广码格式不支持或已损坏'
      }
    }
  }

  /**
   * 测试压缩效果
   * @param {string} provider AI供应商
   * @param {string} apiKey API密钥
   * @param {string} modelName 模型名称
   * @param {number} validDays 有效天数
   * @returns {Object} 压缩效果对比
   */
  testCompressionRatio(provider, apiKey, modelName, validDays) {
    // 生成原始格式推广码
    const oldCrypto = require('./cryptoUtils.js')
    const oldCode = oldCrypto.generatePromoCode(provider, apiKey, modelName, validDays)
    
    // 生成压缩格式推广码
    const newCode = this.generateCompressedPromoCode(provider, apiKey, modelName, validDays)
    
    const compressionRatio = ((oldCode.length - newCode.length) / oldCode.length * 100).toFixed(1)
    
    return {
      original: {
        length: oldCode.length,
        code: oldCode
      },
      compressed: {
        length: newCode.length,
        code: newCode
      },
      compressionRatio: parseFloat(compressionRatio),
      savings: oldCode.length - newCode.length
    }
  }
}

// 导出单例
const compressedCryptoUtils = new CompressedCryptoUtils()
export default compressedCryptoUtils