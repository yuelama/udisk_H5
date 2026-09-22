<script setup>
import { ref, computed, onMounted } from 'vue'
import { previewOrder, createOrder, fetchCoupons } from '../../api'
import { useCartStore } from '../../store/cart'
import { useUserStore } from '../../store/user'

const cart = useCartStore()
const user = useUserStore()
const coupons = ref([])
const couponAmount = ref(10)
const preview = ref(null)
const remark = ref('')
const submitting = ref(false)

const goods = computed(() => cart.total)

onMounted(async () => {
  coupons.value = (await fetchCoupons()).results
  await calc()
})

async function calc() {
  preview.value = await previewOrder({
    items: cart.items.map(i => ({ price: i.price, qty: i.qty })),
    coupon_amount: couponAmount.value
  })
}

function pickCoupon(c) {
  couponAmount.value = Number(c.amount)
  calc()
}

async function submit() {
  if (!user.isLogin) {
    uni.navigateTo({ url: '/pages/login/index?back=/pages/checkout/index' })
    return
  }
  if (submitting.value) return
  submitting.value = true
  try {
    const order = await createOrder({
      items: cart.items.map(i => ({ price: i.price, qty: i.qty, name: i.name, cap: i.cap, emoji: i.emoji })),
      coupon_amount: couponAmount.value,
      remark: remark.value
    })
    cart.clear()
    uni.redirectTo({ url: `/pages/cashier/index?order_no=${order.order_no}` })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view>
    <view class="card row-between">
      <view style="display:flex;gap:10px;align-items:center;">
        <text style="font-size:18px;">📍</text>
        <view>
          <view style="font-size:13px;font-weight:700;">张三 <text style="font-weight:400;color:#6b7280;font-size:11px;">138****6688</text></view>
          <view class="muted" style="margin-top:2px;">江苏省苏州市工业园区星湖街328号 A栋501</view>
        </view>
      </view>
      <text style="color:#c0c4cc;">›</text>
    </view>

    <view class="card">
      <view v-for="(c, i) in cart.items" :key="i" style="display:flex;gap:10px;padding:6px 0;">
        <view style="width:48px;height:48px;border-radius:8px;background:linear-gradient(160deg,#eef2ff,#dbeafe);display:flex;align-items:center;justify-content:center;font-size:22px;">{{ c.emoji }}</view>
        <view style="flex:1">
          <view style="font-size:12px;font-weight:600;">{{ c.name }} {{ c.cap }}</view>
          <view class="row-between" style="margin-top:4px;">
            <text class="muted" style="font-size:11px;">×{{ c.qty }}</text>
            <text style="font-size:12px;font-weight:700;">¥{{ (c.price * c.qty).toFixed(1) }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="card">
      <view style="font-size:13px;font-weight:700;margin-bottom:8px;">🎟 优惠券</view>
      <view style="display:flex;gap:8px;flex-wrap:wrap;">
        <view v-for="c in coupons" :key="c.id" class="cp" :class="{ on: couponAmount === Number(c.amount) }" @click="pickCoupon(c)">
          {{ c.title }}
        </view>
      </view>
    </view>

    <view class="card">
      <view style="font-size:13px;font-weight:700;">📝 订单备注</view>
      <textarea v-model="remark" style="width:100%;background:#f7f8fa;border-radius:10px;padding:10px;font-size:12px;margin-top:8px;box-sizing:border-box;" placeholder="选填（如发票信息、企业定制刻字内容）"></textarea>
    </view>

    <view class="card" v-if="preview">
      <view class="row-between fee"><text>商品金额</text><text>¥{{ preview.goods_amount }}</text></view>
      <view class="row-between fee"><text>运费</text><text>¥{{ preview.freight }}</text></view>
      <view class="row-between fee"><text>优惠</text><text style="color:#dc2626;">−¥{{ preview.discount_amount }}</text></view>
      <view style="border-top:1px dashed #e5e7eb;margin:8px 0;"></view>
      <view class="row-between"><text style="font-weight:700;">合计</text><text class="price" style="font-size:18px;">¥{{ preview.pay_amount }}</text></view>
    </view>
    <view style="height:70px"></view>

    <view class="cartbar">
      <text style="font-size:11px;color:#6b7280;">合计：<text class="price" style="font-size:17px;" v-if="preview">¥{{ preview.pay_amount }}</text></text>
      <button class="btn-primary" style="height:40px;padding:0 28px;font-size:14px;line-height:40px;" :disabled="submitting" @click="submit">{{ submitting ? '提交中…' : '提交订单' }}</button>
    </view>
  </view>
</template>

<style scoped>
.cp { font-size: 11px; padding: 6px 12px; border-radius: 8px; border: 1.5px solid #e5e7eb; color: #6b7280; }
.cp.on { border-color: #dc2626; color: #dc2626; background: #fef2f2; font-weight: 600; }
.fee { font-size: 12px; color: #6b7280; padding: 3px 0; }
.cartbar { position: fixed; bottom: 0; left: 0; right: 0; background: #fff; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); display: flex; justify-content: space-between; align-items: center; box-shadow: 0 -4px 14px rgba(0,0,0,.06); }
</style>
