import { get, post } from '../utils/request'

// 商品
export const fetchProducts = (params) => get('/api/products/', params)
export const fetchProduct = (id) => get(`/api/products/${id}/`)
export const fetchCategories = () => get('/api/categories/')

// 订单
export const previewOrder = (data) => post('/api/orders/preview/', data)
export const createOrder = (data) => post('/api/orders/', data)
export const fetchOrders = (params) => get('/api/orders/', params)
export const fetchCashier = (orderNo) => get(`/api/payment/config/${orderNo}/`)
export const uploadProof = (orderNo, image) => post(`/api/orders/${orderNo}/proof/`, { image })
export const confirmReceive = (orderNo) => post(`/api/orders/${orderNo}/confirm_receive/`)

// 用户
export const loginBySms = (data) => post('/api/auth/login/', data)
export const fetchCoupons = () => get('/api/coupons/mine/')
