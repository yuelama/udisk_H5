<script setup>
import { ref, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { fetchOrders } from '../../api'

const STATUS = ['待支付', '待确认', '待发货', '已完成', '已关闭', '已发货']
const tabs = ['全部', '待支付', '待确认', '待发货', '已完成']
const active = ref('全部')
const list = ref([])

onLoad((opt) => { if (opt.status !== undefined) active.value = tabs[Number(opt.status) + 1] || '全部' })
onShow(() => load())

function statusFilter() {
  return active.value === '全部' ? '' : STATUS.indexOf(active.value)
}
async function load() {
  const res = await fetchOrders({ status: statusFilter() })
  list.value = res.results
}
function switchTab(t) { active.value = t; load() }
function payAgain(o) { uni.redirectTo({ url: `/pages/cashier/index?order_no=${o.order_no}` }) }
function confirmReceive(o) {
  uni.showModal({
    title: '确认收货',
    content: '确认已收到货物？',
    success: async (r) => {
      if (r.confirm) { await import('../../api').then(m => m.confirmReceive(o.order_no)); load() }
    }
  })
}
function goDetail(o) { uni.navigateTo({ url: `/pages/order/detail/index?order_no=${o.order_no}` }) }
</script>

<template>
  <view>
    <scroll-view scroll-x style="white-space:nowrap;background:#fff;padding:10px 12px;position:sticky;top:0;z-index:3;">
      <view v-for="t in tabs" :key="t" class="tab" :class="{ on: t === active }" @click="switchTab(t)">{{ t }}</view>
    </scroll-view>

    <block v-if="list.length">
      <view v-for="o in list" :key="o.order_no" class="o-item">
        <view class="row-between">
          <text class="muted" style="font-size:11px;">{{ o.order_no }}</text>
          <text class="o-status" :class="{ g: o.status === 3 }">{{ STATUS[o.status] }}</text>
        </view>
        <view style="display:flex;gap:8px;margin-top:10px;align-items:center;">
          <view v-for="(c, i) in o.items" :key="i" style="width:44px;height:44px;border-radius:8px;background:linear-gradient(160deg,#eef2ff,#dbeafe);display:flex;align-items:center;justify-content:center;font-size:20px;">{{ c.emoji }}</view>
          <view style="flex:1;text-align:right;">
            <view class="muted" style="font-size:11px;">共{{ o.items.reduce((a, c) => a + c.qty, 0) }}件</view>
            <view style="font-weight:700;font-size:13px;">¥{{ o.pay_amount }}</view>
          </view>
        </view>
        <view class="row-between" style="margin-top:10px;justify-content:flex-end;gap:8px;">
          <button v-if="o.status === 0" class="mini plain" @click="payAgain(o)">去支付</button>
          <button v-if="o.status === 5" class="mini primary" @click="confirmReceive(o)">确认收货</button>
          <button class="mini plain" @click="goDetail(o)">查看详情</button>
        </view>
      </view>
    </block>
    <view v-else class="empty">📭 暂无相关订单</view>
  </view>
</template>

<style scoped>
.tab { display: inline-block; font-size: 12px; padding: 6px 13px; border-radius: 99px; color: #6b7280; margin-right: 8px; }
.tab.on { background: #2563eb; color: #fff; font-weight: 600; }
.o-item { background: #fff; border-radius: 12px; margin: 10px 12px; padding: 12px; }
.o-status { font-size: 12px; color: #dc2626; font-weight: 600; }
.o-status.g { color: #16a34a; }
.empty { text-align: center; padding: 80px 0; color: #6b7280; font-size: 12px; }
.mini { font-size: 11px; padding: 0 14px; height: 28px; line-height: 28px; border-radius: 99px; margin-left: 8px; }
.mini.plain { background: #fff; border: 1px solid #e5e7eb; color: #1a2233; }
.mini.primary { background: linear-gradient(90deg, #f97316, #ea580c); color: #fff; }
</style>
