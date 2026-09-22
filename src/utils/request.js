import { API_BASE, TOKEN_KEY, USE_MOCK } from './config'
import { mockRequest } from './mock'

/**
 * 统一请求封装
 * - 自动注入 token
 * - 统一错误处理与 toast
 * - 开发期走 Mock（VUE_APP_USE_MOCK=true），后端就绪后改为 false
 */
export function request(options) {
  if (USE_MOCK) return mockRequest(options)

  return new Promise((resolve, reject) => {
    const token = uni.getStorageSync(TOKEN_KEY)
    uni.request({
      url: API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        const body = res.data
        if (body && body.code === 0) {
          resolve(body.data)
        } else if (body && body.code === 1002) {
          uni.removeStorageSync(TOKEN_KEY)
          uni.navigateTo({ url: '/pages/login/index' })
          reject(body)
        } else {
          uni.showToast({ title: (body && body.msg) || '请求失败', icon: 'none' })
          reject(body)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

export const get = (url, data) => request({ url, method: 'GET', data })
export const post = (url, data) => request({ url, method: 'POST', data })
