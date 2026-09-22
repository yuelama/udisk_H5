<script setup>
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchProducts, fetchCategories } from '../../api'
import { useCartStore } from '../../store/cart'

const cart = useCartStore()
const products = ref([])
const categories = ref(['全部'])
const activeCat = ref('全部')
const countdown = ref('02:15:36')

onMounted(async () => {
  const [prods, cats] = await Promise.all([fetchProducts({}), fetchCategories()])
  products.value = prods.results
  categories.value = ['全部', ...cats]
  startCountdown()
})
onShow(() => {})

function startCountdown() {
  let t = 2 * 3600 + 15 * 60 + 36
  setInterval(() => {
    t = Math.max(0, t - 1)
    const f = (x) => String(x).padStart(2, '0')
    countdown.value = `${f(Math.floor(t / 3600))}:${f(Math.floor(t % 3600 / 60))}:${f(t % 60)}`
  }, 1000)
}

function switchCat(c) {
  activeCat.value = c
  fetchProducts({ category: c === '全部' ? '' : c }).then(res => products.value = res.results)
}

function goDetail(id) { uni.navigateTo({ url: `/pages/detail/index?id=${id}` }) }
</script>

<template>
  <view>
    <!-- 品牌横幅 -->
    <view class="hero">
      <view class="hero-title">高速存储 闪购节</view>
      <view class="hero-sub">USB 3.2 高速传输 · 五年质保换新 · 全场满99包邮</view>
      <view class="hero-tags">
        <text>🔥 今日特惠</text><text>⚡ 极速发货</text><text>🛡 正品保障</text>
      </view>
    </view>

    <!-- 秒杀 -->
    <view class="flash">
      <view class="row-between">
        <text style="font-weight:700;font-size:14px;">⏰ 限时秒杀</text>
        <text style="font-size:11px;">距结束 <b>{{ countdown }}</b></text>
      </view>
      <view class="flash-item" @click="goDetail(1)">
        <view class="flash-img">💾</view>
        <view style="flex:1">
          <view style="font-size:12px;font-weight:600;">高速金属U盘 128G</view>
          <view class="flash-old">¥69.9</view>
          <view class="flash-now">¥39.9 · 限100件</view>
        </view>
        <button class="btn-primary flash-btn" @click.stop="goDetail(1)">马上抢</button>
      </view>
    </view>

    <!-- 分类 -->
    <scroll-view scroll-x class="cats">
      <view v-for="c in categories" :key="c" class="cat" :class="{ on: c === activeCat }" @click="switchCat(c)">{{ c }}</view>
    </scroll-view>

    <!-- 商品瀑布流 -->
    <view class="grid">
      <view v-for="p in products" :key="p.id" class="gcard" @click="goDetail(p.id)">
        <view class="gimg">{{ p.emoji }}</view>
        <view class="gbody">
          <view class="gname">{{ p.name }}</view>
          <view class="gspec">{{ p.sub }}</view>
          <view class="row-between" style="margin-top:6px;">
            <view>
              <view class="price" style="font-size:15px;">¥{{ p.price }}</view>
              <view style="font-size:9px;color:#6b7280;">¥{{ p.original_price }} · 已售{{ p.sales }}</view>
            </view>
            <button class="addbtn" @click.stop="cart.add({ id: p.id, name: p.name, emoji: p.emoji, cap: p.caps[1] ? p.caps[1].label : p.caps[0].label, price: p.caps[1] ? p.caps[1].price : p.caps[0].price, qty: 1 })">+</button>
          </view>
        </view>
      </view>
    </view>
    <view style="height:12px"></view>
  </view>
</template>

<style scoped>
.hero { background: linear-gradient(135deg, #1e3a8a, #2563eb 60%, #3b82f6); color: #fff; padding: 16px; border-radius: 0 0 24px 24px; }
.hero-title { font-size: 20px; font-weight: 800; }
.hero-sub { font-size: 11px; opacity: .85; margin-top: 5px; }
.hero-tags { display: flex; gap: 6px; margin-top: 10px; }
.hero-tags text { font-size: 10px; background: rgba(255,255,255,.18); padding: 3px 9px; border-radius: 99px; }
.flash { margin: 10px 12px 0; background: linear-gradient(135deg, #7c2d12, #ea580c); border-radius: 14px; padding: 12px; color: #fff; }
.flash-item { display: flex; gap: 10px; margin-top: 10px; background: rgba(255,255,255,.12); border-radius: 10px; padding: 8px; }
.flash-img { width: 60px; height: 60px; border-radius: 8px; background: rgba(255,255,255,.9); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.flash-old { font-size: 10px; opacity: .8; text-decoration: line-through; }
.flash-now { color: #fde047; font-weight: 800; font-size: 14px; }
.flash-btn { align-self: center; font-size: 11px; padding: 0 14px; height: 30px; line-height: 30px; }
.cats { white-space: nowrap; padding: 10px 12px 4px; }
.cat { display: inline-block; font-size: 11px; padding: 6px 12px; border-radius: 99px; background: #fff; color: #6b7280; border: 1px solid #e5e7eb; margin-right: 8px; }
.cat.on { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 6px 12px 0; }
.gcard { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,.05); }
.gimg { height: 96px; background: linear-gradient(160deg, #eef2ff, #e0e7ff); display: flex; align-items: center; justify-content: center; font-size: 40px; }
.gbody { padding: 8px 10px; }
.gname { font-size: 12px; height: 32px; overflow: hidden; line-height: 1.35; }
.gspec { font-size: 10px; color: #6b7280; margin-top: 2px; }
.addbtn { width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: #fff; font-size: 15px; line-height: 24px; padding: 0; }
</style>
