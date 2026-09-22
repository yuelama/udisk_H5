<script setup>
import { useCartStore } from '../../store/cart'
const cart = useCartStore()
function goHome() { uni.switchTab({ url: '/pages/home/index' }) }
function checkout() {
  if (!cart.items.length) return uni.showToast({ title: '购物车是空的', icon: 'none' })
  uni.navigateTo({ url: '/pages/checkout/index' })
}
</script>

<template>
  <view>
    <block v-if="cart.items.length">
      <view v-for="(c, i) in cart.items" :key="i" class="ck-item">
        <view class="ck-img">{{ c.emoji }}</view>
        <view style="flex:1">
          <view style="font-size:13px;font-weight:600;">{{ c.name }}</view>
          <view style="font-size:11px;color:#6b7280;margin-top:2px;">{{ c.cap }} · ¥{{ c.price }}</view>
          <view class="row-between" style="margin-top:6px;">
            <view class="price" style="font-size:14px;">¥{{ (c.price * c.qty).toFixed(1) }}</view>
            <view style="display:flex;align-items:center;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <button style="width:26px;height:26px;font-size:13px;background:#f3f4f6;padding:0;line-height:26px;" @click="cart.changeQty(i, -1)">−</button>
              <text style="width:32px;text-align:center;font-size:12px;">{{ c.qty }}</text>
              <button style="width:26px;height:26px;font-size:13px;background:#f3f4f6;padding:0;line-height:26px;" @click="cart.changeQty(i, 1)">＋</button>
            </view>
          </view>
        </view>
      </view>
    </block>
    <view v-else class="empty">
      <view style="font-size:40px;">🛒</view>
      <view style="margin:16px 0;">购物车还是空的</view>
      <button class="btn-primary" style="font-size:12px;padding:0 22px;height:34px;line-height:34px;" @click="goHome">去逛逛</button>
    </view>
    <view style="height:70px"></view>

    <view class="cartbar">
      <text style="font-size:12px;color:#6b7280;">合计：<text class="price" style="font-size:17px;">¥{{ cart.total }}</text></text>
      <button class="btn-primary" style="height:38px;padding:0 24px;font-size:13px;line-height:38px;" @click="checkout">去结算</button>
    </view>
  </view>
</template>

<style scoped>
.ck-item { display: flex; gap: 10px; background: #fff; border-radius: 12px; margin: 10px 12px; padding: 12px; }
.ck-img { width: 56px; height: 56px; border-radius: 8px; background: linear-gradient(160deg, #eef2ff, #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 26px; flex-shrink: 0; }
.empty { text-align: center; padding: 70px 0; color: #6b7280; font-size: 12px; }
.cartbar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 14px rgba(0,0,0,.06); }
</style>
