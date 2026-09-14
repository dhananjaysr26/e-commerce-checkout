
## Coupon Availability and Lifecycle
Earned coupons are user-scoped and remain in `AVAILABLE` state until successfully redeemed. The application exposes available coupons through `GET /me/coupons`, and checkout accepts an optional coupon code. Coupon redemption occurs inside the same database transaction as order creation, so failed checkouts do not consume coupons.
