/**
 * Mock 数据层：模拟后端接口，与《技术文档》接口定义一一对应。
 * 后端就绪后设置 VUE_APP_USE_MOCK=false 即可切换真实接口。
 */

const PRODUCTS = [
  { id: 1, emoji: '💾', name: '高速金属U盘 USB3.2', sub: '128G · 读速150MB/s', price: '39.9', original_price: '69.9', sales: '2.3万', stock: 87, category: '高速办公', caps: [{ label: '64G', price: '29.9', original: '49.9' }, { label: '128G', price: '39.9', original: '69.9' }, { label: '256G', price: '69', original: '99' }] },
  { id: 2, emoji: '🖥', name: '双接口U盘 Type-C', sub: '256G · 手机电脑两用', price: '79', original_price: '129', sales: '1.1万', stock: 56, category: '高速办公', caps: [{ label: '128G', price: '59', original: '89' }, { label: '256G', price: '79', original: '129' }] },
  { id: 3, emoji: '⚡', name: '固态U盘 极速1050MB/s', sub: '1TB · 大文件秒传', price: '399', original_price: '599', sales: '3200', stock: 23, category: '高速办公', caps: [{ label: '512G', price: '259', original: '399' }, { label: '1TB', price: '399', original: '599' }] },
  { id: 4, emoji: '📱', name: '苹果专用U盘 MFi认证', sub: '128G · Lightning接口', price: '99', original_price: '159', sales: '6700', stock: 41, category: '手机U盘', caps: [{ label: '64G', price: '69', original: '109' }, { label: '128G', price: '99', original: '159' }] },
  { id: 5, emoji: '🎁', name: '创意卡通U盘 礼盒装', sub: '64G · 8款造型可选', price: '29.9', original_price: '49.9', sales: '8600', stock: 200, category: '创意礼品', caps: [{ label: '32G', price: '19.9', original: '35' }, { label: '64G', price: '29.9', original: '49.9' }] },
  { id: 6, emoji: '🏢', name: '企业定制U盘 批量价', sub: 'LOGO雕刻 · 100个起订', price: '19.9', original_price: '35', sales: '560单', stock: 999, category: '企业定制', caps: [{ label: '64G', price: '19.9', original: '35' }, { label: '128G', price: '29.9', original: '49' }] }
]
const CATEGORIES = ['高速办公', '手机U盘', '创意礼品', '企业定制']

let mockOrders = uni.getStorageSync('mock_orders') || []

function genOrderNo() {
  return 'NO' + Date.now().toString().slice(-10)
}

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms))

export async function mockRequest({ url, method = 'GET', data = {} }) {
  await delay()
  const u = url.replace(/^\/api/, '')

  // ---- 商品 ----
  if (u === '/products/' && method === 'GET') {
    let list = PRODUCTS
    if (data.category) list = PRODUCTS.filter(p => p.category === data.category)
    return { results: list, total: list.length }
  }
  const m = u.match(/^\/products\/(\d+)\/$/)
  if (m && method === 'GET') {
    return PRODUCTS.find(p => p.id === Number(m[1]))
  }
  if (u === '/categories/' && method === 'GET') return CATEGORIES

  // ---- 订单预览 ----
  if (u === '/orders/preview/' && method === 'POST') {
    const goods = data.items.reduce((a, i) => a + Number(i.price) * i.qty, 0)
    const disc = Math.min(Number(data.coupon_amount || 0), goods)
    return {
      goods_amount: goods.toFixed(2),
      discount_amount: disc.toFixed(2),
      freight: '0.00',
      pay_amount: (goods - disc).toFixed(2)
    }
  }

  // ---- 创建订单 ----
  if (u === '/orders/' && method === 'POST') {
    const items = data.items
    const goods = items.reduce((a, i) => a + Number(i.price) * i.qty, 0)
    const disc = Math.min(Number(data.coupon_amount || 0), goods)
    const order = {
      order_no: genOrderNo(),
      items,
      goods_amount: goods.toFixed(2),
      discount_amount: disc.toFixed(2),
      pay_amount: (goods - disc).toFixed(2),
      status: 0, // 待支付
      expire_at: Date.now() + 30 * 60 * 1000,
      created_at: new Date().toISOString(),
      address: data.address || { name: '张三', phone: '138****6688', detail: '江苏省苏州市工业园区星湖街328号' },
      remark: data.remark || ''
    }
    mockOrders.unshift(order)
    uni.setStorageSync('mock_orders', mockOrders)
    return order
  }

  // ---- 订单列表 ----
  if (u === '/orders/' && method === 'GET') {
    let list = mockOrders
    if (data.status !== undefined && data.status !== '') list = list.filter(o => o.status === Number(data.status))
    return { results: list }
  }

  // ---- 收银台配置 ----
  const pm = u.match(/^\/payment\/config\/(\w+)\/$/)
  if (pm && method === 'GET') {
    const order = mockOrders.find(o => o.order_no === pm[1])
    return {
      order_no: order.order_no,
      pay_amount: order.pay_amount,
      expire_at: order.expire_at,
      tip: `请扫码支付 ¥${order.pay_amount}，备注订单号后4位：${order.order_no.slice(-4)}`,
      channels: [
        { type: 1, name: '微信收款码', qrcode: '' },
        { type: 2, name: '支付宝收款码', qrcode: '' }
      ]
    }
  }

  // ---- 上传付款凭证 ----
  const prf = u.match(/^\/orders\/(\w+)\/proof\/$/)
  if (prf && method === 'POST') {
    const order = mockOrders.find(o => o.order_no === prf[1])
    order.status = 1
    order.proof = data.image
    uni.setStorageSync('mock_orders', mockOrders)
    return { status: 1 }
  }

  // ---- 确认收货 ----
  const cf = u.match(/^\/orders\/(\w+)\/confirm_receive\/$/)
  if (cf && method === 'POST') {
    const order = mockOrders.find(o => o.order_no === cf[1])
    order.status = 3
    uni.setStorageSync('mock_orders', mockOrders)
    return { status: 3 }
  }

  // ---- 登录 ----
  if (u === '/auth/login/' && method === 'POST') {
    return { token: 'mock-token-' + Date.now(), user: { phone: data.phone, nickname: '微信用户' } }
  }

  // ---- 优惠券 ----
  if (u === '/coupons/mine/' && method === 'GET') {
    return { results: [
      { id: 1, title: '新客10元券', amount: '10', threshold: '0', status: 0 },
      { id: 2, title: '满29减5券', amount: '5', threshold: '29', status: 0 }
    ] }
  }

  throw new Error('Mock 未实现: ' + method + ' ' + u)
}
