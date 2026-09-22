import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', {
  state: () => ({ items: [] }),   // {id, name, emoji, cap, price, qty}
  getters: {
    count: (s) => s.items.reduce((a, i) => a + i.qty, 0),
    total: (s) => s.items.reduce((a, i) => a + Number(i.price) * i.qty, 0).toFixed(2)
  },
  actions: {
    add(item) {
      const ex = this.items.find(i => i.id === item.id && i.cap === item.cap)
      if (ex) ex.qty += item.qty
      else this.items.push(item)
      uni.showToast({ title: '已加入购物车', icon: 'none' })
    },
    changeQty(index, d) {
      this.items[index].qty += d
      if (this.items[index].qty <= 0) this.items.splice(index, 1)
    },
    remove(index) { this.items.splice(index, 1) },
    clear() { this.items = [] }
  },
  persist: true   // 购物车本地持久化
})
