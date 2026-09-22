<script setup>
import { ref, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchOrders } from '../../../api'

const STATUS = ['待支付', '待确认', '待发货', '已完成', '已关闭', '已发货']
const order = ref(null)

onLoad(async (opt) => {
  const res = await fetchOrders({})
  order.value = res.results.find(o => o.order_no === opt.order_no)
})
</script>

<template>
  <view v-if="order">
    <view class="status-banner">{{ STATUS[order.status] }}</view>

    <view class="card">
      <view style="font-size:13px;font-weight:700;margin-bottom:8px;">📍 收货信息</view>
      <view style="font-size:12px;">{{ order.address.name }} {{ order.address.phone }}</view>
      <view class="muted" style="margin-top:3px;">{{ order.address.detail }}</view>
    </view>

    <view class="card">
      <view v-for="(c, i) in order.items" :key="i" style="display:flex;gap:10px;padding:6px 0;">
        <view style="width:48px;height:48px;border-radius:8px;background:linear-gradient(160deg,#eef2ff,#dbeafe);display:flex;align-items:center;justify-content:center;font-size:22px;">{{ c.emoji }}</view>
        <view style="flex:1">
          <view style="font-size:12px;font-weight:600;">{{ c.name }} {{ c.cap }}</view>
          <view class="row-between" style="margin-top:4px;">
            <text class="muted" style="font-size:11px;">×{{ c.qty }}</text>
            <text style="font-size:12px;font-weight:700;">¥{{ (c.price * c.qty).toFixed(1) }}</text>
          </view>
        </view>
      </view>
      <view v-if="order.remark" class="muted" style="margin-top:6px;">备注：{{ order.remark }}</view>
    </view>

    <!-- 付款凭证 -->
    <view class="card" v-if="order.proof">
      <view style="font-size:13px;font-weight:700;margin-bottom:8px;">📷 付款凭证</view>
      <image :src="order.proof" mode="widthFix" style="width:180px;border-radius:10px;" />
    </view>

    <view class="card">
      <view class="row-between fee"><text>商品金额</text><text>¥{{ order.goods_amount }}</text></view>
      <view class="row-between fee"><text>优惠</text><text style="color:#dc2626;">−¥{{ order.discount_amount }}</text></view>
      <view class="row-between fee"><text>运费</text><text>¥0.00</text></view>
      <view style="border-top:1px dashed #e5e7eb;margin:8px 0;"></view>
      <view class="row-between"><text style="font-weight:700;">合计</text><text class="price" style="font-size:17px;">¥{{ order.pay_amount }}</text></view>
    </view>
  </view>
</template>

<style scoped>
.status-banner { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: #fff; font-size: 18px; font-weight: 800; padding: 24px 16px; border-radius: 0 0 20px 20px; }
.fee { font-size: 12px; color: #6b7280; padding: 3px 0; }
</style>
