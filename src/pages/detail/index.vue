<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchProduct } from '../../api'
import { useCartStore } from '../../store/cart'

const cart = useCartStore()
const p = ref(null)
const capIndex = ref(1)
const qty = ref(1)

onLoad((opt) => { load(opt.id) })
async function load(id) { p.value = await fetchProduct(id) }

const curCap = computed(() => p.value ? p.value.caps[capIndex.value] : null)
const total = computed(() => curCap.value ? (curCap.value.price * qty.value).toFixed(1) : '0')

function pickCap(i) { capIndex.value = i }
function chg(d) { qty.value = Math.min(99, Math.max(1, qty.value + d)) }

function addCart() {
  cart.add({ id: p.value.id, name: p.value.name, emoji: p.value.emoji, cap: curCap.value.label, price: curCap.value.price, qty: qty.value })
}
function buyNow() {
  cart.clear()
  cart.add({ id: p.value.id, name: p.value.name, emoji: p.value.emoji, cap: curCap.value.label, price: curCap.value.price, qty: qty.value })
  uni.navigateTo({ url: '/pages/checkout/index' })
}
</script>

<template>
  <view v-if="p">
    <view class="gallery">{{ p.emoji }}</view>

    <view class="card">
      <view style="display:flex;align-items:baseline;gap:8px;">
        <view class="price" style="font-size:22px;">¥{{ total }}</view>
        <view style="font-size:11px;color:#6b7280;text-decoration:line-through;">¥{{ curCap.original * qty }}</view>
        <view style="font-size:10px;background:#fee2e2;color:#dc2626;padding:2px 7px;border-radius:99px;">特惠</view>
      </view>
      <view style="font-size:14px;font-weight:700;margin-top:6px;">{{ p.name }} {{ p.sub }}</view>
      <view class="row-between" style="margin-top:8px;padding-top:8px;border-top:1px dashed #e5e7eb;">
        <text class="muted">销量 {{ p.sales }}+</text>
        <text class="muted">库存 {{ p.stock }} 件</text>
        <text class="muted">苏州发货</text>
      </view>
    </view>

    <view class="card">
      <view style="font-size:13px;font-weight:700;">📦 选择容量</view>
      <view style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <view v-for="(c, i) in p.caps" :key="c.label" class="opt" :class="{ on: i === capIndex }" @click="pickCap(i)">{{ c.label }} · ¥{{ c.price }}</view>
      </view>
    </view>

    <view class="card row-between">
      <text style="font-size:13px;font-weight:700;">购买数量</text>
      <view style="display:flex;align-items:center;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <button style="width:28px;height:28px;font-size:14px;background:#f3f4f6;padding:0;line-height:28px;" @click="chg(-1)">−</button>
        <text style="width:36px;text-align:center;font-size:12px;font-weight:600;">{{ qty }}</text>
        <button style="width:28px;height:28px;font-size:14px;background:#f3f4f6;padding:0;line-height:28px;" @click="chg(1)">＋</button>
      </view>
    </view>

    <view class="card">
      <view style="font-size:13px;font-weight:700;margin-bottom:8px;">💬 用户评价 <text style="font-weight:400;font-size:11px;color:#6b7280;">好评率98%</text></view>
      <view style="font-size:12px;color:#6b7280;line-height:1.7;background:#f7f8fa;border-radius:10px;padding:10px;">
        "传输很快，金属质感不错，挂钥匙上很方便。" ⭐⭐⭐⭐⭐<br>
        "买了10个公司用，刻字服务很精致。" ⭐⭐⭐⭐⭐
      </view>
    </view>
    <view style="height:10px"></view>

    <!-- 吸底购买栏 -->
    <view class="buybar">
      <button class="bar-half btn-blue" @click="addCart">加入购物车</button>
      <button class="bar-half btn-primary" style="border-radius:0 99px 99px 0;" @click="buyNow">立即购买</button>
    </view>
  </view>
</template>

<style scoped>
.gallery { height: 220px; background: linear-gradient(160deg, #eef2ff, #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 80px; }
.opt { font-size: 11px; padding: 6px 12px; border-radius: 8px; border: 1.5px solid #e5e7eb; color: #6b7280; background: #fafafa; }
.opt.on { border-color: #2563eb; color: #2563eb; background: #eff6ff; font-weight: 600; }
.buybar { position: fixed; bottom: 0; left: 0; right: 0; display: flex; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: #fff; box-shadow: 0 -4px 14px rgba(0,0,0,.06); }
.bar-half { flex: 1; height: 40px; font-size: 13px; line-height: 40px; border-radius: 0; }
</style>
