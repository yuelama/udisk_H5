<script setup>
/**
 * 收银台：个人收款码支付核心页
 * 1. 展示应付金额 + 微信/支付宝收款码 Tab
 * 2. 用户上传付款截图 → 订单变为「待确认」
 * 3. 30 分钟倒计时，超时提示订单已关闭
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchCashier, uploadProof } from '../../api'
import { USE_MOCK } from '../../utils/config'

const orderNo = ref('')
const info = ref(null)
const channel = ref(1)
const proofImage = ref('')
const left = ref(0)
let timer = null

onLoad((opt) => { orderNo.value = opt.order_no; load() })
onUnmounted(() => clearInterval(timer))

async function load() {
  info.value = await fetchCashier(orderNo.value)
  left.value = Math.max(0, Math.floor((info.value.expire_at - Date.now()) / 1000))
  timer = setInterval(() => {
    left.value--
    if (left.value <= 0) clearInterval(timer)
  }, 1000)
}

const countdown = computed(() => {
  const f = (x) => String(x).padStart(2, '0')
  return `${f(Math.floor(left.value / 3600))}:${f(Math.floor(left.value % 3600 / 60))}:${f(left.value % 60)}`
})

const expired = computed(() => left.value <= 0)

function switchChannel(t) { channel.value = t }

function chooseImage() {
  uni.chooseImage({
    count: 1,
    success: (res) => { proofImage.value = res.tempFilePaths[0] }
  })
}

async function done() {
  if (!proofImage.value) return uni.showToast({ title: '请先上传付款截图', icon: 'none' })
  uni.showLoading({ title: '提交中' })
  try {
    // 真实环境：先 uni.uploadFile 传到 COS/后端拿 URL，再调 uploadProof
    let url = proofImage.value
    if (!USE_MOCK) {
      url = await new Promise((resolve, reject) => {
        uni.uploadFile({
          url: (process.env.VUE_APP_API_URL || '') + '/api/upload/proof/',
          filePath: proofImage.value,
          name: 'image',
          success: (r) => resolve(JSON.parse(r.data).data.url),
          fail: reject
        })
      })
    }
    await uploadProof(orderNo.value, url)
    uni.showToast({ title: '已提交，等待商家确认', icon: 'none' })
    setTimeout(() => uni.redirectTo({ url: '/pages/order/list?status=1' }), 1200)
  } finally {
    uni.hideLoading()
  }
}
</script>

<template>
  <view v-if="info" class="wrap">
    <view class="amount-box">
      <view class="amount">¥ {{ info.pay_amount }}</view>
      <view class="muted">订单号 {{ info.order_no }}</view>
      <view v-if="!expired" class="countdown">⏳ 支付剩余 {{ countdown }}</view>
      <view v-else class="countdown" style="color:#dc2626;">订单已超时关闭</view>
    </view>

    <!-- 收款码 Tab -->
    <view class="qr-box">
      <view class="tabs">
        <view class="tab" :class="{ on: channel === 1 }" @click="switchChannel(1)">微信收款码</view>
        <view class="tab" :class="{ on: channel === 2 }" @click="switchChannel(2)">支付宝收款码</view>
      </view>
      <view class="qr-area">
        <!-- 生产环境：替换为 PaymentConfig 中上传的真实收款码图片 -->
        <view v-if="!info.channels.find(c => c.type === channel).qrcode" class="qr-placeholder">
          <view style="font-size:40px;">{{ channel === 1 ? '💚' : '🧡' }}</view>
          <view style="font-size:12px;color:#6b7280;margin-top:8px;">
            {{ channel === 1 ? '微信' : '支付宝' }}收款码<br>（后台 PaymentConfig 配置后显示）
          </view>
        </view>
        <image v-else :src="info.channels.find(c => c.type === channel).qrcode" mode="widthFix" style="width:200px;" />
      </view>
      <view class="tip">{{ info.tip }}</view>
      <view class="tip-sub">① 长按识别二维码或截图到对应 App 扫码付款<br>② 付款后回到本页上传截图</view>
    </view>

    <!-- 上传凭证 -->
    <view class="card">
      <view style="font-size:13px;font-weight:700;margin-bottom:10px;">📷 上传付款截图</view>
      <view class="upload" @click="chooseImage">
        <image v-if="proofImage" :src="proofImage" mode="aspectFill" style="width:100%;height:100%;border-radius:10px;" />
        <view v-else style="text-align:center;color:#9ca3af;">
          <view style="font-size:26px;">＋</view>
          <view style="font-size:11px;">点击上传截图</view>
        </view>
      </view>
    </view>

    <button class="btn-primary submit" :disabled="expired" @click="done">我已完成支付</button>
    <view style="height:20px"></view>
  </view>
</template>

<style scoped>
.wrap { padding: 14px 12px; }
.amount-box { text-align: center; padding: 26px 0 18px; }
.amount { font-size: 38px; font-weight: 800; color: #1a2233; }
.countdown { font-size: 12px; color: #f59e0b; margin-top: 8px; font-weight: 600; }
.qr-box { background: #fff; border-radius: 14px; padding: 14px; }
.tabs { display: flex; background: #f3f4f6; border-radius: 99px; padding: 3px; }
.tab { flex: 1; text-align: center; font-size: 12px; padding: 7px 0; border-radius: 99px; color: #6b7280; }
.tab.on { background: #fff; color: #2563eb; font-weight: 700; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.qr-area { display: flex; justify-content: center; padding: 18px 0; }
.qr-placeholder { width: 200px; height: 200px; border: 2px dashed #e5e7eb; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tip { text-align: center; font-size: 13px; font-weight: 700; color: #1a2233; }
.tip-sub { text-align: center; font-size: 11px; color: #6b7280; line-height: 1.8; margin-top: 6px; }
.upload { width: 130px; height: 130px; border: 2px dashed #e5e7eb; border-radius: 10px; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.submit { margin: 18px 12px 0; height: 44px; line-height: 44px; font-size: 15px; }
.submit[disabled] { opacity: .5; }
</style>
