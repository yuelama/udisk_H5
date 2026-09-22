<script setup>
import { ref, onMounted } from 'vue'
import { fetchProducts, fetchCategories } from '../../api'

const cats = ref([])
const active = ref('')
const list = ref([])

onMounted(async () => {
  cats.value = await fetchCategories()
  active.value = cats.value[0]
  load()
})
function load() {
  fetchProducts({ category: active.value }).then(res => list.value = res.results)
}
function switchCat(c) { active.value = c; load() }
function goDetail(id) { uni.navigateTo({ url: `/pages/detail/index?id=${id}` }) }
</script>

<template>
  <view style="display:flex;min-height:100vh;">
    <scroll-view scroll-y style="width:88px;flex-shrink:0;height:100vh;">
      <view v-for="c in cats" :key="c" class="side-item" :class="{ on: c === active }" @click="switchCat(c)">{{ c }}</view>
    </scroll-view>
    <scroll-view scroll-y style="flex:1;height:100vh;">
      <view style="padding:12px;">
        <view v-for="p in list" :key="p.id" class="item" @click="goDetail(p.id)">
          <view class="item-img">{{ p.emoji }}</view>
          <view style="flex:1">
            <view style="font-size:13px;font-weight:600;">{{ p.name }}</view>
            <view style="font-size:11px;color:#6b7280;margin-top:3px;">{{ p.sub }}</view>
            <view class="price" style="margin-top:5px;">¥{{ p.price }} <text style="font-size:10px;color:#6b7280;font-weight:400;text-decoration:line-through;">¥{{ p.original_price }}</text></view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.side-item { padding: 15px 8px; font-size: 12px; text-align: center; color: #6b7280; border-left: 3px solid transparent; }
.side-item.on { background: #fff; color: #2563eb; font-weight: 700; border-left-color: #2563eb; }
.item { display: flex; gap: 10px; background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 10px; }
.item-img { width: 70px; height: 70px; border-radius: 10px; background: linear-gradient(160deg, #eef2ff, #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 30px; flex-shrink: 0; }
</style>
