# 优盘汇 · U盘微站前端（uni-app H5）

uni-app（Vue3）开发的 U 盘售卖 H5 微站，支持个人收款码支付流程。

## 运行

```bash
npm install

# 开发（Mock 模式，无需后端）
npm run dev:h5

# 构建生产包（Mock 模式）
npm run build:h5
# 产物：dist/build/h5/ → 部署到 Vercel
```

## 切换真实后端

```bash
# .env 或命令行注入
VUE_APP_USE_MOCK=false VUE_APP_API_URL=https://api.yourdomain.com/api npm run build:h5
```

## 页面结构

| 页面 | 路径 | 说明 |
|---|---|---|
| 首页 | pages/home | 秒杀横幅 + 分类 + 商品瀑布流 |
| 分类 | pages/category | 左侧栏分类切换 |
| 详情 | pages/detail | SKU 选择、加购、立即购买 |
| 购物车 | pages/cart | Pinia 持久化，本地管理 |
| 结算 | pages/checkout | 优惠券、金额预览、提交订单 |
| **收银台** | pages/cashier | **收款码展示 + 凭证上传（核心页）** |
| 订单列表 | pages/order/list | 按状态筛选，去支付/确认收货 |
| 订单详情 | pages/order/detail | 状态、地址、凭证、金额明细 |
| 登录 | pages/login | 手机号 + 验证码 |
| 我的 | pages/me | 订单入口、客服、企业定制 |

## 目录

```
src/
├── api/index.js        # 接口定义（与后端文档一一对应）
├── utils/request.js    # 请求封装（token 注入、统一错误处理）
├── utils/mock.js       # Mock 数据（USE_MOCK=true 时生效）
├── store/              # Pinia：user / cart（购物车持久化）
└── pages/              # 10 个页面
```

## 对接后端注意

1. 收银台收款码：后端 `GET /api/payment/config/{order_no}/` 返回的 `qrcode` 填真实收款码图片 URL（COS 地址）
2. 凭证上传：生产环境先 `uni.uploadFile` 到 `/api/upload/proof/` 拿 URL，再调 `uploadProof`
3. 微信分享：需要后端 `/api/wechat/jsapi_sign/` 接口（JSSDK 签名）
