/**
 * 推广码加密解密工具类
 * 实现简单的对称加密算法，兼容uniapp环境
 */

class CryptoUtils {
  constructor() {
    // 固定密钥，实际项目中应该使用更安全的密钥管理
    this.secretKey = 'ProjectZ2024PromoCode'
  }

  /**
   * 简单的XOR加密算法
   * @param {string} text 要加密的文本
   * @param {string} key 密钥
   * @returns {string} 加密后的十六进制字符串
   */
  xorEncrypt(text, key) {
    let result = ''
    for (let i = 0; i < text.length; i++) {
      const textChar = text.charCodeAt(i)
      const keyChar = key.charCodeAt(i % key.length)
      const encrypted = textChar ^ keyChar
      result += encrypted.toString(16).padStart(2, '0')
    }
    return result
  }

  /**
   * 简单的XOR解密算法
   * @param {string} encryptedHex 加密后的十六进制字符串
   * @param {string} key 密钥
   * @returns {string} 解密后的文本
   */
  xorDecrypt(encryptedHex, key) {
    let result = ''
    for (let i = 0; i < encryptedHex.length; i += 2) {
      const hexPair = encryptedHex.substring(i, i + 2)
      if (hexPair.length !== 2) break // 防止不完整的十六进制对
      
      const encryptedChar = parseInt(hexPair, 16)
      if (isNaN(encryptedChar)) break // 防止无效的十六进制
      
      const keyChar = key.charCodeAt((i / 2) % key.length)
      const decrypted = encryptedChar ^ keyChar
      result += String.fromCharCode(decrypted)
    }
    return result
  }

  /**
   * Base64编码
   * @param {string} str 要编码的字符串
   * @returns {string} Base64编码后的字符串
   */
  base64Encode(str) {
    // 兼容uniapp环境的Base64编码
    try {
      // #ifdef APP-PLUS || H5
      return btoa(unescape(encodeURIComponent(str)))
      // #endif
      // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
      return uni.arrayBufferToBase64(this.stringToArrayBuffer(str))
      // #endif
    } catch (e) {
      console.error('Base64编码失败:', e)
      return str
    }
  }

  /**
   * Base64解码
   * @param {string} str Base64编码的字符串
   * @returns {string} 解码后的字符串
   */
  base64Decode(str) {
    try {
      // #ifdef APP-PLUS || H5
      return decodeURIComponent(escape(atob(str)))
      // #endif
      // #ifdef MP-WEIXIN || MP-ALIPAY || MP-BAIDU || MP-TOUTIAO || MP-QQ
      return this.arrayBufferToString(uni.base64ToArrayBuffer(str))
      // #endif
    } catch (e) {
      console.error('Base64解码失败:', e)
      return str
    }
  }

