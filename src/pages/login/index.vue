<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { loginBySms } from '../../api'
import { useUserStore } from '../../store/user'

const user = useUserStore()
const phone = ref('')
const code = ref('')
const sending = ref(false)
const countdown = ref(0)
let backUrl = ''
onLoad((opt) => { backUrl = opt.back || '' })

function sendCode() {
  if (!/^1\d{10}$/.test(phone.value)) return uni.showToast({ title: '请输入正确手机号', icon: 'none' })
  sending.value = true
  countdown.value = 60
  uni.showToast({ title: '验证码已发送（演示：任意6位）', icon: 'none' })
  const t = setInterval(() => { countdown.value--; if (countdown.value <= 0) { clearInterval(t); sending.value = false } }, 1000)
}

async function doLogin() {
  if (!/^1\d{10}$/.test(phone.value)) return uni.showToast({ title: '请输入正确手机号', icon: 'none' })
  if (code.value.length < 4) return uni.showToast({ title: '请输入验证码', icon: 'none' })
  const res = await loginBySms({ phone: phone.value, code: code.value })
  user.setLogin(res.token, res.user)
  uni.showToast({ title: '登录成功', icon: 'none' })
  if (backUrl) uni.redirectTo({ url: backUrl })
  else uni.switchTab({ url: '/pages/me/index' })
}
</script>

<template>
  <view class="wrap">
    <view style="font-size:22px;font-weight:800;text-align:center;margin:40px 0 30px;">优盘汇</view>
    <view class="card">
      <view class="field">
        <text class="label">手机号</text>
        <input v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
      </view>
      <view class="field">
        <text class="label">验证码</text>
        <input v-model="code" type="number" maxlength="6" placeholder="请输入验证码" style="flex:1;" />
        <button class="send" :disabled="sending" @click="sendCode">{{ sending ? countdown + 's' : '获取验证码' }}</button>
      </view>
    </view>
    <button class="btn-primary login-btn" @click="doLogin">登录</button>
    <view class="muted" style="text-align:center;margin-top:14px;">未注册手机号验证后自动创建账号</view>
  </view>
</template>

<style scoped>
.wrap { padding: 0 12px; }
.field { display: flex; align-items: center; padding: 13px 0; border-bottom: 1px solid #f3f4f6; }
.field:last-child { border-bottom: none; }
.label { width: 60px; font-size: 13px; color: #1a2233; }
.send { font-size: 11px; color: #2563eb; background: none; padding: 4px 0 4px 12px; line-height: 1.4; }
.send[disabled] { color: #9ca3af; }
.login-btn { margin: 22px 12px 0; height: 44px; line-height: 44px; font-size: 15px; }
</style>
