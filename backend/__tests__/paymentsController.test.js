jest.mock('../services/paymentsService', () => ({
    createPaymentIntent: jest.fn(),
    handleVerificationWebhook: jest.fn(),
}));

const { processPayment, verifyPaymentWebhook } = require('../controllers/paymentsController');
const paymentsService = require('../services/paymentsService');

const createMockRes = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe('paymentsController', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('creates a payment intent', async () => {
        const req = {
            validatedBody: { amount: 100, quantity: 2, currency: 'USD', eventId: '507f1f77bcf86cd799439011' },
            user: { _id: 'user-1' },
        };
        const res = createMockRes();

        paymentsService.createPaymentIntent.mockResolvedValue({
            paymentId: 'pay_abcdefghijklmnopqrstuvwx',
            status: 'processing',
            amount: 100,
            currency: 'USD',
            quantity: 2,
            method: 'credit_card',
            event: req.validatedBody.eventId,
            provider: 'mock_psp',
            createdAt: new Date().toISOString(),
        });

        await processPayment(req, res);

        expect(paymentsService.createPaymentIntent).toHaveBeenCalledTimes(1);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    paymentId: 'pay_abcdefghijklmnopqrstuvwx',
                }),
            })
        );
    });

    it('handles payment verification webhook', async () => {
        const req = {
            validatedBody: {
                paymentId: 'pay_abcdefghijklmnopqrstuvwx',
                providerPaymentId: 'pp_123',
                status: 'verified',
                provider: 'mock_psp',
                amount: 100,
                currency: 'USD',
            },
            headers: { 'x-payment-signature': 'aa'.repeat(32) },
        };
        const res = createMockRes();

        paymentsService.handleVerificationWebhook.mockResolvedValue({
            paymentId: 'pay_abcdefghijklmnopqrstuvwx',
            status: 'verified',
            providerPaymentId: 'pp_123',
            verifiedAt: new Date().toISOString(),
        });

        await verifyPaymentWebhook(req, res);

        expect(paymentsService.handleVerificationWebhook).toHaveBeenCalledTimes(1);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
});
