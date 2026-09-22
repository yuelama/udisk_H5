import { defineStore } from 'pinia'
import { TOKEN_KEY } from '../utils/config'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: uni.getStorageSync(TOKEN_KEY) || '',
    phone: '',
    nickname: ''
  }),
  getters: {
    isLogin: (s) => !!s.token
  },
  actions: {
    setLogin(token, user) {
      this.token = token
      this.phone = user.phone || ''
      this.nickname = user.nickname || ''
      uni.setStorageSync(TOKEN_KEY, token)
    },
    logout() {
      this.token = ''
      this.phone = ''
      this.nickname = ''
      uni.removeStorageSync(TOKEN_KEY)
    }
  }
})
