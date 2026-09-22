# U盘微站 开发与部署技术文档

> 版本：v1.0  
> 日期：2026-09-22  
> 项目形态：H5 移动微商城（售卖 U 盘）  
> 支付模式：微信 / 支付宝**个人收款码** + 用户上传付款凭证 + 商家后台人工核销

---

## 目录

- [一、项目概述](#一项目概述)
- [二、总体架构](#二总体架构)
- [三、技术栈选型](#三技术栈选型)
- [四、核心业务设计](#四核心业务设计)
- [五、数据库设计](#五数据库设计)
- [六、API 接口设计](#六api-接口设计)
- [七、前端设计（uni-app H5）](#七前端设计uni-app-h5)
- [八、后端实现要点（Django）](#八后端实现要点django)
- [九、管理后台（Django Admin）](#九管理后台django-admin)
- [十、部署方案](#十部署方案)
- [十一、运维手册](#十一运维手册)
- [十二、安全清单](#十二安全清单)
- [十三、性能评估与扩容信号](#十三性能评估与扩容信号)
- [十四、开发排期](#十四开发排期)
- [十五、风险与应对](#十五风险与应对)

---

## 一、项目概述

### 1.1 项目背景

面向移动端用户的 U 盘售卖微站，主打：高速办公 U 盘、手机 U 盘、创意礼品 U 盘、企业定制 U 盘。通过 H5 页面在微信内传播（好友/朋友圈分享），实现「浏览 → 下单 → 扫码付款 → 商家核销 → 发货」的完整闭环。

### 1.2 核心特点

| 特点 | 说明 |
|---|---|
| 纯 H5 | 不做小程序/App，uni-app 编译 H5，浏览器/微信内打开 |
| 个人收款码支付 | 无商户资质，微信/支付宝个人码收款，人工核销 |
| 轻量单体架构 | Django 单体 + MySQL + Redis，无微服务 |
| 低成本 | 月运营成本控制在 ¥100 以内 |
| 可演进 | 订单状态机预留商户支付升级空间，后期可无缝切换微信支付 V3 |

### 1.3 用户角色

| 角色 | 描述 |
|---|---|
| 游客 | 浏览商品，下单前引导登录 |
| 注册用户 | 手机号+验证码登录，下单、查订单、上传付款凭证 |
| 商家（运营） | Django Admin：管理商品/库存/收款码、核销订单、发货、配置优惠券与秒杀 |
| 客服 | Admin 只读权限（可选） |

---

## 二、总体架构

```
                        ┌─────────────────────────────────────┐
   用户浏览器/微信内 ──►  │  Vercel：H5 静态前端 + CDN + HTTPS   │
                        └──────────────┬──────────────────────┘
                                       │ HTTPS  /api/**
                                       ▼
                        ┌─────────────────────────────────────┐
                        │  腾讯云轻量服务器 2C4G（Ubuntu 22.04）│
                        │                                     │
                        │   Nginx ──► Gunicorn (3 workers)    │
                        │                │                    │
                        │             Django + DRF            │
                        │            /  |    \                │
                        │        MySQL8  Redis  Celery(可选)  │
                        │                                     │
                        │   Django Admin（商家手机浏览器访问）   │
                        └──────────────┬──────────────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              ▼                        ▼                        ▼
      腾讯云 COS（商品图、      短信服务（登录验证码、      微信/支付宝
      付款凭证等媒体文件）       发货通知，按量计费）        个人收款码
```

**请求链路**：

1. 用户打开 H5（Vercel CDN 静态资源）
2. 业务请求 `https://api.yourdomain.com/api/...` → 轻量服务器 Nginx → Gunicorn → Django
3. 下单后进入「收银台页」，展示后台配置的收款二维码
4. 用户扫码付款 → 上传付款凭证 → 订单变为「待确认」
5. 商家在手机浏览器打开 Admin，核对收款记录后点「确认收款」→ 订单「待发货」→ 发货 → 「已完成」

---

## 三、技术栈选型

### 3.1 前端

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | uni-app（Vue3 + `<script setup>`） | 一套代码，当前只编译 H5，后续可低成本扩展小程序 |
| 状态管理 | Pinia + pinia-plugin-persistedstate | 购物车本地持久化 |
| UI 库 | uView Plus（Vue3 兼容） | 电商组件丰富 |
| 请求封装 | 自封装 request.js | baseURL 环境变量注入、token 注入、401 处理、统一错误 toast |
| 构建产物 | 纯静态文件（`dist/build/h5/`） | 可托管至 Vercel / 任意静态服务器 |
| 微信分享 | JSSDK（需后端签名接口） | 朋友圈/好友分享带参数海报 |

### 3.2 后端

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | Django 4.2 LTS + DRF | 长期支持版 |
| API 风格 | DRF Router + ViewSet | 商品/订单等 CRUD 高效复用 |
| ORM | Django ORM + mysqlclient | 事务、select_related 查询优化 |
| 缓存 | django-redis | 商品列表缓存、接口限流计数 |
| 异步任务 | Celery + Redis broker（可选） | 关单回滚；前期可用 cron 管理命令替代 |
| 定时任务 | Celery Beat 或系统 cron | 超时订单扫描关闭 |
| 鉴权 | DRF Token（simplejwt） | 手机号+短信验证码登录后签发 |
| 短信 | 腾讯云/阿里云短信 | 登录验证码、发货通知 |
| 对象存储 | 腾讯云 COS + django-storages | 商品图、付款凭证、收款码图片 |
| API 文档 | drf-spectacular | 自动生成 OpenAPI/Swagger，联调用 |
| 管理后台 | Django Admin + simpleui | 手机端适配好，核销订单主阵地 |

### 3.3 明确不引入的技术（避免过度设计）

- 微服务 / K8s
- RabbitMQ / Kafka（Celery 用 Redis 当 broker 足够）
- Elasticsearch（商品量少，MySQL LIKE + 分类筛选够用）
- 微信支付 V3 / 小程序（个人码模式下不需要）

---

## 四、核心业务设计

### 4.1 订单状态机（个人收款码模式核心）

```
              提交订单
                 │
                 ▼
         ┌─── 待支付(0) ◄───────────────────────────┐
         │      │ 30分钟未上传凭证                    │
         │      ▼                                   │
         │  已关闭(4)                                 │
         │                                            │
         │ 上传付款凭证                                │
         ▼                                            │
     待确认(1) ──商家驳回/凭证无效──► 已关闭(4)         │
         │                                            │
         │ 商家在 Admin 核对收款后「确认收款」           │
         ▼                                            │
     待发货(2)                                        │
         │                                            │
         │ Admin 点击「发货」（可填快递单号）            │
         ▼                                            │
     已发货(5) ──用户确认收货/超时7天自动确认──►      │
                                                    │
     已完成(3) ──────────────────────────────────────┘
```

**状态说明**：

| 状态码 | 含义 | 触发方 |
|---|---|---|
| 0 | 待支付 | 用户提交订单 |
| 1 | 待确认（已上传凭证） | 用户上传付款截图 |
| 2 | 待发货 | 商家核销 |
| 3 | 已完成 | 用户确认收货或超时自动 |
| 4 | 已关闭 | 超时关单 / 商家驳回 |
| 5 | 已发货 | 商家填单号发货 |

**关键规则**：

- 待支付订单 30 分钟有效，超时由 cron/Celery 自动关闭
- 支付确认唯一来源 =「用户上传凭证 + 商家人工核销」，无自动回调
- 收款金额必须**精确到分**展示（如 ¥29.90），提示用户付款时备注订单号后 4 位
- 同一图片（按文件 hash）只能关联一个订单，防止一张截图重复用

### 4.2 支付（收银台）流程

```
用户在结算页提交订单
        │
        ▼
┌─ 收银台页 ────────────────────────────────┐
│  应付金额：¥29.90（大字）                   │
│  订单号：NO20260922001                     │
│                                          │
│  [ 微信收款码 ] [ 支付宝收款码 ]  ← Tab切换 │
│  ┌────────────┐                          │
│  │  （二维码图） │  ← 后台 PaymentConfig 配置 │
│  └────────────┘                          │
│                                          │
│  ① 请扫码支付，备注订单号后4位：0001         │
│  ② 上传付款截图  [选择图片]                 │
│  [ 我已完成支付 ]                           │
└──────────────────────────────────────────┘
        │
        ▼
  订单状态 0 → 1，跳转「待确认」提示页
        │
        ▼
  商家 Admin 手机收到提醒（可选短信/手动查看）
  核对微信/支付宝收款记录 → 点「确认收款」→ 状态 1 → 2
```

**风控要点**：

- 收款码在 Admin 可随时更换（个人码会过期/被风控，务必可配置多张轮换）
- 大额订单（>¥500）引导加客服微信人工对接，不走线上核销
- 商家驳回时必须填写原因，用户可在订单详情看到并可重新上传凭证

### 4.3 优惠与营销

| 功能 | 规则 |
|---|---|
| 新客券 | 注册即发 10 元无门槛券 |
| 满减券 | 后台可配（如满29减5） |
| 秒杀 | 后台配置场次；Redis Lua 原子扣减防超卖；秒杀订单同样走收款码流程 |
| 分享得券 | 邀请好友注册，双方各得 5 元券（预留，V2 再做） |

**金额计算优先级**：秒杀价 > 券抵扣 > 满减。金额一律服务端计算（preview 接口），前端只展示。

### 4.4 库存策略

- 普通下单：MySQL 事务内扣减（`stock = stock - qty WHERE stock >= qty`），乐观锁防超卖
- 秒杀：Redis Lua 预扣 → 核销后异步落 MySQL；超时关单回滚 Redis
- 每日凌晨对账任务：校正 Redis 与 MySQL 库存差异

---

## 五、数据库设计

### 5.1 核心表一览

| 表 | 说明 |
|---|---|
| user | 用户（手机号登录） |
| address | 收货地址 |
| product | 商品 SPU |
| sku | 商品 SKU（容量×颜色） |
| product_image | 商品轮播图 |
| category | 分类 |
| order_info | 订单主表 |
| order_item | 订单明细（快照） |
| payment_proof | 付款凭证 |
| payment_config | 收款码配置（微信/支付宝各多张） |
| coupon | 优惠券模板 |
| user_coupon | 用户券包 |
| seckill_session | 秒杀场次 |

### 5.2 表结构（Django Model 关键字段）

```python
# apps/user/models.py
class User(AbstractUser):
    phone = models.CharField(max_length=11, unique=True)
    username = None          # 用手机号代替用户名
    USERNAME_FIELD = 'phone'
    nickname = models.CharField(max_length=32, blank=True)

# apps/product/models.py
class Category(models.Model):
    name = models.CharField(max_length=32)
    sort = models.IntegerField(default=0)

class Product(models.Model):
    name = models.CharField(max_length=128)
    sub_title = models.CharField(max_length=256, blank=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    main_img = models.URLField()                    # COS 地址
    detail = models.JSONField(default=list)         # 详情图 URL 列表
    service_tags = models.JSONField(default=list)   # ["7天无理由","五年质保"]
    sales = models.IntegerField(default=0)          # 展示销量（可人工调整）
    status = models.SmallIntegerField(default=1)    # 0下架 1上架
    created_at = models.DateTimeField(auto_now_add=True)

class SKU(models.Model):
    product = models.ForeignKey(Product, related_name='skus', on_delete=models.CASCADE)
    spec = models.JSONField()        # {"容量":"128G","颜色":"银色"}
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField(default=0)
    image = models.URLField(blank=True)

# apps/order/models.py
class Order(models.Model):
    class Status(models.IntegerChoices):
        UNPAID = 0, '待支付'
        PENDING_CONFIRM = 1, '待确认'
        UNSHIPPED = 2, '待发货'
        DONE = 3, '已完成'
        CLOSED = 4, '已关闭'
        SHIPPED = 5, '已发货'
    order_no = models.CharField(max_length=32, unique=True, db_index=True)
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    goods_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    freight = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    pay_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coupon = models.ForeignKey('marketing.UserCoupon', null=True, on_delete=models.SET_NULL)
    address = models.JSONField()     # 地址快照
    remark = models.CharField(max_length=500, blank=True)   # 含企业定制刻字内容
    status = models.SmallIntegerField(default=0, db_index=True)
    expire_at = models.DateTimeField()                      # 30分钟支付时限
    reject_reason = models.CharField(max_length=200, blank=True)  # 驳回原因
    ship_no = models.CharField(max_length=64, blank=True)   # 快递单号
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OrderItem(models.Model):
    order = models.ForeignKey(Order, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    sku = models.ForeignKey(SKU, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=128)   # 快照
    spec = models.JSONField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    qty = models.IntegerField()

class PaymentProof(models.Model):
    order = models.OneToOneField(Order, related_name='proof', on_delete=models.CASCADE)
    image = models.URLField()
    image_hash = models.CharField(max_length=64, db_index=True)  # 防一图多用
    uploaded_at = models.DateTimeField(auto_now_add=True)

# apps/marketing/models.py
class PaymentConfig(models.Model):
    """收款码配置：微信/支付宝各可配多张轮换"""
    channel = models.SmallIntegerField(choices=[(1,'微信'),(2,'支付宝')])
    qrcode = models.URLField()       # 收款码图片（存COS）
    is_active = models.BooleanField(default=True)
    note = models.CharField(max_length=100, blank=True)

class Coupon(models.Model):
    title = models.CharField(max_length=64)
    type = models.SmallIntegerField(choices=[(1,'无门槛'),(2,'满减')])
    threshold = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    total = models.IntegerField(default=1000)
    received = models.IntegerField(default=0)

class UserCoupon(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE)
    status = models.SmallIntegerField(default=0)  # 0未用 1已用 2已过期
    order = models.ForeignKey(Order, null=True, on_delete=models.SET_NULL)
    expire_at = models.DateTimeField()

class SeckillSession(models.Model):
    sku = models.ForeignKey(SKU, on_delete=models.CASCADE)
    seckill_price = models.DecimalField(max_digits=10, decimal_places=2)
    stock = models.IntegerField()          # 秒杀库存（Redis 预载）
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    status = models.SmallIntegerField(default=1)
```

### 5.3 索引策略

- `order_info`：`(user, status)`、`(status, expire_at)`（关单扫描）、`order_no` 唯一索引
- `order_item`：`order_id` 外键索引
- `payment_proof`：`image_hash` 索引（防重复使用）
- `sku`：`product_id` 索引

---

## 六、API 接口设计

统一约定：

- Base URL：`https://api.yourdomain.com/api/`
- 认证：`Authorization: Bearer <token>`（手机号+短信验证码登录后签发）
- 统一响应：`{ "code": 0, "msg": "ok", "data": {...} }`，非 0 为业务错误码
- 金额一律服务端计算，前端仅展示

### 6.1 用户模块

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /auth/sms/send | 发送登录验证码（60s 限频，图形验证码防刷） |
| POST | /auth/login | 手机号+验证码登录，返回 token + 用户信息 |
| GET/POST/PUT/DELETE | /address/ | 收货地址 CRUD |
| GET | /auth/profile | 个人中心信息（券数量、订单数） |

### 6.2 商品模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /products/ | 商品列表，`?category=&page=`，Redis 缓存 5 分钟 |
| GET | /products/{id}/ | 详情：SKU 列表、库存、规格 |
| GET | /products/{id}/reviews/ | 评价（V2，可先静态数据） |

### 6.3 订单模块（核心）

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | /orders/preview/ | 结算预览：入参 `[{sku_id, qty}]` + `coupon_id` → 返回逐项金额 |
| POST | /orders/ | 创建订单：事务内锁库存、生成订单号、30 分钟过期时间 |
| GET | /orders/ | 我的订单 `?status=` 分页 |
| GET | /orders/{order_no}/ | 订单详情（含凭证状态、驳回原因） |
| POST | /orders/{order_no}/proof/ | 上传付款凭证：图片→COS，写 image_hash，状态 0→1，幂等（重复上传覆盖） |
| POST | /orders/{order_no}/cancel/ | 用户主动取消（仅待支付状态） |
| POST | /orders/{order_no}/confirm_receive/ | 用户确认收货（已发货状态） |
| GET | /payment/config/ | 获取当前生效的微信/支付宝收款码 |

### 6.4 营销模块

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | /coupons/mine/ | 我的券包 |
| POST | /coupons/receive/ | 领券（新客券注册自动发） |
| GET | /seckill/active/ | 当前秒杀场次（首页倒计时用） |
| POST | /seckill/{id}/order/ | 秒杀下单：Redis Lua 预扣 → 创建订单 |

### 6.5 收银台页数据示例

```json
// GET /payment/config/ + 订单信息
{
  "code": 0,
  "data": {
    "order_no": "NO20260922001",
    "pay_amount": "29.90",
    "expire_at": "2026-09-22T11:00:00",
    "channels": [
      {"type": 1, "name": "微信收款码", "qrcode": "https://cos.../wx_qr_1.png"},
      {"type": 2, "name": "支付宝收款码", "qrcode": "https://cos.../ali_qr_1.png"}
    ],
    "tip": "请扫码支付 ¥29.90，备注订单号后4位：0001"
  }
}
```

---

## 七、前端设计（uni-app H5）

### 7.1 页面结构

```
pages/
├── home/index        首页：秒杀横幅 + 分类横滑 + 商品瀑布流
├── category/index    分类：左侧栏 + 右侧商品列表
├── detail/index      详情：轮播图 + SKU 选择器 + 评价 + 吸底购买栏
├── cart/index        购物车：本地 Pinia 管理，勾选结算
├── checkout/index    结算：地址 + 优惠券 + 金额明细
├── cashier/index     收银台：收款码展示 + 凭证上传 ★本模式核心页
├── order/list        订单列表（按状态 Tab）
├── order/detail      订单详情：状态进度、凭证、驳回原因、确认收货
├── me/index          我的：订单入口、券包、客服、企业定制入口
├── login/index       手机号 + 验证码登录
└── address/list      地址管理
```

### 7.2 核心交互

| 场景 | 实现 |
|---|---|
| 登录态 | token 存 localStorage，request 拦截器注入；401 跳登录页 |
| 购物车 | Pinia + persistedstate，本地持久化，结算时提交服务端 |
| SKU 选择 | 点击容量规格，价格/库存联动；无库存规格置灰 |
| 收银台倒计时 | 30 分钟支付倒计时，归零自动关单并提示 |
| 凭证上传 | 微信内：JSSDK chooseImage → uploadFile；浏览器：`<input type="file">` |
| 微信分享 | 每个商品页调后端 `/wechat/jsapi_sign/` 注入 config，分享卡片带商品图 |

### 7.3 环境配置

```js
// request.js
const BASE_URL = process.env.VUE_APP_API_URL || '/api'
```

| 环境 | VUE_APP_API_URL |
|---|---|
| 开发 | http://localhost:8000/api |
| 生产 | https://api.yourdomain.com/api（建议留空走 Nginx 同源反代，规避 CORS） |

### 7.4 关键页面示意（收银台）

```
┌─────────────────────────────┐
│  收银台                  ✕  │
├─────────────────────────────┤
│                             │
│        ¥ 29.90              │  ← 大字金额
│     订单号 NO...0001        │
│   ⏳ 支付剩余 28:35          │  ← 倒计时
│                             │
│  [ 微信收款码 ] [ 支付宝 ]   │  ← Tab
│  ┌───────────────────┐      │
│  │                   │      │
│  │    （二维码）       │      │  ← 长按识别或截图扫码
│  │                   │      │
│  └───────────────────┘      │
│                             │
│  ① 扫码支付，备注：0001       │
│  ② 上传付款截图              │
│  ┌───────────────┐          │
│  │ 📷 点击上传截图 │          │
│  └───────────────┘          │
│                             │
│  [   我已完成支付   ]         │  ← 上传成功后点亮
└─────────────────────────────┘
```

---

## 八、后端实现要点（Django）

### 8.1 项目结构

```
server/
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── celery.py
├── apps/
│   ├── user/            # 登录、地址
│   ├── product/         # 商品、SKU
│   ├── order/           # 订单、凭证
│   ├── payment/         # 收款码配置
│   ├── marketing/       # 优惠券、秒杀
│   └── common/          # 统一响应、异常、分页
├── libs/
│   ├── sms.py           # 短信发送封装
│   ├── cos.py           # 腾讯云 COS 上传封装
│   ├── wechat_jsapi.py  # JSSDK 签名
│   └── exceptions.py    # 业务异常
├── scripts/
│   ├── close_expired_orders.py   # 关单（cron 调用）
│   └── seckill.lua               # Redis 扣库存 Lua
└── manage.py
```

### 8.2 统一响应与异常

```python
# apps/common/response.py
class APIResponse(Response):
    def __init__(self, data=None, code=0, msg='ok', **kwargs):
        super().__init__({'code': code, 'msg': msg, 'data': data}, **kwargs)

# 全局异常处理：DRF EXCEPTION_HANDLER 统一捕获 BizError → {code, msg}
```

### 8.3 下单核心逻辑（事务 + 行锁）

```python
# apps/order/views.py
@transaction.atomic
def create(self, request):
    items = validate(request.data['items'])          # [{sku_id, qty}]
    coupon = validate_coupon(request.user, request.data.get('coupon_id'))
    with connection.cursor():
        # SELECT ... FOR UPDATE 锁定库存行
        skus = lock_skus([i['sku_id'] for i in items])
        for i in items:
            if skus[i['sku_id']].stock < i['qty']:
                raise BizError('库存不足')
        amount = sum(skus[i['sku_id']].price * i['qty'] for i in items)
        discount = calc_discount(coupon, amount)      # 服务端算券
        order = Order.objects.create(
            order_no=gen_order_no(), user=request.user,
            goods_amount=amount, discount_amount=discount,
            pay_amount=amount - discount + freight,
            address=get_default_address(request.user),
            expire_at=now() + timedelta(minutes=30),
        )
        for i in items:
            sku = skus[i['sku_id']]
            OrderItem.objects.create(order=order, product=sku.product, sku=sku,
                product_name=sku.product.name, spec=sku.spec,
                price=sku.price, qty=i['qty'])
            SKU.objects.filter(id=sku.id, stock__gte=i['qty']).update(stock=F('stock') - i['qty'])
    return APIResponse(OrderSerializer(order).data)
```

### 8.4 秒杀防超卖（Redis Lua）

```lua
-- scripts/seckill.lua
-- KEYS[1]=秒杀库存key  ARGV[1]=购买数量
local stock = tonumber(redis.call('GET', KEYS[1]) or '-1')
if stock < 0 then return -1 end          -- 未加载/已结束
if stock < tonumber(ARGV[1]) then return 0 end  -- 抢完
redis.call('DECRBY', KEYS[1], ARGV[1])
return 1
```

```python
ok = redis.call('EVAL', lua, 1, f'seckill:{session_id}', qty)
if ok == 1:
    order = create_order(...)      # 复用普通下单
    close_task.apply_async(args=[order.id], countdown=1800)
elif ok == 0:
    raise BizError('已抢完')
```

### 8.5 凭证上传（幂等 + 防一图多用）

```python
def upload_proof(self, request, order_no):
    order = get_order_for_update(order_no, request.user)
    if order.status != Order.Status.UNPAID:
        raise BizError('当前状态不可上传凭证')
    img = request.FILES['image']
    h = hashlib.md5(img.read()).hexdigest()
    if PaymentProof.objects.filter(image_hash=h).exclude(order=order).exists():
        raise BizError('该图片已被使用')
    url = cos.upload(img)
    PaymentProof.objects.update_or_create(order=order,
        defaults={'image': url, 'image_hash': h})
    order.status = Order.Status.PENDING_CONFIRM
    order.save(update_fields=['status', 'updated_at'])
    return APIResponse({'order_no': order_no, 'status': 1})
```

### 8.6 关单任务（cron 版，零依赖）

```python
# scripts/close_expired_orders.py
# crontab: */1 * * * * cd /home/deploy/app && venv/bin/python manage.py close_expired_orders
def handle(self, *args, **options):
    expired = Order.objects.filter(status=Order.Status.UNPAID, expire_at__lt=now())
    for o in expired.select_for_update():
        o.status = Order.Status.CLOSED
        o.save()
        for item in o.items.all():   # 回滚库存
            SKU.objects.filter(id=item.sku_id).update(stock=F('stock') + item.qty)
        if o.coupon:                 # 退券
            UserCoupon.objects.filter(id=o.coupon_id).update(status=0)
    # 待确认超24小时未核销自动提醒商家（可接短信）
```

### 8.7 微信 JSSDK 签名接口

```python
# GET /api/wechat/jsapi_sign/?url=当前页面URL
# 服务端缓存 jsapi_ticket（7200s），按微信规则 sha1 签名返回 appId/timestamp/nonceStr/signature
```

---

## 九、管理后台（Django Admin）

使用 `simpleui` 美化，商家**手机浏览器即可操作**。

### 9.1 订单管理（核心）

| 操作 | 说明 |
|---|---|
| 列表筛选 | 按状态/时间/订单号筛选；待确认订单置顶标红 |
| 查看凭证 | 订单详情页内联显示付款截图（大图） |
| 确认收款 | 自定义 Admin Action → 状态 1→2，触发发货短信通知用户 |
| 驳回 | Action → 填原因 → 状态→4 或退回待支付（允许重新传） |
| 发货 | 表单填快递公司+单号 → 状态 2→5，短信通知 |

```python
@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_no', 'user', 'pay_amount', 'status', 'proof_img', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['order_no', 'user__phone']
    actions = ['confirm_paid', 'reject', 'ship']

    @admin.action(description='✅ 确认收款（核对无误后使用）')
    def confirm_paid(self, request, queryset):
        queryset.filter(status=1).update(status=2)
        for o in queryset: send_sms.delay(o.user.phone, '您的订单已确认收款，即将发货')

    @admin.action(description='📦 发货')
    def ship(self, request, queryset):
        # 弹表单填单号，此处简化
        ...
```

### 9.2 其他配置

- **PaymentConfig**：上传微信/支付宝收款码，支持多张、随时切换（应对个人码风控）
- **Product/SKU**：上下架、改价、调库存、调展示销量
- **Coupon**：发券总量、有效期
- **SeckillSession**：配置秒杀场次，一键将库存预载到 Redis
- **用户管理**：封禁恶意用户（刷券/传假凭证）

### 9.3 Admin 安全

- 强密码 + 仅商家本人使用；不暴露注册入口
- 可选：接入 OTP 二次验证（django-otp）
- Admin 路径不用默认 `/admin/`，改为随机路径

---

## 十、部署方案

### 10.1 拓扑总览

```
GitHub 仓库
   ├── apps/web (uni-app) ──push──► Vercel 自动构建部署（静态托管 + CDN + HTTPS）
   └── apps/server (Django) ──push──► 手动/脚本部署到腾讯云轻量 2C4G
```

### 10.2 前端部署 Vercel

**构建配置**

| 配置项 | 值 |
|---|---|
| Framework | Other |
| Build Command | `npm run build:h5` |
| Output Directory | `dist/build/h5` |
| 环境变量 | `VUE_APP_API_URL=https://api.yourdomain.com/api` |

**vercel.json（SPA 路由回退 + 静态资源缓存）**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [{
    "source": "/static/(.*)",
    "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
  }]
}
```

**绑定自定义域名**（国内访问更稳）：`shop.yourdomain.com` CNAME 到 Vercel，微信 JSSDK 安全域名同步配置该域名。

### 10.3 后端部署（腾讯云轻量 2C4G / Ubuntu 22.04）

**（1）初始化**

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3.11-dev \
    nginx mysql-server-8.0 redis-server git

# 部署用户
sudo adduser deploy && sudo usermod -aG sudo deploy

# MySQL
sudo mysql_secure_installation
sudo mysql -u root -p
> CREATE DATABASE usbstore DEFAULT CHARSET utf8mb4 COLLATE utf8mb4_unicode_ci;
> CREATE USER 'usb'@'localhost' IDENTIFIED BY '强密码';
> GRANT ALL ON usbstore.* TO 'usb'@'localhost';
```

**（2）防火墙（轻量控制台 + ufw 一致）**

| 端口 | 策略 |
|---|---|
| 22 | 仅 SSH（密钥登录） |
| 80 / 443 | 开放 |
| 3306 / 6379 | **绝不开放**，仅监听 127.0.0.1 |

**（3）项目部署**

```bash
sudo -u deploy git clone https://github.com/you/usb-store.git /home/deploy/app
cd /home/deploy/app
sudo -u deploy python3.11 -m venv /home/deploy/venv
source /home/deploy/venv/bin/activate
pip install -r requirements.txt
# 配置 .env（不进 git）
vim .env
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py createsuperuser
```

**.env 模板**

```ini
DEBUG=False
SECRET_KEY=随机64位
ALLOWED_HOSTS=api.yourdomain.com
DB_NAME=usbstore
DB_USER=usb
DB_PASSWORD=强密码
REDIS_URL=redis://127.0.0.1:6379/0
COS_SECRET_ID=xxx
COS_SECRET_KEY=xxx
COS_BUCKET=usbstore-1234567890
COS_REGION=ap-shanghai
SMS_SECRET_ID=xxx
SMS_SECRET_KEY=xxx
SMS_SIGN=优盘汇
SMS_TEMPLATE_ID=1234567
WECHAT_APPID=xxx
WECHAT_SECRET=xxx
```

**（4）Gunicorn + systemd**

`/etc/systemd/system/usbstore.service`：

```ini
[Unit]
Description=USB Store Gunicorn
After=network.target mysql.service redis-server.service

[Service]
User=deploy
Group=deploy
WorkingDirectory=/home/deploy/app
EnvironmentFile=/home/deploy/app/.env
ExecStart=/home/deploy/venv/bin/gunicorn config.wsgi:application \
    --workers 3 --threads 2 --bind 127.0.0.1:8000 \
    --access-logfile /var/log/usbstore/access.log \
    --error-logfile /var/log/usbstore/error.log \
    --max-requests 1000 --max-requests-jitter 100
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now usbstore
```

**（5）Celery（可选，订单量大再启用）**

```ini
# /etc/systemd/system/usbstore-celery.service
ExecStart=/home/deploy/venv/bin/celery -A config worker -l info -Q default
# /etc/systemd/system/usbstore-beat.service
ExecStart=/home/deploy/venv/bin/celery -A config beat -l info
```

**（6）Nginx**

`/etc/nginx/sites-available/usbstore`：

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    client_max_body_size 5m;

    location /static/ { alias /home/deploy/app/staticfiles/; expires 30d; }
    location /media/  { alias /home/deploy/app/media/; expires 7d; }

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**（7）HTTPS**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com   # 自动续期已配置
```

Django `prod.py` 同步：`SECURE_SSL_REDIRECT=True`、`SESSION_COOKIE_SECURE=True`、`CSRF_COOKIE_SECURE=True`。

**（8）定时任务（cron）**

```bash
sudo -u deploy crontab -e
# 每分钟关单
*/1 * * * * cd /home/deploy/app && /home/deploy/venv/bin/python manage.py close_expired_orders >> /var/log/usbstore/cron.log 2>&1
# 每天 3 点备份数据库
0 3 * * * /home/deploy/backup/backup.sh
```

### 10.4 成本估算

| 项 | 费用 |
|---|---|
| Vercel（前端） | ¥0 |
| 腾讯云轻量 2C4G | ¥60/月 |
| COS（图片+流量） | ¥10/月内 |
| 短信 | ¥20/月内（按量） |
| 域名 | ¥55/年 |
| **合计** | **约 ¥100/月** |

---

## 十一、运维手册

### 11.1 发布流程（后端）

```bash
# 一键更新脚本 deploy.sh
#!/bin/bash
set -e
cd /home/deploy/app
sudo -u deploy git pull
source /home/deploy/venv/bin/activate
pip install -r requirements.txt -q
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart usbstore
echo "✅ deployed $(git rev-parse --short HEAD)"
```

前端：push 到 main 分支，Vercel 自动构建部署。

### 11.2 日常检查命令

```bash
systemctl status usbstore        # 服务状态
tail -f /var/log/usbstore/error.log
df -h                            # 磁盘
mysql -uusb -p -e "SELECT status, COUNT(*) FROM usbstore.order_info GROUP BY status"   # 订单分布
redis-cli GET seckill:1          # 秒杀剩余库存
```

### 11.3 数据库备份

`backup.sh`：

```bash
#!/bin/bash
DIR=/home/deploy/backup
mysqldump -uusb -p'密码' usbstore | gzip > $DIR/usbstore_$(date +%F).sql.gz
# 同步到 COS（coscmd 或 Python SDK）
python3 /home/deploy/backup/upload_cos.py $DIR/usbstore_$(date +%F).sql.gz
find $DIR -mtime +7 -delete
```

恢复：`gunzip < xxx.sql.gz | mysql -uusb -p usbstore`

### 11.4 日志轮转

`/etc/logrotate.d/usbstore`：

```
/var/log/usbstore/*.log {
    daily
    rotate 14
    compress
    missingok
    notifempty
    copytruncate
}
```

### 11.5 收款码更换（应急）

个人码被风控时：Admin → PaymentConfig → 停用旧码、上传新码（5 分钟内全站生效，无需发版）。

---

## 十二、安全清单

| 项 | 措施 |
|---|---|
| 服务器 | SSH 密钥登录、禁 root 远程、fail2ban 防暴力破解 |
| 数据库/Redis | 仅监听 127.0.0.1，强密码，不对外开放 |
| Django | `DEBUG=False`、SECRET_KEY 独立、ALLOWED_HOSTS 白名单、Admin 改随机路径 |
| 接口 | 短信验证码限频（单号 1 分钟 1 条、1 小时 5 条）、登录图形验证码、DRF throttle 限流、上传文件类型/大小校验 |
| CORS | 白名单制（`CORS_ALLOWED_ORIGINS`），禁止 `ALLOW_ALL` |
| 越权 | 所有订单接口校验 `order.user == request.user`；Admin 单独鉴权 |
| 凭证防刷 | image_hash 唯一关联、上传频率限制 |
| 敏感配置 | 全部进 `.env`，仓库零硬编码；COS/短信密钥支持轮换 |
| HTTPS | 全站强制，证书自动续期 |
| 依赖 | 每月 `pip-audit` 扫描漏洞 |

---

## 十三、性能评估与扩容信号

| 指标 | 2C4G 现状评估 |
|---|---|
| 日常 API QPS | Gunicorn 3 worker 支撑 ~100 QPS，远超日几百单所需 |
| 秒杀峰值 | Redis Lua 预扣 + DRF 限流可扛数千人同时点击（瓶颈在带宽，轻量 6Mbps 约 500 人/秒页面加载） |
| 内存占用 | Django+MySQL+Redis+Nginx 常态 ~1.5G，余量充足 |
| 磁盘 | 系统盘 60G，媒体文件全在 COS，几乎零增长 |

**扩容信号（出现任一即升级 4C8G 或分离数据库）**：

- 日均订单 > 2000 单
- 服务器 CPU 持续 > 70%
- MySQL 慢查询频繁出现
- 商家反馈 Admin 核销高峰期卡顿

**演进路径**：升级 4C8G → MySQL 迁云数据库 → 商户支付替换个人码（只需重写 payment 模块，订单状态机不变）。

---

## 十四、开发排期

| 周 | 前端 | 后端 |
|---|---|---|
| W1 | 登录页、首页、分类、详情页 | 脚手架（settings 分环境/统一响应/异常）、短信登录、商品/SKU 接口、COS 上传 |
| W2 | 购物车、结算页、地址管理 | 下单预览/创建（事务锁库存）、订单列表/详情、Django Admin 商品配置 |
| W3 | **收银台页（收款码+凭证上传）**、订单状态页 | 收款码配置接口、凭证上传（幂等/防重用）、Admin 核销 Action、关单 cron、发货短信 |
| W4 | 优惠券、秒杀页、我的/券包、微信分享 | 优惠券、秒杀 Lua + 预载、JSSDK 签名、压测与联调 |
| W5 | — | 全链路回归、Admin 移动端体验打磨、生产部署、域名/HTTPS/JSSDK 配置、上线 |

---

## 十五、风险与应对

| 风险 | 等级 | 应对 |
|---|---|---|
| 个人收款码被风控/冻结 | 高 | Admin 随时换码；准备 2–3 个码轮换；大额引导客服微信；监控每日收款流水，异常即切换 |
| 用户不信任个人码，转化低 | 中 | 页面强化信任元素（营业执照、客服微信、已售数据、五年质保承诺）；首单小金额降低门槛 |
| 人工核销 workload | 中 | 订单量 <100 单/天可承受；Admin 列表置顶待确认 + 短信提醒商家；超量后升级商户支付 |
| 用户传假凭证 | 中 | 核销时人工核对金额+时间；image_hash 防一图多用；恶意用户 Admin 封禁 |
| 微信内 H5 体验限制（无推送） | 低 | 发货/核销通知走短信；引导用户收藏页面 |
| 服务器单点故障 | 低 | 每日备份 + 镜像快照；故障时按文档在新实例 1 小时内恢复 |

---

## 附录 A：接口错误码约定

| code | 含义 |
|---|---|
| 0 | 成功 |
| 1001 | 参数错误 |
| 1002 | 未登录 / token 失效 |
| 2001 | 库存不足 |
| 2002 | 优惠券无效/已过期 |
| 3001 | 订单状态不允许此操作 |
| 3002 | 凭证图片已被使用 |
| 4001 | 短信验证码错误/过期 |
| 429 | 请求过于频繁（限流） |

## 附录 B：环境清单

| 环境 | 前端 | 后端 | 数据库 |
|---|---|---|---|
| 本地开发 | `npm run dev:h5` localhost:5173 | `runserver` localhost:8000 | 本地 MySQL + Redis（docker-compose） |
| 测试 | Vercel Preview（push 自动建） | 轻量服务器测试分支目录 :8001 | 库 `usbstore_test` |
| 生产 | Vercel 正式域名 | 轻量服务器 + Gunicorn | 库 `usbstore` |
