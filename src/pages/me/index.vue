<script setup>
import { useUserStore } from '../../store/user'
const user = useUserStore()

const entries = [
  { ic: '🏢', t: '企业批量定制', cb: () => uni.showToast({ title: '企业定制：100个起订，联系客服', icon: 'none' }) },
  { ic: '🎧', t: '联系客服', cb: () => uni.showToast({ title: '客服微信：usb-service', icon: 'none' }) },
  { ic: '📍', t: '地址管理', cb: () => uni.showToast({ title: '演示功能', icon: 'none' }) },
  { ic: '🎁', t: '分享得券', cb: () => uni.showToast({ title: '分享成功得5元券', icon: 'none' }) }
]

function goOrders(status) { uni.navigateTo({ url: `/pages/order/list?status=${status}` }) }
function goLogin() { uni.navigateTo({ url: '/pages/login/index' }) }
function logout() {
  uni.showModal({ title: '退出登录', success: (r) => { if (r.confirm) user.logout() } })
}
</script>

<template>
  <view>
    <view class="me-head">
      <view class="ava" @click="goLogin">{{ user.isLogin ? '👤' : '👉' }}</view>
      <view>
        <view style="font-size:16px;font-weight:700;">{{ user.isLogin ? (user.nickname || user.phone) : '点击登录' }}</view>
        <view style="font-size:11px;opacity:.8;margin-top:4px;">🎟 优惠券 2 张 ›</view>
      </view>
    </view>

    <view class="card" style="margin-top:10px;padding:0;">
      <view class="muted" style="padding:12px 14px 0;font-size:12px;">我的订单</view>
      <view class="oe-row">
        <view class="oe" @click="goOrders(0)"><text class="ic">💳</text>待支付</view>
        <view class="oe" @click="goOrders(1)"><text class="ic">📷</text>待确认</view>
        <view class="oe" @click="goOrders(2)"><text class="ic">📦</text>待发货</view>
        <view class="oe" @click="goOrders(5)"><text class="ic">🚚</text>已发货</view>
        <view class="oe" @click="goOrders(3)"><text class="ic">✅</text>已完成</view>
      </view>
    </view>

    <view class="card" style="padding:0;overflow:hidden;">
      <view v-for="e in entries" :key="e.t" class="cell" @click="e.cb">
        <text>{{ e.ic }} {{ e.t }}</text><text style="color:#c0c4cc;">›</text>
      </view>
    </view>

    <button v-if="user.isLogin" style="margin:22px 12px;background:#fff;color:#6b7280;font-size:13px;" @click="logout">退出登录</button>
  </view>
</template>

<style scoped>
.me-head { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; padding: 24px 16px; border-radius: 0 0 24px 24px; display: flex; gap: 14px; align-items: center; }
.ava { width: 56px; height: 56px; border-radius: 50%; background: rgba(255,255,255,.25); display: flex; align-items: center; justify-content: center; font-size: 26px; }
.oe-row { display: flex; justify-content: space-around; padding: 14px 0; }
.oe { text-align: center; font-size: 10px; color: #6b7280; }
.oe .ic { font-size: 20px; display: block; margin-bottom: 4px; }
.cell { display: flex; justify-content: space-between; padding: 14px; font-size: 13px; color: #1a2233; border-bottom: 1px solid #f3f4f6; }
.cell:last-child { border-bottom: none; }
</style>
