const adminService = require('../../src/services/admin.service');
const models = require('../../src/models');
const crypto = require('crypto');

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('12345678-abcd-abcd-abcd-1234567890ab');
    vi.spyOn(models.Order, 'count');
    vi.spyOn(models.Order, 'findAll');
    vi.spyOn(models.OrderItem, 'findAll');
    vi.spyOn(models.Coupon, 'max');
    vi.spyOn(models.Coupon, 'create');
    vi.spyOn(models.Coupon, 'count');
  });

  describe('generateCoupon', () => {
    it('should return not generated if no eligible milestone yet', async () => {
      models.Order.count.mockResolvedValue(4); // milestoneInterval is 5, maxEligible = 0
      const result = await adminService.generateCoupon(5, 'fixed', 100);
      expect(result).toEqual({ generated: false, message: 'No eligible milestone yet' });
    });

    it('should return not generated if milestone already generated', async () => {
      models.Order.count.mockResolvedValue(10); // maxEligible = 10
      models.Coupon.max.mockResolvedValue(10); // currentMax = 10
      // nextMilestone = 10 + 5 = 15. 15 > 10, so not eligible.
      const result = await adminService.generateCoupon(5, 'fixed', 100);
      expect(result).toEqual({ generated: false, message: 'All eligible milestones already have generated coupons' });
    });

    it('should generate coupon if eligible', async () => {
      models.Order.count.mockResolvedValue(10); // maxEligible = 10
      models.Coupon.max.mockResolvedValue(5); // currentMax = 5
      // nextMilestone = 5 + 5 = 10. 10 <= 10, so eligible.
      
      const mockCoupon = { id: 1, code: 'MILESTONE-10-12345678' };
      models.Coupon.create.mockResolvedValue(mockCoupon);

      const result = await adminService.generateCoupon(5, 'fixed', 100);
      
      expect(models.Coupon.create).toHaveBeenCalledWith({
        code: 'MILESTONE-10-12345678',
        discountType: 'fixed',
        discountValue: 100,
        milestone: 10,
        status: 'available',
        isActive: true,
        maxUses: 1,
        currentUses: 0
      });
      expect(result).toEqual({ generated: true, coupon: mockCoupon });
    });
  });

  describe('getReport', () => {
    it('should generate correctly structured report', async () => {
      models.Order.count.mockResolvedValue(10);
      
      models.Order.findAll.mockResolvedValue([
        { totalGross: 10000, totalDiscount: 1000, totalNet: 9000 }
      ]);

      models.OrderItem.findAll.mockResolvedValue([
        { productId: 'p1', totalQuantity: 5 },
        { productId: 'p2', totalQuantity: 3 }
      ]);

      models.Coupon.count
        .mockResolvedValueOnce(3) // generated
        .mockResolvedValueOnce(2) // available
        .mockResolvedValueOnce(1); // redeemed

      const result = await adminService.getReport();

      expect(result).toEqual({
        totalOrders: 10,
        grossRevenue: 10000,
        totalDiscounts: 1000,
        netRevenue: 9000,
        productQuantities: [
          { productId: 'p1', quantity: 5 },
          { productId: 'p2', quantity: 3 }
        ],
        coupons: {
          generated: 3,
          available: 2,
          redeemed: 1
        }
      });
    });
  });
});