  /**
   * 字符串转ArrayBuffer
   * @param {string} str 字符串
   * @returns {ArrayBuffer} ArrayBuffer
   */
  stringToArrayBuffer(str) {
    const buf = new ArrayBuffer(str.length * 2)
    const bufView = new Uint16Array(buf)
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i)
    }
    return buf
  }

  /**
   * ArrayBuffer转字符串
   * @param {ArrayBuffer} buf ArrayBuffer
   * @returns {string} 字符串
   */
  arrayBufferToString(buf) {
    return String.fromCharCode.apply(null, new Uint16Array(buf))
  }

  /**
   * 通用加密方法
   * @param {string} text 要加密的文本
   * @returns {string} 加密后的字符串
   */
  encrypt(text) {
    try {
      // 使用XOR加密
      const encrypted = this.xorEncrypt(text, this.secretKey)
      
      // 使用Base64编码
      const encoded = this.base64Encode(encrypted)
      
      return encoded
    } catch (error) {
      console.error('加密失败:', error)
      throw new Error('加密失败')
    }
  }

  /**
   * 通用解密方法
   * @param {string} encryptedText 加密的文本
   * @returns {string} 解密后的文本
   */
  decrypt(encryptedText) {
    try {
      // Base64解码
      const decoded = this.base64Decode(encryptedText)
      
      // XOR解密
      const decrypted = this.xorDecrypt(decoded, this.secretKey)
      
      return decrypted
    } catch (error) {
      console.error('解密失败:', error)
      throw new Error('解密失败')
    }
  }

  /**
   * 加密推广码数据
   * @param {Object} promoData 推广码数据对象
   * @returns {string} 加密后的推广码
   */
  encryptPromoCode(promoData) {
    try {
      // 将对象转换为JSON字符串
      const jsonStr = JSON.stringify(promoData)
      
      // 使用通用加密方法
      return this.encrypt(jsonStr)
    } catch (error) {
      console.error('推广码加密失败:', error)
      throw new Error('推广码加密失败')
    }
  }

  /**
   * 解密推广码
   * @param {string} encryptedCode 加密的推广码
   * @returns {Object} 解密后的推广码数据对象
   */
  decryptPromoCode(encryptedCode) {
    try {
      if (!encryptedCode || encryptedCode.trim() === '') {
        throw new Error('推广码不能为空')
      }
      
      // 使用通用解密方法
      const decrypted = this.decrypt(encryptedCode)
      console.log('解密结果:', decrypted)
      
      if (!decrypted || decrypted.trim() === '') {
        throw new Error('解密结果为空')
      }
      
      // 解析JSON
      const promoData = JSON.parse(decrypted)
      
      return promoData
    } catch (error) {
      console.error('推广码解密失败:', encryptedCode, error)
      throw new Error('推广码格式错误或已损坏: ' + error.message)
    }
  }

  /**
   * 生成推广码
   * @param {string} provider AI供应商
   * @param {string} apiKey API密钥
   * @param {string} modelName 模型名称
   * @param {number} validDays 有效天数
   * @returns {string} 生成的推广码
   */
  generatePromoCode(provider, apiKey, modelName, validDays) {
    const promoData = {
      provider: provider,
      apiKey: apiKey,
      model: modelName,  // 使用model字段保持一致性
      validDays: validDays,
      createdAt: Date.now(),
      expiresAt: Date.now() + (validDays * 24 * 60 * 60 * 1000)
    }
    
    return this.encryptPromoCode(promoData)
  }

  /**
   * Base58字符集 (去除易混淆字符 0, O, I, l)
   */
  get base58Alphabet() {
    return '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
  }

  /**
   * Base58编码
   * @param {string} hexStr 十六进制字符串
   * @returns {string} Base58编码字符串
   */
  base58Encode(hexStr) {
    if (!hexStr || hexStr.length === 0) return ''
    
    // 清理和验证十六进制字符串
    const cleanHex = hexStr.replace(/^0x/, '').replace(/[^0-9a-fA-F]/g, '')
    if (cleanHex.length === 0) return ''
    
    // 确保十六进制字符串长度为偶数
    const paddedHex = cleanHex.length % 2 ? '0' + cleanHex : cleanHex
    
    try {
      let num = BigInt('0x' + paddedHex)
      let encoded = ''
      
      while (num > 0) {
        const remainder = num % 58n
        encoded = this.base58Alphabet[Number(remainder)] + encoded
        num = num / 58n
      }
      
      // 处理前导零字节（每两个字符代表一个字节）
      let leadingZeros = 0
      for (let i = 0; i < paddedHex.length; i += 2) {
        if (paddedHex.substr(i, 2) === '00') {
          leadingZeros++
        } else {
          break
        }
      }
      
      // 前导零字节用'1'表示
      return '1'.repeat(leadingZeros) + encoded
    } catch (error) {
      console.error('Base58编码失败:', error)
      return ''
    }
  }

  /**
   * Base58解码
   * @param {string} encoded Base58编码字符串
   * @returns {string} 十六进制字符串
   */
  base58Decode(encoded) {
    if (!encoded || encoded.length === 0) return ''
    
    try {
      // 计算前导'1'的数量
      let leadingOnes = 0
      for (let i = 0; i < encoded.length; i++) {
        if (encoded[i] === '1') {
          leadingOnes++
        } else {
          break
        }
      }
      
      // 解码剩余部分
      let num = 0n
      const base = 58n
      
      for (let i = leadingOnes; i < encoded.length; i++) {
        const char = encoded[i]
        const value = this.base58Alphabet.indexOf(char)
        if (value === -1) {
          throw new Error(`无效的Base58字符: ${char}`)
        }
        num = num * base + BigInt(value)
      }
      
      // 转换为十六进制字符串
      let hex = num.toString(16)
      if (hex.length % 2) hex = '0' + hex
      
      // 添加前导零字节
      const leadingZeros = '00'.repeat(leadingOnes)
      return leadingZeros + hex
    } catch (error) {
      console.error('Base58解码失败:', error)
      return ''
    }
  }

  /**
   * 生成压缩版推广码
   * @param {string} provider 供应商
   * @param {string} apiKey API密钥
   * @param {string} modelName 模型名称
   * @param {number} validDays 有效天数
   * @returns {string} 压缩版推广码
   */
  generateCompressedPromoCode(provider, apiKey, modelName, validDays) {
    const now = Math.floor(Date.now() / 1000) // 秒级时间戳
    const compressedData = {
      p: provider,
      k: apiKey,
      m: modelName,
      e: now + (validDays * 24 * 60 * 60)
    }
    
    const jsonStr = JSON.stringify(compressedData)
    const encrypted = this.xorEncrypt(jsonStr, this.secretKey)
    
    // 使用Base58编码替代Base64
    return 'v2_' + this.base58Encode(encrypted)
  }

  /**
   * 验证压缩版推广码
   * @param {string} promoCode 压缩版推广码
   * @returns {Object} 验证结果
   */
  validateCompressedPromoCode(promoCode) {
    try {
      if (!promoCode.startsWith('v2_')) {
        return { valid: false, error: '不是压缩版推广码格式' }
      }
      
      const base58Part = promoCode.substring(3)
      if (!base58Part) {
        return { valid: false, error: 'Base58部分为空' }
      }
      
      const encryptedHex = this.base58Decode(base58Part)
      if (!encryptedHex) {
        return { valid: false, error: 'Base58解码失败' }
      }
      
      // 直接解密十六进制字符串
      const decrypted = this.xorDecrypt(encryptedHex, this.secretKey)
      if (!decrypted) {
        return { valid: false, error: '解密失败' }
      }
      
      const promoData = JSON.parse(decrypted)
      
      // 检查必要字段
      if (!promoData.p || !promoData.k || !promoData.m || !promoData.e) {
        return {
          valid: false,
          error: '推广码数据不完整'
        }
      }
      
      // 检查是否过期
      const now = Math.floor(Date.now() / 1000)
      if (now > promoData.e) {
        return {
          valid: false,
          error: '推广码已过期'
        }
      }
      
      const remainingSeconds = promoData.e - now
      const remainingDays = Math.ceil(remainingSeconds / (24 * 60 * 60))
      
      return {
        valid: true,
        data: {
          provider: promoData.p,
          apiKey: promoData.k,
          model: promoData.m,
          validDays: promoData.d,
          expiresAt: promoData.e * 1000  // 转换为毫秒时间戳
        },
        remainingDays: remainingDays
      }
    } catch (error) {
      console.error('压缩版推广码验证失败:', error)
      return {
        valid: false,
        error: '推广码格式错误或已损坏'
      }
    }
  }

  /**
   * 通用推广码验证（兼容新旧格式）
   * @param {string} promoCode 推广码
   * @returns {Object} 验证结果
   */
  validatePromoCodeUniversal(promoCode) {
    // 检查是否为压缩版格式
    if (promoCode.startsWith('v2_')) {
      return this.validateCompressedPromoCode(promoCode)
    } else {
      return this.validatePromoCode(promoCode)
    }
  }

  /**
   * 验证推广码是否有效（原版格式）
   * @param {string} promoCode 推广码
   * @returns {Object} 验证结果
   */
  validatePromoCode(promoCode) {
    try {
      const promoData = this.decryptPromoCode(promoCode)
      console.log('解密后的推广码数据:', promoData)
      console.log('数据字段检查:', {
        provider: !!promoData.provider,
        apiKey: !!promoData.apiKey,
        model: !!promoData.model,
        expiresAt: !!promoData.expiresAt
      })
      
      // 检查必要字段 (注意：数据中使用的是model字段，不是modelName)
      if (!promoData.provider || !promoData.apiKey || !promoData.model || !promoData.expiresAt) {
        return {
          valid: false,
          error: '推广码数据不完整'
        }
      }
      
      // 检查是否过期
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
        error: error.message
      }
    }
  }
}

// 导出单例
const cryptoUtils = new CryptoUtils()
export default cryptoUtils